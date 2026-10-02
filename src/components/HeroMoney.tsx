import { useEffect, useRef, useState } from "react"
import { xpPerClick } from "../game/economy.ts"
import { formatNumber, HERO_RAW_DIGITS_BELOW } from "../game/format.ts"
import { moneyMode } from "../game/phase.ts"
import { useGame } from "../game/store.ts"

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
  const buyStamp = useGame((state) => state.buyStamp)
  const pop = useGame((state) => state.pop)
  const paying = useGame((state) => moneyMode(state))
  const valueRef = useRef<HTMLSpanElement>(null)
  const shown = useScore(money)
  const text = formatNumber(shown, HERO_RAW_DIGITS_BELOW)

  useEffect(() => {
    const el = valueRef.current
    if (!pop || !el || typeof el.animate !== "function" || prefersReducedMotion()) return
    for (const animation of el.getAnimations()) animation.cancel()
    if (pop.size === "large") {
      el.animate(
        [
          { transform: "scale(1)", textShadow: "0 4px 0 #1a1c2c" },
          {
            transform: "scale(1.42, 0.78) rotate(-2deg)",
            textShadow: "-5px 0 #f38ba8, 5px 0 #89dceb, 0 4px 0 #1a1c2c",
            offset: 0.18,
          },
          {
            transform: "scale(0.9, 1.22) rotate(1.5deg)",
            textShadow: "-3px 0 #f38ba8, 3px 0 #89dceb, 0 4px 0 #1a1c2c",
            offset: 0.4,
          },
          { transform: "scale(1.08, 0.96)", textShadow: "-1px 0 #f38ba8, 1px 0 #89dceb, 0 4px 0 #1a1c2c", offset: 0.65 },
          { transform: "scale(1)", textShadow: "0 4px 0 #1a1c2c" },
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

  if (!paying) {
    return (
      <div className="hero-money" aria-live="off">
        <span className="hero-money-label">Study XP</span>
        <span data-testid="hero-xp" className="hero-money-value is-xp">
          {formatNumber(Math.floor(xp))}
        </span>
        <span className="hero-money-sub">+{formatNumber(xpPerClick(skills))} per click · money starts with your first gig</span>
      </div>
    )
  }

  return (
    <div className="hero-money" aria-live="off">
      <span className="hero-money-label">Money</span>
      <span
        key={buyStamp}
        ref={valueRef}
        data-testid="money"
        className={["hero-money-value", buyStamp > 0 ? "tick-up" : "", text.length > 11 ? "is-long" : ""].filter(Boolean).join(" ")}
      >
        ${text}
      </span>
    </div>
  )
}
