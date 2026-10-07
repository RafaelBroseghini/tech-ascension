import { COMPONENTS } from "../../data/studio/components.ts"
import type { Design, RunResult, TargetName, Targets } from "./types.ts"

export type Constraint = "money" | "performance" | "availability" | "faultTolerance"

export const CONSTRAINT_OF: Readonly<Record<TargetName, Constraint>> = {
  budget: "money",
  success: "performance",
  p95: "performance",
  lag: "performance",
  availability: "availability",
  faults: "faultTolerance",
}

export interface Miss {
  readonly target: TargetName
  /** What the interviewer says about it. */
  readonly line: string
}

export interface FaultTally {
  readonly survived: number
  readonly total: number
}

export type Verdict =
  | { readonly kind: "strongHire"; readonly faults: FaultTally }
  | { readonly kind: "hire"; readonly faults: FaultTally }
  | { readonly kind: "noHire"; readonly faults: FaultTally; readonly missed: readonly [Miss, ...Miss[]] }

const STRONG_HIRE_BUDGET_SHARE = 0.5

const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const ms = (x: number) => (Number.isFinite(x) ? `${Math.round(x)} ms` : "forever")

function lineFor(target: TargetName, result: RunResult, targets: Targets, design: Design): string {
  switch (target) {
    case "budget":
      return `Your design costs $${Math.round(result.costPerMonth)} a month against $${targets.budgetPerMonth}. Finance has started drafting your exit interview.`
    case "success":
      return `Only ${pct(result.successRate)} of requests got an answer. The rest are still waiting, like your promotion.`
    case "p95":
      return `Your p95 is ${ms(result.p95Ms)}, the target was ${ms(targets.p95Ms)}. Users left for a competitor's spinner.`
    case "lag":
      return `The queue runs ${Math.round(result.lagSeconds)} seconds behind. The notifications will arrive at your retirement party.`
    case "availability": {
      const node = design.nodes.find((n) => n.id === result.singlePointsOfFailure[0])
      const minutes = Math.round(result.downtimeMinutesPerMonth)
      return node
        ? `Your ${COMPONENTS[node.kind].name} is a single point of failure, and so is your confidence. ${minutes} minutes down a month.`
        : `${minutes} minutes down a month. The status page has a fan club.`
    }
    case "faults": {
      const fell = result.phases.find((p) => p.fault !== null && p.successRate < targets.successRate)
      return `"${fell?.line ?? "A fault hit."}" Your design took that personally and served ${pct(result.faultSuccessRate)}.`
    }
  }
}

export function verdict(result: RunResult, targets: Targets, design: Design): Verdict {
  const faulted = result.phases.filter((p) => p.fault !== null)
  const faults: FaultTally = {
    survived: faulted.filter((p) => p.successRate >= targets.successRate).length,
    total: faulted.length,
  }
  const failed: Record<TargetName, boolean> = {
    budget: result.costPerMonth > targets.budgetPerMonth,
    success: result.successRate < targets.successRate,
    p95: result.p95Ms > targets.p95Ms,
    lag: result.lagSeconds > targets.maxLagSeconds,
    availability: result.availability < targets.availability,
    faults: faults.survived < faults.total,
  }
  const missed = (Object.keys(failed) as TargetName[])
    .filter((target) => failed[target])
    .map((target) => ({ target, line: lineFor(target, result, targets, design) }))
  const [first, ...rest] = missed
  if (first) return { kind: "noHire", faults, missed: [first, ...rest] }
  const strong = result.costPerMonth <= targets.budgetPerMonth * STRONG_HIRE_BUDGET_SHARE
  return { kind: strong ? "strongHire" : "hire", faults }
}
