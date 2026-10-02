import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react"
import { ERA_ACCENT, spriteForTier, START_SUBJECT, subjectForTier } from "../data/sprites.ts"
import { highestOwnedTier, tierById } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

type Pop = { id: number; x: number; y: number; drift: number; text: string; kind: "money" | "xp" }
type Bit = { id: number; x: number; dx: number; dy: number; rot: number; color: string }
type Spark = { id: number; x: number; y: number; dx: number; dy: number; size: number; color: string }
type Drop = { id: number; x: number; y: number; dx: number; dy: number; rot: number; size: number; src: string }
type Ring = { id: number; x: number; y: number; big: boolean }

let seq = 1

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

function burstBits(tierId: number): Bit[] {
  const tier = tierById(tierId)
  const glow = ERA_ACCENT[tier?.era ?? "early"].glow
  const colors = [glow, glow, "#f7f0df"]
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
      color: Math.random() < 0.35 ? "#f7f0df" : color,
    }
  })
}

const DROP_MS = 500

function stageDrops(x: number, y: number, src: string, count: number): Drop[] {
  return Array.from({ length: count }, () => ({
    id: seq++,
    x: x + (Math.random() - 0.5) * 18,
    y: y + (Math.random() - 0.5) * 12,
    dx: (Math.random() - 0.5) * 90,
    dy: 220 + Math.random() * 140,
    rot: (Math.random() - 0.5) * 80,
    size: 26 + Math.random() * 18,
    src,
  }))
}

