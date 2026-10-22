import { memo } from "react"
import type { LeadId } from "../../data/leadership.ts"
import { REGIONS } from "../../data/regions.ts"
import { formatNumber } from "../../game/format.ts"
import type { Company } from "../../game/globe/company.ts"
import { ceilingOf, incidentCost, INCIDENTS, regionName, WIN_MULT, WORLD_TARGET } from "../../game/globe/world.ts"
import { creditOf, headcountOf, hirePayrollOf, winNote } from "../../game/globe/hires.ts"
import type { Hires } from "../../game/globe/hires.ts"
import { earnedPerSec, useGame } from "../../game/store.ts"
import { nextStep } from "./nextStep.ts"

const money = (n: number) => `$${formatNumber(n)}`
const users = (n: number) => formatNumber(Math.round(n))

/** The team as the Company tab shows it: a line, since hiring and firing are in the Jobs tab. */
function TeamNote({ hires, lead, share }: { hires: Hires; lead: LeadId | null; share: number }) {
  const heads = headcountOf(hires)
  const percent = Math.round(share * 100)
  return (
    <section className="world-team world-team-note" data-testid="world-team-note" aria-label="Team">
      <h4>{`Team · ${formatNumber(heads)} hired · ${money(hirePayrollOf(hires))}/s`}</h4>
      <p>{lead === "manager" || heads > 0 ? "Hire and let people go in the Jobs tab." : "Hiring is the Manager's: lead as a Manager in the Jobs tab."}</p>
      {share > 0 ? <p className="world-credit" data-testid="world-credit">{`Your team grew ${percent < 1 ? "under 1" : percent}% of the users`}</p> : null}
    </section>
  )
}

/** The conquest: users against the eight billion, where they are, how hard the world pushes back, and what it has thrown. */
export const WorldPanel = memo(function WorldPanel({ company }: { company: Company }) {
  const cash = useGame((state) => state.money)
  const perSec = useGame((state) => earnedPerSec(state, state.now))
  const respond = useGame((state) => state.respondIncident)
  const bar = Math.min(100, company.share * 100)
  const hires = useGame((state) => state.hires)
  const build = useGame((state) => state.build)
  const raw = useGame((state) => state.company)
  const next = nextStep(company)
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
          <i aria-hidden style={{ transform: `scaleX(${company.resistance / 100})` }} />
        </div>
      </header>
      <div className="world-bar" role="img" aria-label={`${bar.toFixed(1)}% of the way to ${users(WORLD_TARGET)} users`}>
        <i style={{ transform: `scaleX(${bar / 100})` }} />
      </div>
      {company.won ? (
        <p className="world-won" data-testid="world-won">
          {winNote(raw.ending, WIN_MULT)}
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
      <TeamNote hires={hires} lead={build.leadership ?? null} share={creditOf(raw).hiredShare} />
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
