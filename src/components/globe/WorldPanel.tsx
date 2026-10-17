import { memo } from "react"
import { REGIONS } from "../../data/regions.ts"
import { formatNumber } from "../../game/format.ts"
import type { Company } from "../../game/globe/company.ts"
import { ceilingOf, incidentCost, INCIDENTS, regionName, WORLD_TARGET } from "../../game/globe/world.ts"
import { winMultOf } from "../../game/globe/track.ts"
import { founderOutlook } from "../../game/founderOutlook.ts"
import { earnedPerSec, useGame } from "../../game/store.ts"
import { nextStep } from "./nextStep.ts"

const money = (n: number) => `$${formatNumber(n)}`
const users = (n: number) => formatNumber(Math.round(n))

/** The conquest: users against the seven billion, where they are, how hard the world pushes back, and what it has thrown. */
export const WorldPanel = memo(function WorldPanel({ company }: { company: Company }) {
  const cash = useGame((state) => state.money)
  const perSec = useGame((state) => earnedPerSec(state, state.now))
  const respond = useGame((state) => state.respondIncident)
  const bar = Math.min(100, company.share * 100)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const founder = useGame((state) => state.founder)
  const raw = useGame((state) => state.company)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const now = useGame((state) => state.now)
  const outlook = founderOutlook({ money: cash, equipment, owned, jobs, gigs, founder, company: raw, foreverMult, tempMults }, now)
  const next = nextStep(company, founder.track === "founder" && !founder.broke ? { net: outlook.net, runwaySec: outlook.runwaySec } : undefined)
  return (
    <section className="world" data-testid="company-world" aria-label="The world">
      <p className={`world-next is-${next.tone}`} data-testid="world-next">
        {next.text}
      </p>
      <header className="world-head">
        <div>
          <small>Users</small>
          <b data-testid="world-users">{users(company.users)}</b>
          <span>{`of ${users(WORLD_TARGET)}, ${(company.share * 100).toFixed(company.share < 0.1 ? 3 : 1)}%`}</span>
        </div>
        <div className={`world-resistance${company.resistance > 66 ? " is-hot" : company.resistance > 33 ? " is-warm" : ""}`} data-testid="world-resistance">
          <small>Resistance</small>
          <b>{company.resistance < 1 ? "Calm" : `${Math.round(company.resistance)}%`}</b>
          <i aria-hidden style={{ width: `${company.resistance}%` }} />
        </div>
      </header>
      <div className="world-bar" role="img" aria-label={`${bar.toFixed(1)}% of the way to ${users(WORLD_TARGET)} users`}>
        <i style={{ width: `${bar}%` }} />
      </div>
      {company.won ? (
        <p className="world-won" data-testid="world-won">
          {`Everything you earn is ×${winMultOf(founder.track)} for good.`}
        </p>
      ) : null}
      <ul className="world-regions" data-testid="world-regions">
        {REGIONS.map((region) => {
          const here = company.regionUsers[region.id] ?? 0
          const held = company.regions.includes(region.id)
          return (
            <li key={region.id} data-region={region.id} data-bought={held ? "true" : "false"}>
              <span>{region.name}</span>
              <i style={{ width: `${Math.min(100, (here / ceilingOf(region.id)) * 100)}%` }} aria-hidden />
              <b>{users(here)}</b>
            </li>
          )
        })}
      </ul>
      {company.incidents.length > 0 ? (
        <ul className="world-incidents" data-testid="world-incidents">
          {company.incidents.map((incident) => {
            const label = INCIDENTS[incident.kind]
            const cost = incidentCost(incident, perSec, cash)
            return (
              <li key={incident.id} data-incident={incident.kind}>
                <strong>{label.name}</strong>
                <span>{label.line(regionName(incident.region))}</span>
                <button type="button" disabled={cash < cost} onClick={() => respond(incident.id)}>
                  {`Respond · ${money(cost)}`}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
})
