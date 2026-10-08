import type { FaultTally } from "../../game/studio/score.ts"
import type { RunResult, TargetName, Targets } from "../../game/studio/types.ts"
import { money, percent } from "./kinds.ts"

export interface Meter {
  readonly name: string
  readonly value: string
  readonly target: string
  /** How full the bar is, 0 to 1. */
  readonly fill: number
  readonly targets: readonly TargetName[]
}

const ms = (x: number) => (Number.isFinite(x) ? `${Math.round(x)} ms` : "forever")

/** One meter per constraint (money, performance, availability, fault tolerance) for a result judged against `targets`. */
export function meters(result: RunResult, targets: Targets, faults: FaultTally): Meter[] {
  return [
    {
      name: "Money",
      value: `${money(result.costPerMonth)}/mo`,
      target: `budget ${money(targets.budgetPerMonth)}`,
      fill: Math.min(1, result.costPerMonth / targets.budgetPerMonth),
      targets: ["budget"],
    },
    {
      name: "Performance",
      value: `${percent(result.successRate)} answered, p95 ${ms(result.p95Ms)}${result.lagSeconds > 0 ? `, ${Math.round(result.lagSeconds)} s behind` : ""}`,
      target: `${percent(targets.successRate)} within ${targets.p95Ms} ms`,
      fill: result.successRate,
      targets: ["success", "p95", "lag"],
    },
    {
      name: "Availability",
      value: `${percent(result.availability, 3)}, ${Math.round(result.downtimeMinutesPerMonth)} min down a month`,
      target: `${percent(targets.availability, 3)} up`,
      fill: result.availability,
      targets: ["availability"],
    },
    {
      name: "Fault tolerance",
      value: faults.total === 0 ? "No faults in this interview" : `${faults.survived} of ${faults.total} faults survived`,
      target: "survive every fault",
      fill: faults.total === 0 ? 1 : faults.survived / faults.total,
      targets: ["faults"],
    },
  ]
}
