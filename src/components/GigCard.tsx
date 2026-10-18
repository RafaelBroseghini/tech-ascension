import { useEffect, useState } from "react"
import { GIGS } from "../data/phases.ts"
import { emojiIdleUrl } from "../data/emojiAssets.ts"
import { gigById } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

/** Continue is armed after this long, so a run of fast clicks cannot dismiss the card unread. */
export const GIG_CARD_ARM_MS = 900

/**
 * A cleared gig is a moment: the card stops the desk, shows the gig's art and what it paid, and waits for Continue.
 * Only the button closes it. No backdrop click, no Escape, no timer.
 */
export function GigCard() {
  const gigId = useGame((state) => state.gigCard)
  const dismiss = useGame((state) => state.dismissGigCard)
  // The gig whose card has waited out the arm delay. Continue is live once it matches the open card.
  const [armedId, setArmedId] = useState<number | null>(null)

  useEffect(() => {
    if (gigId === null) return
    const timer = window.setTimeout(() => setArmedId(gigId), GIG_CARD_ARM_MS)
    return () => window.clearTimeout(timer)
  }, [gigId])

  if (gigId === null) return null
  const gig = gigById(gigId)
  if (!gig) return null
  const art = emojiIdleUrl("gig", gig.id)
  const next = GIGS[gig.id]

  return (
    <div className="event-backdrop gig-backdrop" data-testid="gig-backdrop">
      <div className="event-modal gig-card" role="dialog" aria-modal="true" aria-labelledby="gig-card-title" data-testid="gig-card" data-gig={gig.id}>
        <p className="event-kicker">Gig cleared</p>
        {art ? <img className="gig-card-art" src={art} alt="" width={96} height={96} draggable={false} decoding="async" /> : null}
        <h2 id="gig-card-title" className="event-title">
          {gig.name}
        </h2>
        <ul className="event-lines" data-testid="gig-card-lines">
          <li className="event-line is-good">+${formatNumber(gig.lump)} paid</li>
          {gig.retainerCps > 0 ? <li className="event-line is-good">+${formatNumber(gig.retainerCps)}/s retainer</li> : null}
        </ul>
        {next ? <p className="event-flavor">Next on the board: {next.name}</p> : null}
        <div className="event-actions">
          <button type="button" className="event-choice event-yes" data-testid="gig-card-continue" disabled={armedId !== gigId} onClick={dismiss}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
