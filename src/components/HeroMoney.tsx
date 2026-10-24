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
import { motionReady, playing, prefersReducedMotion, tickUp } from "./useMotion.ts"
import type { Playing } from "./useMotion.ts"

const COUNT_UP_S = 0.72

/**
 * Money shown on screen. Normally the live balance. After a large pop (gig clear, phase unlock) it counts up
 * from the pre-payout balance with overshoot, so the lump feels like it lands. Idle ticks never animate.
 * Motion tweens the progress (0 to 1, backOut so it overshoots by about a tenth of the jump); the goal is read each
 * frame, so income that lands during the count is not lost.
 */
function useScore(target: number): number {
  const pop = useGame((state) => state.pop)
  const targetRef = useRef(target)
  useEffect(() => {
    targetRef.current = target
  })
  const [tween, setTween] = useState<number | null>(null)
  // The pop whose count-up has ended. Until then the number reads from the pre-payout balance, even in the frame
  // before the first tween value, so the full payout never shows early.
  const [ended, setEnded] = useState(0)
  // Without Motion (not loaded yet, or an offline chunk) the balance simply reads true.
  const counting = pop !== null && pop.size === "large" && pop.amount > 0 && pop.id !== ended && motionReady() !== null && !prefersReducedMotion()

  useEffect(() => {
    const motion = motionReady()
    if (!pop || !motion || pop.size !== "large" || !(pop.amount > 0) || prefersReducedMotion()) return
    const from = Math.max(0, targetRef.current - pop.amount)
    const run = motion.animate(0, 1, {
      duration: COUNT_UP_S,
      ease: "backOut",
      onUpdate: (progress) => setTween(from + (targetRef.current - from) * progress),
      onComplete: () => {
        setTween(null)
        setEnded(pop.id)
      },
    })
    return () => {
      run.stop()
      setTween(null)
    }
  }, [pop])

  if (!counting) return target
  return Math.max(0, Math.floor(tween ?? Math.max(0, target - pop.amount)))
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
      <i className="hero-boost-bar" style={{ transform: `scaleX(${Math.min(1, left / BOOST_MS)})` }} aria-hidden />
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
  const build = useGame((state) => state.build)
  const gigs = useGame((state) => state.gigs)
  const activeBoost = useGame((state) => state.activeBoost)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const legacy = useGame((state) => state.legacy)
  const now = useGame((state) => state.now)
  const buyStamp = useGame((state) => state.buyStamp)
  const pop = useGame((state) => state.pop)
  const valueRef = useRef<HTMLSpanElement>(null)
  const squash = useRef<Playing | null>(null)
  const tick = useRef<Playing | null>(null)
  const shownMoney = useScore(money)
  const shownXp = Math.floor(xp)
  const moneyText = formatNumber(shownMoney)
  const fullMoney = formatFullNumber(shownMoney)
  const fullXp = formatFullNumber(shownXp)
  const showFullMoney = shownMoney >= RAW_DIGITS_BELOW
  const paysClickMoney = clickPaysMoney({ jobs })
  // Until the first dollar the card is about XP: no "$0" for money that cannot be earned yet.
  const moneyOpen = useFeatureOpen("money")
  const rates = production({ skills, equipment, owned, jobs, gigs, build }, activeBoost, now, modsOf({ skills, equipment, owned, jobs, gigs, foreverMult, tempMults, legacy }))

  // A purchase ticks the balance: the digits roll up from below and flash the accent.
  useEffect(() => {
    const el = valueRef.current
    if (!el || buyStamp === 0) return
    // The tick and the squash both move the number's transform, so the newer of the two takes it over.
    squash.current?.finish()
    tick.current?.finish()
    tick.current = tickUp(el)
  }, [buyStamp])

  useEffect(() => {
    const el = valueRef.current
    // Never waits for Motion: a pop before its chunk lands just goes without the squash.
    const motion = pop && el ? motionReady() : null
    if (!pop || !el || !motion || prefersReducedMotion()) return
    squash.current?.finish()
    tick.current?.finish()
    if (pop.size === "large") {
      // The chromatic split has the same three shadows at every step so Motion can tween between them.
      const split = (px: number) => `${-px}px 0 0 var(--ide-red), ${px}px 0 0 var(--ide-sky), 0 4px 0 var(--ink)`
      const play = motion.animate(
        el,
        {
          scaleX: [1, 1.42, 0.9, 1.08, 1],
          scaleY: [1, 0.78, 1.22, 0.96, 1],
          rotate: [0, -2, 1.5, 0, 0],
          textShadow: [split(0), split(5), split(3), split(1), split(0)],
        },
        { duration: 0.62, times: [0, 0.18, 0.4, 0.65, 1], ease: [0.25, 0.9, 0.3, 1] },
      )
      squash.current = playing(el, [play])
      return
    }
    const play = motion.animate(el, { scaleX: [1, 1.14, 0.97, 1], scaleY: [1, 0.9, 1.06, 1] }, { duration: 0.19, times: [0, 0.3, 0.62, 1], ease: "easeOut" })
    squash.current = playing(el, [play])
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
        ref={valueRef}
        data-testid="money"
        data-feature-anchor="money"
        className={["hero-money-value", moneyText.length > 11 ? "is-long" : ""].filter(Boolean).join(" ")}
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
