import { memo } from "react"
import { REGIONS } from "../../data/regions.ts"
import { formatNumber } from "../../game/format.ts"
import type { Company } from "../../game/globe/company.ts"
import { ceilingOf, incidentCost, INCIDENTS, regionName, WORLD_TARGET } from "../../game/globe/world.ts"
import { creditOf, headcountOf, hireCost, hireCount, hireGrowthStep, hirePayrollOf, MAX_HIRES, openHires, winNote } from "../../game/globe/hires.ts"
import type { Hires } from "../../game/globe/hires.ts"
import type { BuyAmount } from "../../game/gold.ts"
import { winMultOf } from "../../game/globe/track.ts"
import { founderOutlook } from "../../game/founderOutlook.ts"
import { earnedPerSec, useGame } from "../../game/store.ts"
import { nextStep } from "./nextStep.ts"

const money = (n: number) => `$${formatNumber(n)}`
/** A share of the growth multiplier, in percent, to two significant digits. */
const growth = (n: number) => {
  const pct = n * 100
  return pct >= 10 ? pct.toFixed(0) : pct >= 1 ? pct.toFixed(1) : pct.toFixed(2)
}
const users = (n: number) => formatNumber(Math.round(n))

/** The people on the payroll, a row for each kind that is open, and how much of the crowd they brought. */
function Team({ hires, ladder, cash, share, amount, onHire }: { hires: Hires; ladder: boolean; cash: number; share: number; amount: BuyAmount; onHire: (id: string) => boolean }) {
  const percent = Math.round(share * 100)
  return (
    <section className="world-team" data-testid="world-team" aria-label="Team">
      <h4>{`Team · ${formatNumber(headcountOf(hires))} hired · ${money(hirePayrollOf(hires))}/s`}</h4>
      <ul className="world-hired" data-testid="world-hired">
        {openHires(hires).map((row) => {
          const held = hires[row.id] ?? 0
          const count = hireCount(row, held, cash, amount)
          const buying = Math.max(1, count || (amount === "max" ? 1 : amount))
          const cost = hireCost(row, held, Math.min(buying, MAX_HIRES - held))
          return (
            <li key={row.id} className="world-hire" data-hire={row.id} data-testid={`world-hire-${row.id}`}>
              <span>
                <strong>{row.name}</strong>
                {`${formatNumber(held)} hired · −${money(held * row.salary)}/s`}
                <small>{`each: −${money(row.salary)}/s · +${growth(hireGrowthStep(row, held))}% growth`}</small>
              </span>
              <button type="button" disabled={!ladder || count < 1} title={ladder ? row.line : "A founder hires no more."} onClick={() => onHire(row.id)}>
                {`Hire ×${buying} · ${money(cost)}`}
              </button>
            </li>
          )
        })}
      </ul>
      {share > 0 ? <p className="world-credit" data-testid="world-credit">{`Your team grew ${percent < 1 ? "under 1" : percent}% of the users`}</p> : null}
    </section>
  )
}

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
  const product = useGame((state) => state.profile.product)
  const hire = useGame((state) => state.hire)
  const amount = useGame((state) => state.buyAmount)
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
          {winNote(raw.ending, product, winMultOf(founder.track))}
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
      <Team hires={founder.hires} ladder={founder.track === "ladder"} cash={cash} share={creditOf(raw).hiredShare} amount={amount} onHire={hire} />
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
