import { MousePointerClick } from "lucide-react"
import { useEffect, useRef, useState, type RefObject } from "react"
import { GOLD_MULT_THRESHOLD } from "../data/boosts.ts"
import { production } from "../game/economy.ts"
import { modsOf, TEMP_TARGETS } from "../game/mods.ts"
import { formatMult, TARGET_LABEL } from "../game/events.ts"
import { formatFullNumber, formatMultiplier, formatNumber, RAW_DIGITS_BELOW } from "../game/format.ts"
import { clickPaysMoney } from "../game/phase.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { useDeskMoneyHeroDrag } from "./useDeskMoneyHeroDrag.ts"
import { useFeatureOpen } from "./useFeature.ts"

const COUNT_UP_MS = 720
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** easeOutBack: the running total overshoots its target by about a tenth of the jump, then settles. */
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/**
 * Money shown on screen. Normally the live balance. After a large pop (gig clear, phase unlock) it counts up
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

type HeroMoneyProps = {
  stagePanelRef: RefObject<HTMLElement | null>
}

/** How long a click boost lasts, for the bar under the multiplier. */
const BOOST_MS = 12000

/** The click boost, at the foot of the balance card: the multiplier and a bar for the time left. The only place a boost shows. */
function BoostFoot({ mult }: { mult: number }) {
  const left = useGame((state) => (state.activeBoost ? Math.max(0, state.activeBoost.endsAt - state.now) : 0))
  return (
    <span className="hero-boost" data-testid="hero-boost" aria-live="polite">
      <b>×{formatMultiplier(mult)}</b> click boost
      <i className="hero-boost-bar" style={{ ["--left" as string]: `${Math.min(100, (left / BOOST_MS) * 100)}%` }} aria-hidden />
    </span>
  )
}

/** Event multipliers, for good and for a while, under the balance. The timed ones count down. */
function HeroMods() {
  const now = useGame((state) => state.now)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const live = TEMP_TARGETS.filter((target) => (tempMults[target]?.endsAt ?? 0) > now)
  if (foreverMult === 1 && live.length === 0) return null
  return (
    <span className="hero-mods">
      {foreverMult !== 1 ? (
        <span className="hero-mod" title="Event bonus, for good">
          Event bonus <b data-testid="forever-mult">×{formatMult(foreverMult)}</b>
        </span>
      ) : null}
      {live.map((target) => {
        const entry = tempMults[target]!
        return (
          <span key={target} className="hero-mod is-timed" data-testid={`temp-${target}`}>
            {TARGET_LABEL[target]} <b>×{formatMult(entry.mult)}</b> · {Math.ceil((entry.endsAt - now) / 1000)}s
          </span>
        )
      })}
    </span>
  )
}

export function HeroMoney({ stagePanelRef }: HeroMoneyProps) {
  const drag = useDeskMoneyHeroDrag(stagePanelRef)
  // Derived so an idle tick does not re-render the card: only the boost starting or ending does.
  const boosted = useGame((state) => Boolean(state.activeBoost && state.activeBoost.endsAt > state.now))
  const mult = useGame((state) => state.activeBoost?.mult ?? 1)
  const gold = boosted && mult >= GOLD_MULT_THRESHOLD
  const dragStyle = drag.dragging
    ? undefined
    : { ["--hero-x" as string]: `${drag.offsetX}px`, ["--hero-y" as string]: `${drag.offsetY}px` }

  return (
    <div
      ref={drag.boxRef}
      className={["hero-money", drag.dragging ? "is-dragging" : "", boosted ? "is-boosted" : "", gold ? "is-gold" : ""].filter(Boolean).join(" ")}
      style={dragStyle}
      aria-live="off"
      aria-label="Money and XP. Drag to reposition."
      draggable={false}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
    >
      <HeroMoneyBody />
      <HeroMods />
      {boosted ? <BoostFoot mult={mult} /> : null}
    </div>
  )
}

function HeroMoneyBody() {
  const money = useGame((state) => state.money)
  const xp = useGame((state) => state.xp)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const founder = useGame((state) => state.founder)
  const activeBoost = useGame((state) => state.activeBoost)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const legacy = useGame((state) => state.legacy)
  const now = useGame((state) => state.now)
  const buyStamp = useGame((state) => state.buyStamp)
  const pop = useGame((state) => state.pop)
  const valueRef = useRef<HTMLSpanElement>(null)
  const squash = useRef<Animation | null>(null)
  const shownMoney = useScore(money)
  const shownXp = Math.floor(xp)
  const moneyText = formatNumber(shownMoney)
  const fullMoney = formatFullNumber(shownMoney)
  const fullXp = formatFullNumber(shownXp)
  const showFullMoney = shownMoney >= RAW_DIGITS_BELOW
  const paysClickMoney = clickPaysMoney({ jobs })
  // Until the first dollar the card is about XP: no "$0" for money that cannot be earned yet.
  const moneyOpen = useFeatureOpen("money")
  const rates = production({ skills, equipment, owned, jobs, gigs, founder }, activeBoost, now, modsOf({ foreverMult, tempMults, legacy }))

  useEffect(() => {
    const el = valueRef.current
    if (!pop || !el || typeof el.animate !== "function" || prefersReducedMotion()) return
    // Only the last squash can still be running. getAnimations() would flush style on every click.
    const last = squash.current
    if (last) {
      last.finished.catch(() => {})
      last.cancel()
    }
    if (pop.size === "large") {
      squash.current = el.animate(
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
    squash.current = el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.14, 0.9)", offset: 0.3 },
        { transform: "scale(0.97, 1.06)", offset: 0.62 },
        { transform: "scale(1)" },
      ],
      { duration: 190, easing: "ease-out" },
    )
  }, [pop])

  if (!moneyOpen) {
    return (
      <>
        <span className="hero-money-value hero-xp-value" data-testid="hero-xp">
          {formatNumber(shownXp)} XP
        </span>
        {shownXp >= RAW_DIGITS_BELOW ? <span className="hero-money-full hero-money-full-xp">{fullXp} XP</span> : null}
        <span className="hero-money-sub">
          <MousePointerClick className="hero-money-click-icon" {...UI_ICON} aria-hidden />+{formatNumber(rates.xpClick * rates.mult)} XP per click
        </span>
      </>
    )
  }

  return (
    <>
      <span
        key={buyStamp}
        ref={valueRef}
        data-testid="money"
        data-feature-anchor="money"
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
    </>
  )
}
