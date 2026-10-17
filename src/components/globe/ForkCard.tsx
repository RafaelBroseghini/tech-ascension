import { useMemo } from "react"
import { jobById, highestJobId } from "../../game/economy.ts"
import { formatNumber } from "../../game/format.ts"
import { founderOutlook, runwayWords } from "../../game/founderOutlook.ts"
import { BRIDGE_CUT, BRIDGE_MINUTES, burnOf, MAX_BRIDGES } from "../../game/globe/track.ts"
import { totalUsers } from "../../game/globe/world.ts"
import { useGame } from "../../game/store.ts"

const dollars = (n: number) => `$${formatNumber(n)}`

/**
 * The bet, as a card pinned at the top of the Company tab. On the ladder it appears the first time the fork is open, and again
 * from the red button: the trade in numbers from the real model, and two buttons. Out of runway it shows by itself and cannot
 * be waved away: raise a bridge or go back to a job. It blocks nothing and takes no focus. Nothing is applied until a button is pressed.
 */
export function ForkCard() {
  const broke = useGame((state) => state.founder.broke)
  const open = useGame((state) => state.forkModal && state.founder.track === "ladder")
  if (broke) return <OutOfRunway />
  return open ? <Fork /> : null
}

function useOutlook() {
  const money = useGame((state) => state.money)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const founder = useGame((state) => state.founder)
  const company = useGame((state) => state.company)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const now = useGame((state) => state.now)
  return useMemo(
    () =>
      founderOutlook(
        {
          money,
          equipment,
          owned,
          jobs,
          gigs,
          founder,
          company,
          foreverMult,
          tempMults,
        },
        now,
      ),
    [money, equipment, owned, jobs, gigs, founder, company, foreverMult, tempMults, now],
  )
}

function Fork() {
  const product = useGame((state) => state.profile.product)
  const quit = useGame((state) => state.goFullTime)
  const keep = useGame((state) => state.keepClimbing)
  const { offer } = useOutlook()
  const profitable = offer.runwaySec === null
  return (
    <section className="fork-card" role="region" aria-labelledby="fork-title" data-testid="fork-card">
      <p className="event-kicker">The fork</p>
      <h2 id="fork-title" className="event-title">
        {`Go full-time on ${product}?`}
      </h2>
      <ul className="event-lines" data-testid="fork-lines">
        <li className="event-line is-bad">{`Salary: −${dollars(offer.salary)}/s`}</li>
        <li className="event-line is-good">{`Product revenue: ${dollars(offer.revenueNow)}/s → ${dollars(offer.revenueFounder)}/s`}</li>
        <li className="event-line is-bad">{`Burn: −${dollars(offer.burn)}/s`}</li>
        <li className={`event-line ${profitable ? "is-good" : "is-bad"}`}>
          {profitable ? "Profitable from day one" : `Runway at today's numbers: ${runwayWords(offer.runwaySec ?? 0)}`}
        </li>
      </ul>
      <p className="event-flavor">{`Stay, and ${product} grows on nights and weekends: slowly.`}</p>
      <div className="event-actions fork-actions">
        <button type="button" className="event-choice event-yes" data-testid="fork-quit" onClick={() => void quit()}>
          Quit and go full-time
        </button>
        <button type="button" className="event-choice event-no" data-testid="fork-keep" onClick={keep}>
          Keep climbing
        </button>
      </div>
      <p className="event-flavor" data-testid="fork-hires-note">
        Hire people to catch up. The game will notice who did the work.
      </p>
    </section>
  )
}

function OutOfRunway() {
  const product = useGame((state) => state.profile.product)
  const bridges = useGame((state) => state.founder.bridges)
  const users = useGame((state) => totalUsers(state.company.users))
  const top = useGame((state) => highestJobId(state.jobs))
  const jobCount = useGame((state) => state.jobs.length)
  const raise = useGame((state) => state.raiseBridge)
  const back = useGame((state) => state.returnToLadder)
  const left = MAX_BRIDGES - bridges
  const cash = burnOf(users) * BRIDGE_MINUTES * 60
  const gives = top !== null && jobCount > 1 ? jobById(top)?.name : null
  return (
    <section className="fork-card is-broke" role="region" aria-labelledby="runway-title" data-testid="runway-card">
      <p className="event-kicker">Out of cash</p>
      <h2 id="runway-title" className="event-title">
        {`${product} ran out of runway`}
      </h2>
      <p className="event-flavor">The burn is paused. Nothing is lost: the users stay either way.</p>
      <ul className="event-lines" data-testid="runway-lines">
        <li className={`event-line ${left > 0 ? "is-good" : "is-neutral"}`}>
          {left > 0 ? `Bridge: +${dollars(cash)}, ${BRIDGE_MINUTES} minutes of burn` : "No bridges left"}
        </li>
        <li className="event-line is-bad">
          {left > 0 ? `Revenue: −${Math.round(BRIDGE_CUT * 100)}% for good` : "Investors have stopped taking calls"}
        </li>
        <li className="event-line is-neutral">{gives ? `A job again: give up ${gives}, one rung down` : "A job again: salary comes back"}</li>
      </ul>
      <div className="event-actions fork-actions">
        <button type="button" className="event-choice event-yes" data-testid="runway-bridge" disabled={left <= 0} onClick={() => void raise()}>
          {`Raise a bridge (${left} left, −${Math.round(BRIDGE_CUT * 100)}% revenue for good)`}
        </button>
        <button type="button" className="event-choice event-no" data-testid="runway-job" onClick={() => void back()}>
          Go back to a job
        </button>
      </div>
    </section>
  )
}
