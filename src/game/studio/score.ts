import { COMPONENTS } from "../../data/studio/components.ts"
import type { Design, RunResult, TargetName, Targets } from "./types.ts"

export type Constraint = "money" | "performance" | "availability" | "faultTolerance" | "correctness"

export const CONSTRAINT_OF: Readonly<Record<TargetName, Constraint>> = {
  budget: "money",
  success: "performance",
  p95: "performance",
  lag: "performance",
  availability: "availability",
  faults: "faultTolerance",
  features: "correctness",
}

export interface Miss {
  readonly target: TargetName
  /** What the interviewer says about it. */
  readonly line: string
}

export interface FeatureTally {
  readonly working: number
  readonly total: number
  /** Ids of the features under the success target, in scenario order. */
  readonly broken: readonly string[]
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
    case "features": {
      const broken = result.features.filter((feature) => brokenFeatures(result, targets).includes(feature.id))
      const first = broken[0]
      const more = broken.length > 1 ? ` ${broken.length - 1} more broke with it.` : ""
      return first
        ? `"${first.story}" doesn't work: only ${pct(first.served)} of those requests came back right.${more} Users noticed before the dashboard did.`
        : "A feature broke."
    }
    case "faults": {
      const fell = result.phases.find((p) => p.fault !== null && p.successRate < targets.successRate)
      return `"${fell?.line ?? "A fault hit."}" Your design took that personally and served ${pct(result.faultSuccessRate)}.`
    }
  }
}

/** The features whose share answered correctly in the worst calm phase fell under the success target. */
export const brokenFeatures = (result: RunResult, targets: Targets): string[] =>
  result.features.filter((feature) => feature.served < targets.successRate).map((feature) => feature.id)

export function featureTally(result: RunResult, targets: Targets): FeatureTally {
  const broken = brokenFeatures(result, targets)
  return { working: result.features.length - broken.length, total: result.features.length, broken }
}

/** How many of the phases that carry a fault kept the success target. */
export function faultTally(result: RunResult, targets: Targets): FaultTally {
  const faulted = result.phases.filter((p) => p.fault !== null)
  return { survived: faulted.filter((p) => p.successRate >= targets.successRate).length, total: faulted.length }
}

export function verdict(result: RunResult, targets: Targets, design: Design): Verdict {
  const faults = faultTally(result, targets)
  const failed: Record<TargetName, boolean> = {
    budget: result.costPerMonth > targets.budgetPerMonth,
    success: result.successRate < targets.successRate,
    p95: result.p95Ms > targets.p95Ms,
    lag: result.lagSeconds > targets.maxLagSeconds,
    availability: result.availability < targets.availability,
    faults: faults.survived < faults.total,
    features: brokenFeatures(result, targets).length > 0,
  }
  const missed = (Object.keys(failed) as TargetName[])
    .filter((target) => failed[target])
    .map((target) => ({ target, line: lineFor(target, result, targets, design) }))
  const [first, ...rest] = missed
  if (first) return { kind: "noHire", faults, missed: [first, ...rest] }
  const strong = result.costPerMonth <= targets.budgetPerMonth * STRONG_HIRE_BUDGET_SHARE
  return { kind: strong ? "strongHire" : "hire", faults }
}

/** What a design earned: works, meets every target, and does it under half the budget. Each star needs the one before. */
export type Stars = 0 | 1 | 2 | 3

export const STAR_LABELS: readonly [string, string, string] = ["Works", "Meets the targets", "Under half the budget"]

export function starsOf(result: RunResult, targets: Targets, judged: Verdict): Stars {
  const works = result.unrouted.length === 0 && brokenFeatures(result, targets).length === 0
  if (!works) return 0
  if (judged.kind === "noHire") return 1
  return judged.kind === "strongHire" ? 3 : 2
}
