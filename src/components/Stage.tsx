import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react"
import { GOLD_MULT_THRESHOLD } from "../data/boosts.ts"
import { CLICK_ICONS, iconPool, pickClickIcon } from "../data/clickIcons.ts"
import type { IconName } from "../data/clickIcons.ts"
import { ERA_ACCENT } from "../data/eraAccent.ts"
import { stageEmojiSource, STAGE_START_EMOJI } from "../data/emojiAssets.ts"
import { hoverStepMs } from "../game/autoClick.ts"
import { hoverRate } from "../game/gold.ts"
import { getDeskPrefs, pokeDesk, subscribeDeskPrefs } from "../game/desk.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { eraOf, stageOf } from "../game/phase.ts"
import type { Era } from "../data/capital.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"
import { capDrops, FALL_MS, waterfallCount } from "../game/waterfall.ts"
import type { Drop } from "../game/waterfall.ts"
import { SpriteStage, usePreloadEmoji } from "./SpriteView.tsx"
import { HeroMoney } from "./HeroMoney.tsx"
import { DeskCat } from "./DeskCat.tsx"
import { StickyNote } from "./StickyNote.tsx"
import { scrollIdeEditor } from "../game/ideScroll.ts"
import { IdeChrome } from "./IdeChrome.tsx"
import { IdePythonConsole } from "./IdePythonConsole.tsx"
import { OwnedStrip } from "./OwnedStrip.tsx"
import { Skills } from "./Skills.tsx"
import { ScorePop } from "./ScorePop.tsx"

type Loot = { id: number; x: number; y: number; dx: number; dy: number; text: string; kind: "money" | "xp" }
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

/** One random owned logo per spray, dropped from the cursor. */
function waterfall(x: number, y: number, icons: readonly IconName[], count: number): Drop[] {
  if (icons.length === 0) return []
  return Array.from({ length: count }, () => {
    const icon = pickClickIcon(icons) ?? icons[0] ?? "Git"
    return {
      id: seq++,
      x: x + (Math.random() - 0.5) * 36,
      y: y + 18 + Math.random() * 10,
      dx: (Math.random() - 0.5) * 80,
      dy: 150 + Math.random() * 100,
      rot: (Math.random() - 0.5) * 70,
      size: ICON_PX,
      icon,
    }
  })
}

// The stage re-renders on every click for its particles. The panels it hosts have their own
// subscriptions and no props that change with a click, so they skip those renders.
const StickyNoteMemo = memo(StickyNote)
const DeskCatMemo = memo(DeskCat)
const HeroMoneyMemo = memo(HeroMoney)
const OwnedStripMemo = memo(OwnedStrip)
const SkillsMemo = memo(Skills)
const IdePythonConsoleMemo = memo(IdePythonConsole)
const ScorePopMemo = memo(ScorePop)

const BOOST_CHIP_MS = 12000

/** The click boost countdown. The only part of the stage that follows the clock. */
function BoostChip({ mult }: { mult: number }) {
  const left = useGame((state) => (state.activeBoost ? Math.max(0, state.activeBoost.endsAt - state.now) : 0))
  return (
    <div className="boost-chip">
      <span className="boost-chip-mult">×{mult}</span>
      <span>click boost</span>
      <i className="boost-chip-bar" style={{ ["--left" as string]: `${Math.min(100, (left / BOOST_CHIP_MS) * 100)}%` }} />
    </div>
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

  const hoverRef = useRef(false)
  const pointRef = useRef<{ x: number; y: number } | null>(null)
  const hoverClickOn = useSyncExternalStore(subscribeDeskPrefs, hoverClickPref, hoverClickPref)
  const hoverPerSec = useGame((state) => hoverRate(state.gold, ownsEverything(state)))
  const autoClick = hoverClickOn && hoverPerSec > 0

  const stage = stageOf({ skills, owned, jobs, gigs })
  const accent = ERA_ACCENT[eraOf({ owned })]
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

  // Large pops (gig clear, phase unlock) get a burst; idle ticks and plain clicks never do.
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

  function fire(clientX: number | null, clientY: number | null) {
    const box = hitboxRef.current
    if (!box) return
    // Measure before any write below, so the read does not force a fresh style and layout pass.
    const rect = box.getBoundingClientRect()
    pokeDesk()
    const gain = click()
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
    const originY = hasPoint && clientY !== null ? clientY : rect.top + rect.height * 0.45
    // Text and logos fall for the same time, so one timer clears both.
    const fallen = new Set<number>()
    if (textLabels.length > 0) {
      const bornLoot = textLabels.map((label) => {
        const side = label.kind === "xp" ? 1 : -1
        return {
          id: seq++,
          x: originX + (textLabels.length > 1 ? side * 16 : 0),
          y: originY + (label.kind === "xp" ? -18 : 6),
          dx: side * (12 + Math.random() * 26),
          dy: 120 + Math.random() * 80,
          text: label.text,
          kind: label.kind,
        }
      })
      for (const item of bornLoot) fallen.add(item.id)
      setLoot((current) => [...current, ...bornLoot].slice(-24))
    }

    const born = waterfall(originX, originY, iconPool({ skills, equipment, jobs, gigs }), waterfallCount(boosted))
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
      if (!hoverRef.current || document.hidden) return
      const state = useGame.getState()
      if (state.event || state.review || state.hackOpen || !getDeskPrefs().hoverClick || hoverRate(state.gold, ownsEverything(state)) <= 0) return
      const point = pointRef.current
      fireRef.current(point?.x ?? null, point?.y ?? null)
    }, hoverStepMs(hoverPerSec))
    return () => window.clearInterval(id)
  }, [autoClick, hoverPerSec])

  function trackHover(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") return
    hoverRef.current = true
    pointRef.current = { x: event.clientX, y: event.clientY }
  }

  function clearHover() {
    hoverRef.current = false
    pointRef.current = null
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    fire(event.clientX, event.clientY)
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
      className={["stage-panel", boosted ? "is-boosted" : "", gold ? "is-boost-gold" : ""].filter(Boolean).join(" ")}
      aria-label="Click stage"
      onWheel={scrollIdeEditor}
    >
      <IdeChrome />
      <StickyNoteMemo />
      <DeskCatMemo />
      <span className="era-sweep" aria-hidden="true" />
      <div className="boost-chip-slot" aria-live="polite">
        {boosted ? <BoostChip mult={mult} /> : null}
      </div>
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
        onPointerCancel={clearHover}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={
          autoClick
            ? `Click to earn. Hover to auto-click at ${hoverPerSec} per second. Current stage ${stageName}.`
            : `Click to earn. Current stage ${stageName}.`
        }
      >
        {boosted ? <span className="rim" aria-hidden="true" /> : null}
        <span className="motes" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <i key={index} style={{ ["--i" as string]: index }} />
          ))}
        </span>
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
                  ["--dy" as string]: `${drop.dy}px`,
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
                ["--dy" as string]: `${item.dy}px`,
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
      <IdePythonConsoleMemo />
      <ScorePopMemo />
    </section>
  )
}
