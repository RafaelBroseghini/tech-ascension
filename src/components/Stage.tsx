import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react"
import { GOLD_MULT_THRESHOLD } from "../data/boosts.ts"
import { CLICK_ICONS, iconPool, pickClickIcon } from "../data/clickIcons.ts"
import type { IconName } from "../data/clickIcons.ts"
import { ERA_ACCENT } from "../data/sprites.ts"
import { stageEmojiSource, STAGE_START_EMOJI } from "../data/emojiAssets.ts"
import { HOVER_CLICK_STEP_MS, MAX_CLICKS_PER_SEC } from "../game/autoClick.ts"
import { getDeskPrefs, pokeDesk, subscribeDeskPrefs } from "../game/desk.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { eraOf, stageOf } from "../game/phase.ts"
import type { Era } from "../data/capital.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"
import { capDrops, FALL_MS, waterfallCount } from "../game/waterfall.ts"
import type { Drop } from "../game/waterfall.ts"
import { FightOverlay } from "./FightOverlay.tsx"
import { SpriteStage, usePreloadEmoji } from "./SpriteView.tsx"
import { HeroMoney } from "./HeroMoney.tsx"
import { DeskCat } from "./DeskCat.tsx"
import { StickyNote } from "./StickyNote.tsx"
import { IdeChrome } from "./IdeChrome.tsx"
import { OwnedStrip } from "./OwnedStrip.tsx"
import { Skills } from "./Skills.tsx"
import { ScorePop } from "./ScorePop.tsx"

type Loot = { id: number; x: number; y: number; dx: number; dy: number; text: string; kind: "money" | "xp" }
type Bit = { id: number; x: number; dx: number; dy: number; rot: number; color: string }
type Spark = { id: number; x: number; y: number; dx: number; dy: number; size: number; color: string }
type Ring = { id: number; x: number; y: number; big: boolean }

let seq = 1

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

const ICON_PX = 28

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

