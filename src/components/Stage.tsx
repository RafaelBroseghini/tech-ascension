import { EditorSettings } from "./EditorSettings.tsx"
import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react"
import { GOLD_MULT_THRESHOLD } from "../data/boosts.ts"
import { CLICK_ICONS, iconPool, pickClickIcon } from "../data/clickIcons.ts"
import type { IconName } from "../data/clickIcons.ts"
import { ERA_ACCENT } from "../data/eraAccent.ts"
import { stageEmojiSource, STAGE_START_EMOJI } from "../data/emojiAssets.ts"
import { hoverStepMs } from "../game/autoClick.ts"
import type { ClickSource } from "../game/build.ts"
import { hoverRate } from "../game/gold.ts"
import { HOVER_MODES, getDeskPrefs, pokeDesk, subscribeDeskPrefs } from "../game/desk.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { eraOf, stageOf } from "../game/phase.ts"
import type { Era } from "../data/capital.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"
import { capDrops, FALL_MS, fallDistance, fountainLift, LOOT_RISE_SCALE, toss, waterfallCount } from "../game/waterfall.ts"
import type { Drop } from "../game/waterfall.ts"
import { SpriteStage, usePreloadEmoji } from "./SpriteView.tsx"
import { HeroMoney } from "./HeroMoney.tsx"
import { GifParade } from "./GifParade.tsx"
import { DeskCat } from "./DeskCat.tsx"
import { StickyNote } from "./StickyNote.tsx"
import { IdeChrome } from "./IdeChrome.tsx"
import { MiniGlobe } from "./globe/MiniGlobe.tsx"
import { OwnedStrip } from "./OwnedStrip.tsx"
import { Skills } from "./Skills.tsx"
import { useFeatureOpen } from "./useFeature.ts"
import { getSidebarView, subscribeSidebarView } from "../game/ideSidebar.ts"

type Loot = { id: number; x: number; y: number; dx: number; rise: number; text: string; kind: "money" | "xp" }
type Bit = { id: number; x: number; dx: number; dy: number; rot: number; color: string }
type Spark = { id: number; x: number; y: number; dx: number; dy: number; size: number; color: string }
type Ring = { id: number; x: number; y: number; big: boolean }

let seq = 1

// Particles leave on a timer per burst, one commit for the lot, instead of one commit per
// animationend. Each wait is its CSS animation plus a frame of slack (index.css).
const SPARK_MS = 480 + 60
const RING_MS = 420 + 60
const RING_BIG_MS = 800 + 60
const CONFETTI_MS = 720 + 60

function without<T extends { id: number }>(gone: ReadonlySet<number>) {
  return (current: T[]) => {
    const next = current.filter((item) => !gone.has(item.id))
    return next.length === current.length ? current : next
  }
}

const hoverClickPref = () => getDeskPrefs().hoverClick
const hoverModePref = () => getDeskPrefs().hoverMode
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

function burstBits(era: Era): Bit[] {
  const glow = ERA_ACCENT[era].glow
  const colors = [glow, glow, "var(--text)"]
  return Array.from({ length: 20 }, () => {
    const angle = Math.random() * Math.PI * 2
    const dist = 70 + Math.random() * 130
    return {
      id: seq++,
      x: 40 + Math.random() * 20,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 20,
      rot: Math.random() * 360 - 180,
      color: colors[Math.floor(Math.random() * colors.length)] ?? glow,
    }
  })
}

function clickSparks(x: number, y: number, color: string, count: number): Spark[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const dist = 28 + Math.random() * 64
    return {
      id: seq++,
      x,
      y,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 10,
      size: 4 + Math.random() * 4,
      color: Math.random() < 0.35 ? "var(--text)" : color,
    }
  })
}

const ICON_PX = 36

/** Which way the next toss goes. Flips on every toss so the fountain fans out left and right. */
let nextSide: 1 | -1 = 1
function flipSide(): 1 | -1 {
  nextSide = nextSide === 1 ? -1 : 1
  return nextSide
}

