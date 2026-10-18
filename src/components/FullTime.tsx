import { founderOutlook, runwayShort } from "../game/founderOutlook.ts"
import { usersNeeded } from "../game/globe/track.ts"
import { formatNumber } from "../game/format.ts"
import { totalUsers } from "../game/globe/world.ts"
import { useGame } from "../game/store.ts"
import { openSurface } from "../game/surfaces.ts"

/**
 * The top bar's bet. Once the fork has been offered, a ladder career always has the red button: it reopens the choice (the card at the top
 * of the Company tab) and never quits in one click. A founder gets a chip with the runway instead, which opens the Company tab.
 */
export function FullTimeCell() {
  const offered = useGame((state) => state.founder.offered)
  const track = useGame((state) => state.founder.track)
  if (!offered) return null
  return track === "founder" ? <FounderChip /> : <NuclearButton />
}

function NuclearButton() {
  const product = useGame((state) => state.profile.product)
  const need = useGame((state) => usersNeeded(state.founder, totalUsers(state.company.users)))
  const open = useGame((state) => state.openFork)
  const shut = need !== null
  const reason = shut ? `Go full-time again at ${formatNumber(need)} users` : `Go full-time on ${product}`
  return (
    <div className="m-fork" title={reason} data-testid="fork-cell">
      <dt>Go full-time</dt>
      <dd>
        <button
          type="button"
          className="nuke"
          data-testid="go-full-time"
          aria-label={reason}
          aria-disabled={shut}
          title={reason}
          onClick={() => {
            if (shut) return
            open()
            openSurface("studio")
          }}
        >
          <span className="nuke-ring" aria-hidden>
            <span className="nuke-cap" />
          </span>
        </button>
      </dd>
    </div>
  )
}

function FounderChip() {
  const money = useGame((state) => state.money)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const founder = useGame((state) => state.founder)
  const company = useGame((state) => state.company)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const legacy = useGame((state) => state.legacy)
  const now = useGame((state) => state.now)
  const product = useGame((state) => state.profile.product)
  const outlook = founderOutlook({ money, equipment, owned, jobs, gigs, founder, company, foreverMult, tempMults, legacy }, now)
  const text = founder.broke ? "Out of cash" : outlook.runwaySec === null ? "Profitable" : `Runway ${runwayShort(outlook.runwaySec)}`
  const hot = founder.broke || (outlook.runwaySec !== null && outlook.runwaySec < 600)
  return (
    <div className={hot ? "m-fork m-founder is-hot" : "m-fork m-founder"} data-testid="founder-cell">
      <dt>Founder</dt>
      <dd>
        <button type="button" className="founder-chip" data-testid="founder-chip" title={`Founder of ${product}. Open the Company tab.`} onClick={() => openSurface("studio")}>
          {text}
        </button>
      </dd>
    </div>
  )
}