export function Stage() {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const click = useGame((state) => state.click)
  const [loot, setLoot] = useState<Loot[]>([])
  const [bits, setBits] = useState<Bit[]>([])
  const [sparks, setSparks] = useState<Spark[]>([])
  const [rings, setRings] = useState<Ring[]>([])
  const [drops, setDrops] = useState<Drop[]>([])
  const [emojiPulse, setEmojiPulse] = useState(0)

  const hitboxRef = useRef<HTMLButtonElement>(null)
  const tiltRef = useRef<HTMLSpanElement>(null)
  const heat = useRef(0)
  const lastSide = useRef(1)
  const hoverRef = useRef(false)
  const pointRef = useRef<{ x: number; y: number } | null>(null)
  const hoverClickOn = useSyncExternalStore(subscribeDeskPrefs, hoverClickPref, hoverClickPref)
  const catalogComplete = useGame((state) => ownsEverything(state))
  const autoClick = hoverClickOn && catalogComplete

  const stage = stageOf({ skills, owned, jobs, gigs })
  const accent = ERA_ACCENT[eraOf({ owned })]
  const boosted = Boolean(activeBoost && activeBoost.endsAt > now)
  const stageName = stage?.name ?? "High school"
  const boostLeft = activeBoost && boosted ? Math.max(0, activeBoost.endsAt - now) : 0

  useEffect(() => {
    return useGame.subscribe((state, previous) => {
      if (state.celebrationNonce === previous.celebrationNonce || state.celebrationNonce === 0) return
      if (prefersReducedMotion()) return
      setBits(burstBits(eraOf(state)))
      setRings((current) => [...current, { id: seq++, x: 50, y: 50, big: true }].slice(-12))
    })
  }, [])

  // Large pops (gig clear, fight win, phase unlock) get a burst; idle ticks and plain clicks never do.
  useEffect(() => {
    return useGame.subscribe((state, previous) => {
      const pop = state.pop
      if (!pop || pop === previous.pop || pop.size !== "large") return
      if (prefersReducedMotion()) return
      setBits((current) => [...current, ...burstBits(eraOf(state))].slice(-40))
      setRings((current) => [...current, { id: seq++, x: 50, y: 46, big: true }].slice(-12))
    })
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (heat.current <= 0.005) return
      heat.current *= 0.9
      hitboxRef.current?.style.setProperty("--heat", heat.current.toFixed(3))
    }, 80)
    return () => window.clearInterval(id)
  }, [])

  const stageEmoji = stageEmojiSource(stage?.source)

  usePreloadEmoji(stageEmoji?.kind ?? STAGE_START_EMOJI.kind, stageEmoji?.id ?? STAGE_START_EMOJI.id)

  function playImpact(nx: number, ny: number) {
    const tilt = tiltRef.current
    if (!tilt || typeof tilt.animate !== "function") return
    for (const animation of tilt.getAnimations()) {
      animation.finished.catch(() => {})
      animation.cancel()
    }
    if (prefersReducedMotion()) {
      tilt.animate([{ opacity: 0.8 }, { opacity: 1 }], { duration: 120 })
      return
    }
    // A bump: the sprite pops up and tips slightly away from the click, then settles
    // with a tiny jitter. Fast clicking (heat) and boosts make it a little bigger.
    const power = 1 + heat.current * 0.5 + (boosted ? 0.25 : 0)
    const dir = Math.abs(nx) > 0.08 ? Math.sign(nx) : (lastSide.current = -lastSide.current)
    const frame = (scale: number, rx: number, ry: number, rz: number, tx: number, ty: number) =>
      `perspective(700px) translate(${tx}px, ${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`
    tilt.animate(
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
    if (!box || useGame.getState().fight) return
    pokeDesk()
    const gain = click()
    heat.current = Math.min(1, heat.current + 0.14)
    box.style.setProperty("--heat", heat.current.toFixed(3))
    if (stageEmoji) setEmojiPulse((n) => n + 1)

    const rect = box.getBoundingClientRect()
    const hasPoint = clientX !== null && clientY !== null && (clientX !== 0 || clientY !== 0)
    const px = hasPoint ? ((clientX - rect.left) / rect.width) * 100 : 50
    const py = hasPoint ? ((clientY - rect.top) / rect.height) * 100 : 45
    const x = Math.min(96, Math.max(4, px))
    const y = Math.min(96, Math.max(4, py))
    playImpact((x - 50) / 50, (y - 50) / 50)

    const textLabels: { kind: Loot["kind"]; text: string }[] = [
      ...(gain.money > 0 ? [{ kind: "money" as const, text: `+$${formatNumber(gain.money)}` }] : []),
      { kind: "xp", text: `+${formatNumber(gain.xp)} XP` },
    ]

    const originX = hasPoint && clientX !== null ? clientX : rect.left + rect.width / 2
    const originY = hasPoint && clientY !== null ? clientY : rect.top + rect.height * 0.45
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
      const lootIds = new Set(bornLoot.map((item) => item.id))
      setLoot((current) => [...current, ...bornLoot].slice(-24))
      window.setTimeout(() => {
        setLoot((current) => current.filter((item) => !lootIds.has(item.id)))
      }, FALL_MS + 60)
    }

    const born = waterfall(originX, originY, iconPool({ skills, equipment, jobs, gigs }), waterfallCount(boosted))
    if (born.length > 0) {
      setDrops((current) => capDrops(current, born))
      window.setTimeout(() => {
        setDrops((current) => current.filter((item) => !born.some((drop) => drop.id === item.id)))
      }, FALL_MS + 60)
    }
    if (prefersReducedMotion()) return
    setRings((current) => [...current, { id: seq++, x, y, big: false }].slice(-14))
    setSparks((current) =>
      [...current, ...clickSparks(x, y, accent.glow, boosted ? 14 : 9)].slice(-90),
    )
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
      if (state.fight || state.event || state.review || !getDeskPrefs().hoverClick || !ownsEverything(state)) return
      const point = pointRef.current
      fireRef.current(point?.x ?? null, point?.y ?? null)
    }, HOVER_CLICK_STEP_MS)
    return () => window.clearInterval(id)
  }, [autoClick])

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

  const mult = activeBoost?.mult ?? 1
  const gold = boosted && mult >= GOLD_MULT_THRESHOLD

  return (
    <section className={["stage-panel", boosted ? "is-boosted" : "", gold ? "is-boost-gold" : ""].filter(Boolean).join(" ")} aria-label="Click stage">
      <IdeChrome />
      <StickyNote />
      <DeskCat />
      <span className="era-sweep" aria-hidden="true" />
      <div className="boost-chip-slot" aria-live="polite">
        {boosted ? (
          <div className="boost-chip">
            <span className="boost-chip-mult">×{mult}</span>
            <span>click boost</span>
            <i
              className="boost-chip-bar"
              style={{ ["--left" as string]: `${Math.min(100, (boostLeft / 12000) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <HeroMoney />
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
            ? `Click to earn. Hover to auto-click at ${MAX_CLICKS_PER_SEC} per second. Current stage ${stageName}.`
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
            onAnimationEnd={() => setRings((current) => current.filter((item) => item.id !== ring.id))}
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
            onAnimationEnd={() => setSparks((current) => current.filter((item) => item.id !== spark.id))}
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
            onAnimationEnd={() => setBits((current) => current.filter((item) => item.id !== bit.id))}
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
        <OwnedStrip />
        <Skills />
      </div>
      <FightOverlay />
      <ScorePop />
    </section>
  )
}