/** One random owned logo per spray, tossed up from just above the pointer. */
function fountain(x: number, y: number, icons: readonly IconName[], count: number): Drop[] {
  if (icons.length === 0) return []
  return Array.from({ length: count }, () => {
    const icon = pickClickIcon(icons) ?? icons[0] ?? "Git"
    const { dx, rise } = toss(flipSide())
    return {
      id: seq++,
      x: x + (Math.random() - 0.5) * 14,
      y,
      dx,
      rise,
      fall: fallDistance(window.innerHeight, y, ICON_PX),
      rot: (Math.random() - 0.5) * 140,
      size: ICON_PX,
      icon,
    }
  })
}

// The stage re-renders on every click for its particles. The panels it hosts have their own
// subscriptions and no props that change with a click, so they skip those renders.
const StickyNoteMemo = memo(StickyNote)
const DeskCatMemo = memo(DeskCat)
const GifParadeMemo = memo(GifParade)
const HeroMoneyMemo = memo(HeroMoney)
const OwnedStripMemo = memo(OwnedStrip)
const SkillsMemo = memo(Skills)

/** The very first career, before the first click: an arrow at the art, so the first move is not a guess. Gone on the first click. */
function FirstClickHint() {
  const show = useGame((state) => state.xpTotal === 0 && state.legacy.runs <= 1 && state.profile.chosen)
  if (!show) return null
  return (
    <span className="first-click" data-testid="first-click" aria-hidden="true">
      <span className="first-click-arrow">◀</span>
      <span className="first-click-mouse">Click me</span>
      <span className="first-click-touch">Tap me</span>
    </span>
  )
}

