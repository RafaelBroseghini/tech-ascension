import { EditorSettings } from "./EditorSettings.tsx"
import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react"
import { GOLD_MULT_THRESHOLD } from "../data/boosts.ts"
import { CLICK_ICONS, iconPool, pickClickIcon } from "../data/clickIcons.ts"
import type { IconName } from "../data/clickIcons.ts"
import { ERA_ACCENT } from "../data/eraAccent.ts"
import { stageEmojiSource, STAGE_START_EMOJI } from "../data/emojiAssets.ts"
import { hoverStepMs } from "../game/autoClick.ts"
import type { ClickSource } from "../game/build.ts"
import { hoverRate } from "../game/gold.ts"
import { HOVER_MODES, getDeskPrefs, pokeDesk, reducedMotion, subscribeDeskPrefs } from "../game/desk.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { eraOf, stageOf } from "../game/phase.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"
import { capDrops, dropPath, fallDistance, fountainLift, LOOT_MS, pathMs, toss, tossLoot, waterfallCount } from "../game/waterfall.ts"
import type { Drop } from "../game/waterfall.ts"
import { SpriteStage, usePreloadEmoji } from "./SpriteView.tsx"
import { HeroMoney } from "./HeroMoney.tsx"
import { GifParade } from "./GifParade.tsx"
import { DeskCat } from "./DeskCat.tsx"
import { UnlockFx } from "./UnlockFx.tsx"
import { StickyNote } from "./StickyNote.tsx"
import { motionReady, prefersReducedMotion } from "./useMotion.ts"
import { IdeChrome } from "./IdeChrome.tsx"
import { MiniGlobe } from "./globe/MiniGlobe.tsx"
import { OwnedStrip } from "./OwnedStrip.tsx"
import { Skills } from "./Skills.tsx"
import { useFeatureOpen } from "./useFeature.ts"
import { getSidebarView, subscribeSidebarView } from "../game/ideSidebar.ts"

type Loot = { id: number; x: number; y: number; dx: number; rise: number; text: string; kind: "money" | "xp" }
type Spark = { id: number; x: number; y: number; dx: number; dy: number; size: number; color: string }
type Ring = { id: number; x: number; y: number }

let seq = 1

// Particles leave on a timer per burst, one commit for the lot, instead of one commit per
// animationend. Each wait is its CSS animation plus a frame of slack (index.css).
const SPARK_MS = 480 + 60
const RING_MS = 420 + 60

function without<T extends { id: number }>(gone: ReadonlySet<number>) {
  return (current: T[]) => {
    const next = current.filter((item) => !gone.has(item.id))
    return next.length === current.length ? current : next
  }
}

const hoverClickPref = () => getDeskPrefs().hoverClick
const hoverModePref = () => getDeskPrefs().hoverMode

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

/** One logo of the fountain: it plays its sampled path (rise, fall, bounces, sink) once, on the compositor, from where it mounts. */
function DropIcon({ drop, children }: { drop: Drop; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== "function") return
    const life = Math.max(1, drop.life)
    const frames = drop.frames.map((f) => ({
      offset: f.t / life,
      transform: `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) rotate(${f.rot.toFixed(1)}deg) scale(${f.sx.toFixed(3)}, ${f.sy.toFixed(3)})`,
      opacity: f.o,
    }))
    // Reduced motion keeps a short, plain fall: the logo drops straight to the ground and goes, with no bounces.
    const still = reducedMotion()
    const first = frames[0]!
    const plain = [first, { offset: 1, transform: `translate(0px, ${drop.fall.toFixed(1)}px)`, opacity: 0 }]
    const run = el.animate(still ? plain : frames, { duration: still ? 900 : life, easing: "linear", fill: "forwards" })
    // Cancelling on unmount rejects `finished`; nobody waits on it.
    run.finished.catch(() => {})
    return () => run.cancel()
  }, [drop])
  return (
    <span ref={ref} className="drop" data-icon={drop.icon} style={{ left: drop.x - drop.size / 2, top: drop.y - drop.size / 2, width: drop.size, height: drop.size }}>
      {children}
    </span>
  )
}