export function Stage() {
  const owned = useGame((state) => state.owned)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const click = useGame((state) => state.click)
  const [pops, setPops] = useState<Pop[]>([])
  const [bits, setBits] = useState<Bit[]>([])
  const [sparks, setSparks] = useState<Spark[]>([])
  const [rings, setRings] = useState<Ring[]>([])
  const [drops, setDrops] = useState<Drop[]>([])
  const [entered, setEntered] = useState(false)

  const hitboxRef = useRef<HTMLButtonElement>(null)
  const tiltRef = useRef<HTMLSpanElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const heat = useRef(0)
  const lastSide = useRef(1)

  const ownedTier = highestOwnedTier(owned)
  const artId = ownedTier?.id ?? 0
  const artTier = tierById(ownedTier?.id ?? 1)
  const subject = artId === 0 ? START_SUBJECT : subjectForTier(artId)?.subject
  const accent = ERA_ACCENT[artTier?.era ?? "early"]
  const boosted = Boolean(activeBoost && activeBoost.endsAt > now)
  const stageName = ownedTier?.name ?? "High school"
  const boostLeft = activeBoost && boosted ? Math.max(0, activeBoost.endsAt - now) : 0

  const lastArt = useRef(artId)
  useEffect(() => {
    if (lastArt.current === artId) return
    lastArt.current = artId
    setEntered(true)
  }, [artId])

  useEffect(() => {
    return useGame.subscribe((state, previous) => {
      if (state.celebrationNonce === previous.celebrationNonce || state.celebrationNonce === 0) return
      if (prefersReducedMotion()) return
      setBits(burstBits(state.celebrationTierId))
      setRings((current) => [...current, { id: seq++, x: 50, y: 50, big: true }].slice(-12))
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

  function playImpact(nx: number, ny: number) {
    const tilt = tiltRef.current
    const img = imgRef.current
    if (!tilt || typeof tilt.animate !== "function") return
    for (const animation of tilt.getAnimations()) animation.cancel()
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
    img?.animate(
      [
        { filter: `brightness(${1.3 + heat.current * 0.3}) saturate(1.2)` },
        { filter: "brightness(1) saturate(1)" },
      ],
      { duration: 220, easing: "ease-out" },
    )
  }

  function fire(clientX: number | null, clientY: number | null) {
    const box = hitboxRef.current
    if (!box) return
    const gain = click()
    heat.current = Math.min(1, heat.current + 0.14)
    box.style.setProperty("--heat", heat.current.toFixed(3))

    const rect = box.getBoundingClientRect()
    const hasPoint = clientX !== null && clientY !== null && (clientX !== 0 || clientY !== 0)
    const px = hasPoint ? ((clientX - rect.left) / rect.width) * 100 : 50
    const py = hasPoint ? ((clientY - rect.top) / rect.height) * 100 : 45
    const x = Math.min(96, Math.max(4, px))
    const y = Math.min(96, Math.max(4, py))
    playImpact((x - 50) / 50, (y - 50) / 50)

    if (prefersReducedMotion()) {
      setPops((current) =>
        [...current, { id: seq++, x, y, drift: 0, text: `+$${formatNumber(gain.money)}`, kind: "money" as const }].slice(-12),
      )
      return
    }
    const drift = (Math.random() - 0.5) * 46
    setPops((current) =>
      [
        ...current,
        { id: seq++, x, y, drift, text: `+$${formatNumber(gain.money)}`, kind: "money" as const },
        { id: seq++, x: x + 10, y: y + 12, drift: drift * 0.5, text: `+${gain.xp} XP`, kind: "xp" as const },
      ].slice(-30),
    )
    setRings((current) => [...current, { id: seq++, x, y, big: false }].slice(-14))
    const dropX = hasPoint ? clientX : rect.left + rect.width / 2
    const dropY = hasPoint ? clientY : rect.top + rect.height * 0.45
    const born = stageDrops(dropX, dropY, spriteForTier(artId), boosted ? 3 : 2)
    setDrops((current) => [...current, ...born].slice(-36))
    window.setTimeout(() => {
      setDrops((current) => current.filter((item) => !born.some((drop) => drop.id === item.id)))
    }, DROP_MS + 120)
    setSparks((current) =>
      [...current, ...clickSparks(x, y, accent.glow, boosted ? 14 : 9)].slice(-90),
    )
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

  return (
    <section className={boosted ? "stage-panel is-boosted" : "stage-panel"} aria-label="Click stage">
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
      <button
        ref={hitboxRef}
        type="button"
        className="hitbox"
        data-testid="stage"
        onPointerDown={onPointerDown}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={`Click to earn. Current stage ${stageName}. ${subject ?? ""}`}
      >
        {boosted ? <span className="rim" aria-hidden="true" /> : null}
        <span className="aura" aria-hidden="true" />
        <span className="motes" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <i key={index} style={{ ["--i" as string]: index }} />
          ))}
        </span>
        <span className="sprite-bob">
          <span ref={tiltRef} className="sprite-tilt">
            <span className="sprite-frame">
              <img
                key={artId}
                ref={imgRef}
                className={entered ? "sprite sprite-enter" : "sprite"}
                src={spriteForTier(artId)}
                alt=""
                width={256}
                height={256}
                draggable={false}
              />
              <i className="sheen" aria-hidden="true" />
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
        {pops.map((pop) => (
          <span
            key={pop.id}
            className={`pop pop-${pop.kind}${boosted && pop.kind === "money" ? " pop-boosted" : ""}`}
            style={{ left: `${pop.x}%`, top: `${pop.y}%`, ["--drift" as string]: `${pop.drift}px` }}
            onAnimationEnd={() => setPops((current) => current.filter((item) => item.id !== pop.id))}
          >
            {pop.text}
          </span>
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
          {drops.map((drop) => (
            <img
              key={drop.id}
              className="drop"
              src={drop.src}
              alt=""
              draggable={false}
              style={{
                left: drop.x - drop.size / 2,
                top: drop.y - drop.size / 2,
                width: drop.size,
                height: drop.size,
                ["--dx" as string]: `${drop.dx}px`,
                ["--dy" as string]: `${drop.dy}px`,
                ["--rot" as string]: `${drop.rot}deg`,
              }}
            />
          ))}
        </div>,
        document.body,
      )}
      <div className="plate">
        <p className="era-tag">{ownedTier ? accent.kicker : "Before the offer"}</p>
        <h2>{stageName}</h2>
        <p className="subject">{subject}</p>
      </div>
    </section>
  )
}
