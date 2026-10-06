import { useEffect, useRef, useState } from "react"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"
import type { MoneyPop } from "../game/store.ts"

const HOLD_MS = 1500

const KICKER: Record<MoneyPop["kind"], string> = {
  click: "",
  gigClear: "Gig cleared",
  unlock: "Unlocked",
  milestone: "Output doubled",
}

/** The big line: dollars for a payout, the new multiplier for an output milestone, else the label itself. */
function headline(pop: MoneyPop): string | null {
  if (pop.kind === "milestone") return `×${formatNumber(pop.mult ?? 2)}`
  return pop.amount > 0 ? `+$${formatNumber(pop.amount)}` : null
}

/**
 * The big centered Balatro pop. It only shows for large pops (gig clear, phase unlock, output milestone);
 * a medium click pop is just the hero total squashing, and idle ticks never get here.
 */
export function ScorePop() {
  const [live, setLive] = useState<MoneyPop | null>(null)
  const timer = useRef(0)

  // Subscribed to the store rather than derived from `pop`: medium click pops replace the large one in
  // the store long before it has finished playing, and must not cut it short.
  useEffect(() => {
    const unsubscribe = useGame.subscribe((state, previous) => {
      const pop = state.pop
      if (!pop || pop === previous.pop || pop.size !== "large") return
      setLive(pop)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setLive(null), HOLD_MS)
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer.current)
    }
  }, [])

  if (!live) return null
  const big = headline(live)
  return (
    <div className="score-pop" role="status" data-testid="score-pop" data-kind={live.kind} key={live.id}>
      <span className="score-pop-kicker">{KICKER[live.kind]}</span>
      {big ? (
        <span className="score-pop-amount" data-text={big}>
          {big}
        </span>
      ) : (
        <span className="score-pop-amount is-title" data-text={live.label}>
          {live.label}
        </span>
      )}
      {big && live.label ? <span className="score-pop-label">{live.label}</span> : null}
    </div>
  )
}
