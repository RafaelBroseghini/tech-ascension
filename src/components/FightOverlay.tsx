import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react"
import { ENEMY_SIZE, enemySprite } from "../pixel/enemies.ts"
import { FIGHT_DURATION_MS, enemyById } from "../game/fight.ts"
import { production } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

const RESULT_MS = 2600

type Hit = { id: number; x: number; y: number; text: string }

let hitSeq = 1

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

function WinBanner() {
  const result = useGame((state) => state.fightResult)
  const dismiss = useGame((state) => state.dismissFightResult)
  const win = result?.kind === "win" ? result : null

  useEffect(() => {
    if (!win) return
    const id = window.setTimeout(dismiss, RESULT_MS)
    return () => window.clearTimeout(id)
  }, [win, dismiss])

  if (!win) return null
  const enemy = enemyById(win.enemyId)
  return (
    <div className="fight-win" role="status" data-testid="fight-win" key={win.id}>
      <img className="fight-win-sprite" src={enemySprite(win.enemyId)} alt="" width={ENEMY_SIZE} height={ENEMY_SIZE} draggable={false} />
      <p className="fight-win-kicker">Defeated</p>
      <p className="fight-win-name">{enemy?.name}</p>
      <p className="fight-win-reward">+${formatNumber(win.reward)}</p>
    </div>
  )
}

export function FightOverlay() {
  const fight = useGame((state) => state.fight)
  const now = useGame((state) => state.now)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const activeBoost = useGame((state) => state.activeBoost)
  const hit = useGame((state) => state.hit)
  const flee = useGame((state) => state.flee)
  const [hits, setHits] = useState<Hit[]>([])
  const spriteRef = useRef<HTMLImageElement>(null)
  const targetRef = useRef<HTMLButtonElement>(null)

  if (!fight) return <WinBanner />

  const enemy = enemyById(fight.enemyId)
  const left = Math.max(0, fight.endsAt - now)
  const damage = production({ skills, equipment, owned, jobs, gigs }, activeBoost, now).click
  const hpPct = Math.max(0, Math.min(100, (fight.hp / fight.maxHp) * 100))
  const timePct = Math.max(0, Math.min(100, (left / FIGHT_DURATION_MS) * 100))
  const urgent = left <= 8_000

  function strike(clientX: number | null, clientY: number | null) {
    const box = targetRef.current
    const rect = box?.getBoundingClientRect()
    hit()
    if (!rect || prefersReducedMotion()) return
    const hasPoint = clientX !== null && clientY !== null && (clientX !== 0 || clientY !== 0)
    const x = hasPoint ? ((clientX - rect.left) / rect.width) * 100 : 50
    const y = hasPoint ? ((clientY - rect.top) / rect.height) * 100 : 40
    setHits((current) => [...current, { id: hitSeq++, x, y, text: `-${formatNumber(damage)}` }].slice(-12))
    const img = spriteRef.current
    if (img && typeof img.animate === "function") {
      for (const animation of img.getAnimations()) animation.cancel()
      img.animate(
        [
          { transform: "translateX(0) scale(1)", filter: "brightness(1.7)" },
          { transform: "translateX(-6px) scale(0.97)", filter: "brightness(1.3)", offset: 0.3 },
          { transform: "translateX(4px) scale(1.02)", filter: "brightness(1)", offset: 0.6 },
          { transform: "translateX(0) scale(1)", filter: "brightness(1)" },
        ],
        { duration: 180, easing: "ease-out" },
      )
    }
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    strike(event.clientX, event.clientY)
  }

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) strike(null, null)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat && (event.key === " " || event.key === "Enter")) event.preventDefault()
  }

  return (
    <div className="fight" data-testid="fight" data-enemy={fight.enemyId} role="region" aria-label={`Fight: ${enemy?.name ?? "enemy"}`}>
      <header className="fight-head">
        <p className="fight-kicker">Rare encounter</p>
        <h3 className="fight-name">{enemy?.name}</h3>
      </header>
      <button
        ref={targetRef}
        type="button"
        className="fight-target"
        data-testid="fight-target"
        onPointerDown={onPointerDown}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={`Attack ${enemy?.name ?? "enemy"} for ${formatNumber(damage)} damage`}
      >
        <img
          ref={spriteRef}
          className="fight-sprite"
          src={enemySprite(fight.enemyId)}
          alt=""
          width={ENEMY_SIZE}
          height={ENEMY_SIZE}
          draggable={false}
        />
        {hits.map((item) => (
          <span
            key={item.id}
            className="fight-hit"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
            onAnimationEnd={() => setHits((current) => current.filter((entry) => entry.id !== item.id))}
          >
            {item.text}
          </span>
        ))}
      </button>
      <div className="fight-bars">
        <div className="fight-row">
          <span className="fight-label">HP</span>
          <div
            className="fight-bar fight-hp"
            role="progressbar"
            aria-label="Enemy HP"
            aria-valuemin={0}
            aria-valuemax={fight.maxHp}
            aria-valuenow={Math.ceil(fight.hp)}
            data-testid="fight-hp"
          >
            <i style={{ width: `${hpPct}%` }} />
          </div>
          <span className="fight-num">
            {formatNumber(Math.ceil(fight.hp))} / {formatNumber(fight.maxHp)}
          </span>
        </div>
        <div className="fight-row">
          <span className="fight-label">Time</span>
          <div className={urgent ? "fight-bar fight-time is-urgent" : "fight-bar fight-time"} aria-hidden="true">
            <i style={{ width: `${timePct}%` }} />
          </div>
          <span className="fight-num" data-testid="fight-timer">
            {Math.ceil(left / 1000)}s
          </span>
        </div>
      </div>
      <div className="fight-foot">
        <p className="fight-hint">
          Click to hit for <b>{formatNumber(damage)}</b>. Win pays <b>${formatNumber(enemy?.reward ?? 0)}</b>.
        </p>
        <button type="button" className="fight-flee" data-testid="fight-flee" onClick={flee}>
          Flee
        </button>
      </div>
    </div>
  )
}