export function Stage() {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  // Derived so an idle tick (a new `now`) does not re-render the whole stage.
  const boosted = useGame((state) => Boolean(state.activeBoost && state.activeBoost.endsAt > state.now))
  const mult = useGame((state) => state.activeBoost?.mult ?? 1)
  const click = useGame((state) => state.click)
  const [loot, setLoot] = useState<Loot[]>([])
  const [bits, setBits] = useState<Bit[]>([])
  const [sparks, setSparks] = useState<Spark[]>([])
  const [rings, setRings] = useState<Ring[]>([])
  const [drops, setDrops] = useState<Drop[]>([])
  const [emojiPulse, setEmojiPulse] = useState(0)

  const stagePanelRef = useRef<HTMLElement>(null)
  const hitboxRef = useRef<HTMLButtonElement>(null)
  const tiltRef = useRef<HTMLSpanElement>(null)
  const heat = useRef(0)
  const heatTimer = useRef(0)
  const impact = useRef<Animation | null>(null)
  const lastSide = useRef(1)

  // Resting: a mouse over the stage. Pressed: any pointer holding the stage down. Auto-click runs on whichever the mode allows.
  const restingRef = useRef(false)
  const pressedRef = useRef(false)
  const pointRef = useRef<{ x: number; y: number } | null>(null)
  const hoverClickOn = useSyncExternalStore(subscribeDeskPrefs, hoverClickPref, hoverClickPref)
  const hoverMode = useSyncExternalStore(subscribeDeskPrefs, hoverModePref, hoverModePref)
  const hoverPerSec = useGame((state) => hoverRate(state.gold, ownsEverything(state)))
  const autoClick = hoverClickOn && hoverPerSec > 0

  const stage = stageOf({ skills, owned, jobs, gigs })
  const accent = ERA_ACCENT[eraOf({ owned })]
  // Before the first laptop the desk is bare: no activity bar, no sidebar.
  const studioOpen = useFeatureOpen("studio")
  const logOpen = useSyncExternalStore(subscribeSidebarView, getSidebarView, getSidebarView) === "log"
  const stageName = stage?.name ?? "High school"

  useEffect(() => {
    return useGame.subscribe((state, previous) => {
      if (state.celebrationNonce === previous.celebrationNonce || state.celebrationNonce === 0) return
      if (prefersReducedMotion()) return
      const born = burstBits(eraOf(state))
      const ring = { id: seq++, x: 50, y: 50, big: true }
      setBits(born)
      setRings((current) => [...current, ring].slice(-12))
      window.setTimeout(() => setBits(without(new Set(born.map((bit) => bit.id)))), CONFETTI_MS)
      window.setTimeout(() => setRings(without(new Set([ring.id]))), RING_BIG_MS)
    })
  }, [])

  // Large pops (gig clear, phase unlock) get a confetti burst; idle ticks and plain clicks never do.
  useEffect(() => {
    return useGame.subscribe((state, previous) => {
      const pop = state.pop
      if (!pop || pop === previous.pop || pop.size !== "large") return
      if (prefersReducedMotion()) return
      const born = burstBits(eraOf(state))
      const ring = { id: seq++, x: 50, y: 46, big: true }
      setBits((current) => [...current, ...born].slice(-40))
      setRings((current) => [...current, ring].slice(-12))
      window.setTimeout(() => setBits(without(new Set(born.map((bit) => bit.id)))), CONFETTI_MS)
      window.setTimeout(() => setRings(without(new Set([ring.id]))), RING_BIG_MS)
    })
  }, [])

  // Heat cools on a timer that only runs while there is heat left, so an idle stage wakes nothing.
  function warmUp() {
    if (heatTimer.current) return
    heatTimer.current = window.setInterval(() => {
      if (heat.current <= 0.005) {
        window.clearInterval(heatTimer.current)
        heatTimer.current = 0
        return
      }
      heat.current *= 0.9
      hitboxRef.current?.style.setProperty("--heat", heat.current.toFixed(3))
    }, 80)
  }

  useEffect(() => () => window.clearInterval(heatTimer.current), [])

  const stageEmoji = stageEmojiSource(stage?.source)

  usePreloadEmoji(stageEmoji?.kind ?? STAGE_START_EMOJI.kind, stageEmoji?.id ?? STAGE_START_EMOJI.id)

  function playImpact(nx: number, ny: number) {
    const tilt = tiltRef.current
    if (!tilt || typeof tilt.animate !== "function") return
    // Only the last bump can still be running. getAnimations() would flush style on every click.
    const last = impact.current
    if (last) {
      last.finished.catch(() => {})
      last.cancel()
    }
    if (prefersReducedMotion()) {
      impact.current = tilt.animate([{ opacity: 0.8 }, { opacity: 1 }], { duration: 120 })
      return
    }
    // A bump: the sprite pops up and tips slightly away from the click, then settles
    // with a tiny jitter. Fast clicking (heat) and boosts make it a little bigger.
    const power = 1 + heat.current * 0.5 + (boosted ? 0.25 : 0)
    const dir = Math.abs(nx) > 0.08 ? Math.sign(nx) : (lastSide.current = -lastSide.current)
    const frame = (scale: number, rx: number, ry: number, rz: number, tx: number, ty: number) =>
      `perspective(700px) translate(${tx}px, ${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`
    impact.current = tilt.animate(
      [
        { transform: frame(1, 0, 0, 0, 0, 0), offset: 0 },
        {
          transform: frame(1 + 0.06 * power, -ny * 5 * power, nx * 5 * power, dir * 1.2 * power, 0, -5 * power),
          offset: 0.22,
        },
        { transform: frame(0.985, 0, 0, -dir * 0.8, 1.5 * power, 1), offset: 0.45 },
        { transform: frame(1.01, 0, 0, dir * 0.4, -1 * power, 0), offset: 0.68 },
        { transform: frame(1, 0, 0, 0, 0, 0), offset: 1 },
      ],
      { duration: 260, easing: "cubic-bezier(0.25, 0.9, 0.3, 1)" },
    )
  }

  function fire(clientX: number | null, clientY: number | null, touch = false, source: ClickSource = "manual") {
    const box = hitboxRef.current
    if (!box) return
    // Measure before any write below, so the read does not force a fresh style and layout pass.
    const rect = box.getBoundingClientRect()
    pokeDesk()
    const gain = click(source)
    heat.current = Math.min(1, heat.current + 0.14)
    box.style.setProperty("--heat", heat.current.toFixed(3))
    warmUp()
    if (stageEmoji) setEmojiPulse((n) => n + 1)

    const hasPoint = clientX !== null && clientY !== null && (clientX !== 0 || clientY !== 0)
    const px = hasPoint ? ((clientX - rect.left) / rect.width) * 100 : 50
    const py = hasPoint ? ((clientY - rect.top) / rect.height) * 100 : 45
    const x = Math.min(96, Math.max(4, px))
    const y = Math.min(96, Math.max(4, py))
    playImpact((x - 50) / 50, (y - 50) / 50)

    const textLabels: { kind: Loot["kind"]; text: string }[] = [
      ...(gain.money > 0 ? [{ kind: "money" as const, text: `+$${formatNumber(gain.money)}` }] : []),
      ...(gain.xp > 0 ? [{ kind: "xp" as const, text: `+${formatNumber(gain.xp)} XP` }] : []),
    ]

    const originX = hasPoint && clientX !== null ? clientX : rect.left + rect.width / 2
    // The fountain starts a little above the pointer, and higher above a finger, so the hand never covers it.
    const originY = (hasPoint && clientY !== null ? clientY : rect.top + rect.height * 0.45) - fountainLift(touch)
    // Text and logos fall for the same time, so one timer clears both.
    const fallen = new Set<number>()
    if (textLabels.length > 0) {
      const bornLoot = textLabels.map((label) => {
        // Money and XP go opposite ways when both pay; a lone label takes the next side.
        const side = textLabels.length > 1 ? (label.kind === "xp" ? 1 : -1) : flipSide()
        const { dx, rise } = toss(side)
        return {
          id: seq++,
          x: originX + side * 8,
          y: originY - (label.kind === "xp" ? 10 : 0),
          dx: dx * 0.7,
          rise: rise * LOOT_RISE_SCALE + 8,
          text: label.text,
          kind: label.kind,
        }
      })
      for (const item of bornLoot) fallen.add(item.id)
      setLoot((current) => [...current, ...bornLoot].slice(-24))
    }

    const born = fountain(originX, originY, iconPool({ skills, equipment, jobs, gigs }), waterfallCount(boosted))
    if (born.length > 0) {
      for (const drop of born) fallen.add(drop.id)
      setDrops((current) => capDrops(current, born))
    }
    if (fallen.size > 0) {
      window.setTimeout(() => {
        setLoot(without(fallen))
        setDrops(without(fallen))
      }, FALL_MS + 60)
    }
    if (prefersReducedMotion()) return
    const ring = { id: seq++, x, y, big: false }
    const bornSparks = clickSparks(x, y, accent.glow, boosted ? 14 : 9)
    setRings((current) => [...current, ring].slice(-14))
    setSparks((current) => [...current, ...bornSparks].slice(-90))
    const burst = new Set([ring.id, ...bornSparks.map((spark) => spark.id)])
    window.setTimeout(() => {
      setRings(without(burst))
      setSparks(without(burst))
    }, Math.max(RING_MS, SPARK_MS))
  }

  const fireRef = useRef(fire)
  useEffect(() => {
    fireRef.current = fire
  })

  useEffect(() => {
    if (!autoClick) return
    const id = window.setInterval(() => {
      const { hoverMode: mode } = getDeskPrefs()
      const live = mode === "hover" ? restingRef.current : mode === "hold" ? pressedRef.current : restingRef.current || pressedRef.current
      if (!live || document.hidden) return
      const state = useGame.getState()
      if (state.event || state.review || !getDeskPrefs().hoverClick || hoverRate(state.gold, ownsEverything(state)) <= 0) return
      const point = pointRef.current
      fireRef.current(point?.x ?? null, point?.y ?? null, false, "auto")
    }, hoverStepMs(hoverPerSec))
    return () => window.clearInterval(id)
  }, [autoClick, hoverPerSec])

  // touch and pen have no hover, so they only track while pressed.
  function trackHover(event: PointerEvent<HTMLButtonElement>) {
    const held = event.buttons > 0
    if (event.pointerType === "mouse") restingRef.current = true
    else if (!held) return
    pressedRef.current = held
    pointRef.current = { x: event.clientX, y: event.clientY }
  }

  function clearHover() {
    restingRef.current = false
    pressedRef.current = false
    pointRef.current = null
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    pressedRef.current = false
    if (event.pointerType !== "mouse") clearHover()
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    fire(event.clientX, event.clientY, event.pointerType === "touch" || event.pointerType === "pen")
    trackHover(event)
  }

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) fire(null, null)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat && (event.key === " " || event.key === "Enter")) event.preventDefault()
  }

  const gold = boosted && mult >= GOLD_MULT_THRESHOLD

  return (
    <section
      ref={stagePanelRef}
      className={["stage-panel", boosted ? "is-boosted" : "", gold ? "is-boost-gold" : "", studioOpen ? "" : "is-bare", logOpen ? "is-log-open" : ""].filter(Boolean).join(" ")}
      aria-label="Click stage"
    >
      <IdeChrome />
      {studioOpen ? null : (
        <div className="stage-corner">
          <EditorSettings place="corner" />
        </div>
      )}
      <StickyNoteMemo />
      <DeskCatMemo />
      <GifParadeMemo />
      <MiniGlobe />
      <span className="era-sweep" aria-hidden="true" />
      <HeroMoneyMemo stagePanelRef={stagePanelRef} />
      <button
        ref={hitboxRef}
        type="button"
        className="hitbox"
        data-testid="stage"
        data-auto-click={autoClick ? "on" : "off"}
        onPointerEnter={trackHover}
        onPointerMove={trackHover}
        onPointerLeave={clearHover}
        onPointerUp={release}
        onPointerCancel={clearHover}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={
          autoClick
            ? `Click to earn. Auto-click at ${hoverPerSec} per second. ${HOVER_MODES.find((m) => m.id === hoverMode)?.blurb ?? ""} Current stage ${stageName}.`
            : `Click to earn. Current stage ${stageName}.`
        }
      >
        {boosted ? <span className="rim" aria-hidden="true" /> : null}
        <FirstClickHint />
        <span className="sprite-bob">
          <span ref={tiltRef} className="sprite-tilt">
            <span className="sprite-frame">
              {stageEmoji ? (
                <SpriteStage
                  kind={stageEmoji.kind}
                  id={stageEmoji.id}
                  pulseNonce={emojiPulse}
                  className="sprite"
                />
              ) : null}
            </span>
          </span>
        </span>
        {rings.map((ring) => (
          <i
            key={ring.id}
            className={ring.big ? "ring ring-big" : "ring"}
            style={{ left: `${ring.x}%`, top: `${ring.y}%` }}
          />
        ))}
        {sparks.map((spark) => (
          <i
            key={spark.id}
            className="spark"
            style={{
              left: `${spark.x}%`,
              top: `${spark.y}%`,
              width: spark.size,
              height: spark.size,
              background: spark.color,
              ["--dx" as string]: `${spark.dx}px`,
              ["--dy" as string]: `${spark.dy}px`,
            }}
          />
        ))}
        {bits.map((bit) => (
          <i
            key={bit.id}
            className="confetti"
            style={{
              left: `${bit.x}%`,
              top: "46%",
              background: bit.color,
              ["--dx" as string]: `${bit.dx}px`,
              ["--dy" as string]: `${bit.dy}px`,
              ["--rot" as string]: `${bit.rot}deg`,
            }}
          />
        ))}
      </button>
      {createPortal(
        <div className="drops" aria-hidden="true">
          {drops.map((drop) => {
            const Icon = CLICK_ICONS[drop.icon as IconName]
            if (!Icon) return null
            return (
              <span
                key={drop.id}
                className="drop"
                data-icon={drop.icon}
                style={{
                  left: drop.x - drop.size / 2,
                  top: drop.y - drop.size / 2,
                  width: drop.size,
                  height: drop.size,
                  ["--dx" as string]: `${drop.dx}px`,
                  ["--rise" as string]: `${drop.rise}px`,
                  ["--fall" as string]: `${drop.fall}px`,
                  ["--rot" as string]: `${drop.rot}deg`,
                }}
              >
                <Icon size={drop.size} />
              </span>
            )
          })}
          {loot.map((item) => (
            <span
              key={item.id}
              className={item.kind === "xp" ? "loot loot-xp" : "loot loot-money"}
              style={{
                left: item.x,
                top: item.y,
                ["--dx" as string]: `${item.dx}px`,
                ["--rise" as string]: `${item.rise}px`,
              }}
            >
              {item.text}
            </span>
          ))}
        </div>,
        document.body,
      )}
      <div className="plate">
        <p className="era-tag">{stage ? accent.kicker : "Before the offer"}</p>
        <h2>{stageName}</h2>
      </div>
      <div className="career-dock">
        <OwnedStripMemo />
        <SkillsMemo />
      </div>
    </section>
  )
}
