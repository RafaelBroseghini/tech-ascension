import { useEffect, useState } from "react"
import type { MouseEvent } from "react"
import { ERA_ACCENT, spriteForTier, subjectForTier } from "../data/sprites.ts"
import { highestOwnedTier, tierById } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

type Pop = {
  id: number
  x: number
  y: number
  text: string
  kind: "money" | "xp"
}

type Bit = {
  id: number
  x: number
  dx: number
  dy: number
  rot: number
  color: string
}

let popSeq = 1
let bitSeq = 1

function burstBits(tierId: number): Bit[] {
  const tier = tierById(tierId)
  const glow = ERA_ACCENT[tier?.era ?? "early"].glow
  const colors = [glow, "#d6f25c", "#f4efe4", "#ff7a59", "#5aa7ff"]
  return Array.from({ length: 18 }, () => {
    const angle = Math.random() * Math.PI * 2
    const dist = 40 + Math.random() * 90
    return {
      id: bitSeq++,
      x: 40 + Math.random() * 20,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 20,
      rot: Math.random() * 240 - 120,
      color: colors[Math.floor(Math.random() * colors.length)] ?? glow,
    }
  })
}

export function Stage() {
  const owned = useGame((state) => state.owned)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const click = useGame((state) => state.click)
  const [punching, setPunching] = useState(false)
  const [pops, setPops] = useState<Pop[]>([])
  const [bits, setBits] = useState<Bit[]>([])

  useEffect(() => {
    return useGame.subscribe((state, previous) => {
      if (state.celebrationNonce === previous.celebrationNonce || state.celebrationNonce === 0) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      setBits(burstBits(state.celebrationTierId))
    })
  }, [])

  const ownedTier = highestOwnedTier(owned)
  const artId = ownedTier?.id ?? 1
  const artTier = tierById(artId)
  const subject = subjectForTier(artId)
  const accent = ERA_ACCENT[artTier?.era ?? "early"]
  const boosted = Boolean(activeBoost && activeBoost.endsAt > now)
  const stageName = ownedTier?.name ?? "High school"

  function playPunch() {
    setPunching(false)
    window.requestAnimationFrame(() => setPunching(true))
  }

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const gain = click()
    playPunch()
    const rect = event.currentTarget.getBoundingClientRect()
    const hasPoint = event.clientX !== 0 || event.clientY !== 0
    const x = hasPoint ? ((event.clientX - rect.left) / rect.width) * 100 : 50
    const y = hasPoint ? ((event.clientY - rect.top) / rect.height) * 100 : 42
    const moneyId = popSeq++
    const xpId = popSeq++
    setPops((current) =>
      [
        ...current,
        { id: moneyId, x, y, text: `+$${formatNumber(gain.money)}`, kind: "money" as const },
        { id: xpId, x: x + 8, y: y + 10, text: `+${gain.xp} XP`, kind: "xp" as const },
      ].slice(-24),
    )
  }

  return (
    <section className="stage-panel" aria-label="Click stage">
      <button
        type="button"
        className="hitbox"
        data-testid="stage"
        onClick={onClick}
        aria-label={`Click to earn. Current stage ${stageName}. ${subject?.subject ?? ""}`}
      >
        <span className="sprite-bob">
          <img
            className={["sprite", punching ? "punch" : "", boosted ? "boosted" : ""].filter(Boolean).join(" ")}
            src={spriteForTier(artId)}
            alt=""
            width={256}
            height={256}
            draggable={false}
            onAnimationEnd={(event) => {
              if (event.animationName === "squash" || event.animationName === "punch-min") {
                setPunching(false)
              }
            }}
          />
        </span>
        {pops.map((pop) => (
          <span
            key={pop.id}
            className={`pop pop-${pop.kind}`}
            style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
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
      <p className="eyebrow">{ownedTier ? accent.kicker : "Before the offer"}</p>
      <h2>{stageName}</h2>
      <p className="subject">{subject?.subject}</p>
    </section>
  )
}
