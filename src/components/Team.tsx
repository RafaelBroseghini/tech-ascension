import "../styles/globe.css"
import { hireLocked } from "../game/build.ts"
import type { BuildState } from "../game/build.ts"
import { formatNumber } from "../game/format.ts"
import { canHire, creditOf, headcountOf, hireCost, hireGrowthStep, hirePayrollOf, openHires } from "../game/globe/hires.ts"
import type { Hires } from "../game/globe/hires.ts"
import { useGame } from "../game/store.ts"

const money = (n: number) => `$${formatNumber(n)}`
/** A share of the growth multiplier, in percent, to two significant digits. */
const growth = (n: number) => {
  const pct = n * 100
  return pct >= 10 ? pct.toFixed(0) : pct >= 1 ? pct.toFixed(1) : pct.toFixed(2)
}

/** The people on the payroll and a row for each kind that is open, with the Hire and Fire buttons. */
function Team({
  hires,
  jobs,
  build,
  cash,
  share,
  onHire,
  onFire,
}: {
  hires: Hires
  jobs: readonly number[]
  build: BuildState
  cash: number
  share: number
  onHire: (id: string) => boolean
  onFire: (id: string) => boolean
}) {
  const percent = Math.round(share * 100)
  return (
    <section className="world-team" data-testid="world-team" aria-label="Team">
      <h4>{`Team · ${formatNumber(headcountOf(hires))} hired · ${money(hirePayrollOf(hires))}/s`}</h4>
      <ul className="world-hired" data-testid="world-hired">
        {openHires(hires).map((row) => {
          const held = hires[row.id] ?? 0
          const cost = hireCost(row, held, 1)
          // Hiring is the Manager's, each kind from its rank: a shut row says why and keeps its Fire button for hires already held.
          const locked = hireLocked({ jobs, build }, row)
          return (
            <li key={row.id} className={locked ? "world-hire is-locked" : "world-hire"} data-hire={row.id} data-testid={`world-hire-${row.id}`}>
              <span>
                <strong>{row.name}</strong>
                {`${formatNumber(held)} hired · −${money(held * row.salary)}/s`}
                <small>{`each: −${money(row.salary)}/s · +${growth(hireGrowthStep(row, held))}% growth`}</small>
                {locked ? <small className="world-hire-locked" data-testid={`world-hire-locked-${row.id}`}>{locked}</small> : null}
              </span>
              <div className="world-hire-actions">
                <button type="button" disabled={locked !== null || !canHire(hires, cash, row.id)} title={locked ?? row.line} onClick={() => onHire(row.id)}>
                  {`Hire · ${money(cost)}`}
                </button>
                {held > 0 ? (
                  <button
                    type="button"
                    className="world-fire"
                    data-testid={`world-fire-${row.id}`}
                    title={`Let one go: −${money(row.salary)}/s in salaries, and the growth they add. No refund.`}
                    onClick={() => onFire(row.id)}
                  >
                    Fire
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {share > 0 ? <p className="world-credit" data-testid="world-credit">{`Your team grew ${percent < 1 ? "under 1" : percent}% of the users`}</p> : null}
    </section>
  )
}

/** The Manager's team, in the Jobs tab where the Manager's rows are. */
export function TeamPanel() {
  const hires = useGame((state) => state.hires)
  const jobs = useGame((state) => state.jobs)
  const build = useGame((state) => state.build)
  const cash = useGame((state) => state.money)
  const company = useGame((state) => state.company)
  const hire = useGame((state) => state.hire)
  const fire = useGame((state) => state.fire)
  return <Team hires={hires} jobs={jobs} build={build} cash={cash} share={creditOf(company).hiredShare} onHire={hire} onFire={fire} />
}