/** One random owned logo per spray, tossed up from just above the pointer. */
function fountain(x: number, y: number, icons: readonly IconName[], count: number): Drop[] {
  if (icons.length === 0) return []
  // The jets alternate, so every pair fans out both ways and an odd one out starts on the side the last click ended on.
  return Array.from({ length: count }, () => {
    const icon = pickClickIcon(icons) ?? icons[0] ?? "Git"
    const { dx, rise } = toss(flipSide())
    const fall = fallDistance(window.innerHeight, y, ICON_PX)
    const rot = (Math.random() - 0.5) * 220
    const frames = dropPath(rise, dx, fall, rot)
    return {
      id: seq++,
      x: x + (Math.random() - 0.5) * 14,
      y,
      dx,
      rise,
      fall,
      rot,
      size: ICON_PX,
      icon,
      frames,
      life: pathMs(frames),
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
  const [sparks, setSparks] = useState<Spark[]>([])
  const [rings, setRings] = useState<Ring[]>([])
  const [drops, setDrops] = useState<Drop[]>([])
  const [emojiPulse, setEmojiPulse] = useState(0)

  const stagePanelRef = useRef<HTMLElement>(null)
  const hitboxRef = useRef<HTMLButtonElement>(null)
  const tiltRef = useRef<HTMLSpanElement>(null)
  const heat = useRef(0)
  const heatTimer = useRef(0)
  const impact = useRef<{ complete: () => void } | null>(null)
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
  // Until GitHug unlocks the desk is bare: no activity bar, no sidebar, and the settings gear sits in the stage's corner.
  const barOpen = useFeatureOpen("githug")
  const logOpen = useSyncExternalStore(subscribeSidebarView, getSidebarView, getSidebarView) === "log"
  const stageName = stage?.name ?? "High school"

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

  useEffect(
    () => () => {
      window.clearInterval(heatTimer.current)
      impact.current?.complete()
    },
    [],
  )

  const stageEmoji = stageEmojiSource(stage?.source)

  usePreloadEmoji(stageEmoji?.kind ?? STAGE_START_EMOJI.kind, stageEmoji?.id ?? STAGE_START_EMOJI.id)

  function playImpact(nx: number, ny: number) {
    const tilt = tiltRef.current
    // Never waits for Motion: a click before its chunk lands just goes without the bump.
    const motion = motionReady()
    if (!tilt || !motion) return
    // Only the last bump can still be running; the new one takes the sprite over.
    impact.current?.complete()
    if (prefersReducedMotion()) {
      impact.current = motion.animate(tilt, { opacity: [0.8, 1] }, { duration: 0.12 })
      return
    }
    // A bump: the click throws the sprite up and tips it away from the pointer, and a Motion spring carries the
    // amount (1 to 0) back. The spring's own overshoot is the settle: a small tip the other way, then rest.
    // Fast clicking (heat) and boosts make it a little bigger.
    const power = 1 + heat.current * 0.5 + (boosted ? 0.25 : 0)
    const dir = Math.abs(nx) > 0.08 ? Math.sign(nx) : (lastSide.current = -lastSide.current)
    const pose = (k: number) =>
      `perspective(700px) translate(0px, ${(-5 * power * k).toFixed(2)}px) rotateX(${(-ny * 5 * power * k).toFixed(2)}deg) rotateY(${(nx * 5 * power * k).toFixed(2)}deg) rotateZ(${(dir * 1.2 * power * k).toFixed(2)}deg) scale(${(1 + 0.06 * power * k).toFixed(4)})`
    tilt.style.transform = pose(1)
    impact.current = motion.animate(1, 0, {
      type: "spring",
      stiffness: 1100,
      damping: 26,
      restDelta: 0.002,
      restSpeed: 0.02,
      onUpdate: (k) => {
        tilt.style.transform = pose(k)
      },
      onComplete: () => tilt.style.removeProperty("transform"),
    })
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
        const { dx, rise } = tossLoot(side)
        return {
          id: seq++,
          x: originX + side * 8,
          y: originY - (label.kind === "xp" ? 10 : 0),
          dx,
          rise,
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
      // The text clears itself after LOOT_MS; the logos after their bounces, which take longer.
      const lasts = Math.max(textLabels.length > 0 ? LOOT_MS : 0, ...born.map((drop) => drop.life))
      window.setTimeout(() => {
        setLoot(without(fallen))
        setDrops(without(fallen))
      }, lasts + 60)
    }
    if (prefersReducedMotion()) return
    const ring = { id: seq++, x, y }
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
      className={["stage-panel", boosted ? "is-boosted" : "", gold ? "is-boost-gold" : "", barOpen ? "" : "is-bare", logOpen ? "is-log-open" : ""].filter(Boolean).join(" ")}
      aria-label="Click stage"
    >
      <IdeChrome />
      {barOpen ? null : (
        <div className="stage-corner">
          <EditorSettings place="corner" />
        </div>
      )}
      <StickyNoteMemo />
      <DeskCatMemo />
      <GifParadeMemo />
      <MiniGlobe />
      <span className="era-sweep" aria-hidden="true" />
      <UnlockFx panelRef={stagePanelRef} hitboxRef={hitboxRef} />
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
            className="ring"
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
      </button>
      {createPortal(
        <div className="drops" aria-hidden="true">
          {drops.map((drop) => {
            const Icon = CLICK_ICONS[drop.icon as IconName]
            if (!Icon) return null
            return (
              <DropIcon key={drop.id} drop={drop}>
                <Icon size={drop.size} />
              </DropIcon>
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
