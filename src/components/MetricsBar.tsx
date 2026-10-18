import { memo } from "react"
import { GOLD_MULT_THRESHOLD } from "../data/boosts.ts"
import { CornerActions } from "./CornerActions.tsx"
import { production } from "../game/economy.ts"
import { formatMult, TARGET_LABEL } from "../game/events.ts"
import { TEMP_TARGETS } from "../game/mods.ts"
import { modsOf } from "../game/mods.ts"
import { formatMultiplier, formatNumber } from "../game/format.ts"
import { servingOf } from "../game/globe/load.ts"
import { productRevenueOf } from "../game/globe/track.ts"
import { totalUsers, WORLD_TARGET } from "../game/globe/world.ts"
import { clickPaysMoney, PHASE_NAME } from "../game/phase.ts"
import { openSurface } from "../game/surfaces.ts"
import { useGame } from "../game/store.ts"
import { FullTimeCell } from "./FullTime.tsx"
import { useFeatureOpen } from "./useFeature.ts"

// The bar follows XP and the clock every tick; the buttons on its right do not.
const CornerActionsMemo = memo(CornerActions)

export function MetricsBar() {
  const xp = useGame((state) => state.xp)
  const phase = useGame((state) => state.phase)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const founder = useGame((state) => state.founder)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const legacy = useGame((state) => state.legacy)
  const rates = production({ skills, equipment, owned, jobs, gigs, founder }, activeBoost, now, modsOf({ foreverMult, tempMults, legacy }))
  // clickPower is $1 before any gear, but a click does not pay that dollar until the first job.
  const paidClick = clickPaysMoney({ jobs }) ? rates.click : 0
  const worldOpen = useFeatureOpen("studio")
  const company = useGame((state) => state.company)
  const users = totalUsers(company.users)
  const incidents = company.incidents.length
  const perSec = rates.idle + productRevenueOf(servingOf(company.users, company.incidents, equipment).revenuePerSec, founder, legacy.perks)
  const product = useGame((state) => state.profile.product)
  const seconds =
    activeBoost && activeBoost.endsAt > now ? Math.ceil((activeBoost.endsAt - now) / 1000) : 0

  return (
    <header className="topbar">
      <div className="brand">
        <p className="eyebrow">Career clicker</p>
        <h1>Tech Ascension</h1>
      </div>
      <dl className="metrics">
        <div className="m-phase">
          <dt>Phase {phase}</dt>
          <dd data-testid="phase">{PHASE_NAME[phase]}</dd>
        </div>
        {perSec > 0 ? (
          <div className="metric-in m-rate">
            <dt>$ / Second</dt>
            <dd data-testid="per-sec">${formatNumber(perSec)}</dd>
          </div>
        ) : null}
        {clickPaysMoney({ jobs }) ? (
          <div className="metric-in m-rate">
            <dt>$/click</dt>
            <dd data-testid="per-click">${formatNumber(paidClick)}</dd>
          </div>
        ) : null}
        <div className="m-xp-rate">
          <dt>XP/click</dt>
          <dd data-testid="xp-per-click">{formatNumber(rates.xpClick * rates.mult)}</dd>
        </div>
        {rates.xpIdle > 0 ? (
          <div className="metric-in m-xp-rate">
            <dt>XP/s</dt>
            <dd data-testid="xp-per-sec">{formatNumber(rates.xpIdle)}</dd>
          </div>
        ) : null}
        <div className="m-xp">
          <dt>XP</dt>
          <dd data-testid="xp">{formatNumber(Math.floor(xp))}</dd>
        </div>
        {seconds > 0 ? (
          <div className={rates.mult >= GOLD_MULT_THRESHOLD ? "m-boost m-click-boost is-gold" : "m-boost m-click-boost"}>
            <dt>Click boost</dt>
            <dd data-testid="boost">
              ×{formatMultiplier(rates.mult)} · {seconds}s
            </dd>
          </div>
        ) : null}
        {foreverMult !== 1 ? (
          <div className="m-boost">
            <dt>Event bonus</dt>
            <dd data-testid="forever-mult">x{formatMult(foreverMult)}</dd>
          </div>
        ) : null}
        {TEMP_TARGETS.map((target) => {
          const entry = tempMults[target]
          if (!entry || !(entry.endsAt > now)) return null
          return (
            <div key={target} className="m-boost">
              <dt>{TARGET_LABEL[target]}</dt>
              <dd data-testid={`temp-${target}`}>
                x{formatMult(entry.mult)} · {Math.ceil((entry.endsAt - now) / 1000)}s
              </dd>
            </div>
          )
        })}
        {worldOpen ? (
          <div className={incidents > 0 ? "m-world is-hot" : "m-world"}>
            <dt>{incidents > 0 ? `${product} · ${incidents} incident${incidents === 1 ? "" : "s"}` : product}</dt>
            <dd>
              <button type="button" className="m-world-open" data-testid="world-users" title={product} onClick={() => openSurface("studio")}>
                {users > 0 ? formatNumber(Math.floor(users), 1000) : "0"}
                <small> / {formatNumber(WORLD_TARGET, 1000)}</small>
                <span className="m-world-bar" aria-hidden>
                  <i style={{ width: `${Math.min(100, Math.max(users > 0 ? 2 : 0, (users / WORLD_TARGET) * 100))}%` }} />
                </span>
              </button>
            </dd>
          </div>
        ) : null}
        <FullTimeCell />
      </dl>
      <CornerActionsMemo />
    </header>
  )
}
