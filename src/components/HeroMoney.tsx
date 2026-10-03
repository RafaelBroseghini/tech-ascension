import { MousePointerClick } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { production } from "../game/economy.ts"
import { modsOf } from "../game/mods.ts"
import { formatFullNumber, formatNumber, RAW_DIGITS_BELOW } from "../game/format.ts"
import { clickPaysMoney } from "../game/phase.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON } from "./icons/ui.tsx"

const COUNT_UP_MS = 720
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** easeOutBack: the running total overshoots its target by about a tenth of the jump, then settles. */
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/**
 * Money shown on screen. Normally the live balance. After a large pop (gig clear, fight win) it counts up
 * from the pre-payout balance with overshoot, so the lump feels like it lands. Idle ticks never animate.
 */
function useScore(target: number): number {
  const pop = useGame((state) => state.pop)
  const targetRef = useRef(target)
  useEffect(() => {
    targetRef.current = target
  })
  const [tween, setTween] = useState<{ id: number; value: number } | null>(null)
  const frame = useRef(0)

  useEffect(() => {
    if (!pop || pop.size !== "large" || !(pop.amount > 0) || prefersReducedMotion()) return
    const from = Math.max(0, targetRef.current - pop.amount)
    const start = performance.now()
    const step = (nowMs: number) => {
      const t = Math.min(1, (nowMs - start) / COUNT_UP_MS)
      const goal = targetRef.current
      setTween({ id: pop.id, value: from + (goal - from) * easeOutBack(t) })
      if (t < 1) frame.current = requestAnimationFrame(step)
      else setTween(null)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [pop])

  return tween ? Math.max(0, Math.floor(tween.value)) : target
}

export function HeroMoney() {
  const money = useGame((state) => state.money)
  const xp = useGame((state) => state.xp)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const activeBoost = useGame((state) => state.activeBoost)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const now = useGame((state) => state.now)
  const buyStamp = useGame((state) => state.buyStamp)
  const pop = useGame((state) => state.pop)
  const valueRef = useRef<HTMLSpanElement>(null)
  const shownMoney = useScore(money)
  const shownXp = Math.floor(xp)
  const moneyText = formatNumber(shownMoney)
  const fullMoney = formatFullNumber(shownMoney)
  const fullXp = formatFullNumber(shownXp)
  const showFullMoney = shownMoney >= RAW_DIGITS_BELOW
  const paysClickMoney = clickPaysMoney({ jobs })
  const rates = production({ skills, equipment, owned, jobs, gigs }, activeBoost, now, modsOf({ foreverMult, tempMults }))

  useEffect(() => {
    const el = valueRef.current
    if (!pop || !el || typeof el.animate !== "function" || prefersReducedMotion()) return
    for (const animation of el.getAnimations()) {
      animation.finished.catch(() => {})
      animation.cancel()
    }
    if (pop.size === "large") {
      el.animate(
        [
          { transform: "scale(1)", textShadow: "0 4px 0 var(--ink)" },
          {
            transform: "scale(1.42, 0.78) rotate(-2deg)",
            textShadow: "-5px 0 var(--ide-red), 5px 0 var(--ide-sky), 0 4px 0 var(--ink)",
            offset: 0.18,
          },
          {
            transform: "scale(0.9, 1.22) rotate(1.5deg)",
            textShadow: "-3px 0 var(--ide-red), 3px 0 var(--ide-sky), 0 4px 0 var(--ink)",
            offset: 0.4,
          },
          { transform: "scale(1.08, 0.96)", textShadow: "-1px 0 var(--ide-red), 1px 0 var(--ide-sky), 0 4px 0 var(--ink)", offset: 0.65 },
          { transform: "scale(1)", textShadow: "0 4px 0 var(--ink)" },
        ],
        { duration: 620, easing: "cubic-bezier(0.25, 0.9, 0.3, 1)" },
      )
      return
    }
    el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.14, 0.9)", offset: 0.3 },
        { transform: "scale(0.97, 1.06)", offset: 0.62 },
        { transform: "scale(1)" },
      ],
      { duration: 190, easing: "ease-out" },
    )
  }, [pop])

  return (
    <div className="hero-money" aria-live="off" aria-label="Money">
      <span
        key={buyStamp}
        ref={valueRef}
        data-testid="money"
        className={["hero-money-value", buyStamp > 0 ? "tick-up" : "", moneyText.length > 11 ? "is-long" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        ${moneyText}
      </span>
      {showFullMoney ? (
        <span className="hero-money-full" data-testid="money-full">
          ${fullMoney}
        </span>
      ) : null}
      <span className="hero-money-full hero-money-full-xp" data-testid="xp-full">
        {fullXp} XP
      </span>
      <span className="hero-money-sub">
        <MousePointerClick className="hero-money-click-icon" {...UI_ICON} aria-hidden />
        {paysClickMoney ? (
          <>
            +${formatNumber(rates.click)} · +{formatNumber(rates.xpClick * rates.mult)} XP
          </>
        ) : (
          <>+{formatNumber(rates.xpClick * rates.mult)} XP per click</>
        )}
      </span>
    </div>
  )
}
