import { COMPONENTS } from "../../data/studio/components.ts"
import { featureTally } from "../../game/studio/score.ts"
import type { FaultTally } from "../../game/studio/score.ts"
import type { Design, Phase, RunResult, Scenario, TargetName, Targets } from "../../game/studio/types.ts"
import { money, percent } from "./kinds.ts"

export interface Meter {
  readonly name: string
  readonly value: string
  /** The targets this meter is judged by, in words. Empty while none of them has been asked about. */
  readonly target: string
  /** How full the bar is, 0 to 1. Null while there is no target line for it to measure against. */
  readonly fill: number | null
  readonly targets: readonly TargetName[]
}

const ms = (x: number) => (Number.isFinite(x) ? `${Math.round(x)} ms` : "forever")

/**
 * One meter per constraint (money, performance, availability, fault tolerance, correctness) for a result judged against `targets`.
 * A meter draws its target line and bar only for the targets in `known`, the ones the player asked about.
 */
export function meters(result: RunResult, targets: Targets, faults: FaultTally, known: ReadonlySet<TargetName>): Meter[] {
  const has = (target: TargetName) => known.has(target)
  const features = featureTally(result, targets)
  const perf = [
    has("success") && has("p95")
      ? `${percent(targets.successRate)} within ${targets.p95Ms} ms`
      : has("success")
        ? `${percent(targets.successRate)} answered`
        : has("p95")
          ? `p95 within ${targets.p95Ms} ms`
          : "",
    has("lag") ? `queue under ${targets.maxLagSeconds} s` : "",
  ].filter((part) => part.length > 0)
  return [
    {
      name: "Money",
      value: `${money(result.costPerMonth)}/mo`,
      target: has("budget") ? `budget ${money(targets.budgetPerMonth)}` : "",
      fill: has("budget") ? Math.min(1, result.costPerMonth / targets.budgetPerMonth) : null,
      targets: ["budget"],
    },
    {
      name: "Performance",
      value: `${percent(result.successRate)} answered, p95 ${ms(result.p95Ms)}${result.lagSeconds > 0 ? `, ${Math.round(result.lagSeconds)} s behind` : ""}`,
      target: perf.join(", "),
      fill: has("success") ? result.successRate : null,
      targets: ["success", "p95", "lag"],
    },
    {
      name: "Availability",
      value: `${percent(result.availability, 3)}, ${Math.round(result.downtimeMinutesPerMonth)} min down a month`,
      target: has("availability") ? `${percent(targets.availability, 3)} up` : "",
      fill: has("availability") ? result.availability : null,
      targets: ["availability"],
    },
    {
      name: "Fault tolerance",
      value: faults.total === 0 ? "No faults in this interview" : `${faults.survived} of ${faults.total} faults survived`,
      target: has("faults") ? "survive every fault" : "",
      fill: has("faults") ? (faults.total === 0 ? 1 : faults.survived / faults.total) : null,
      targets: ["faults"],
    },
    {
      name: "Correctness",
      value: `${features.working} of ${features.total} features work`,
      target: has("features") ? "every feature works" : "",
      fill: has("features") ? features.working / features.total : null,
      targets: ["features"],
    },
  ]
}

/** Requests over a stretch of the scenario. */
export interface RequestCounts {
  readonly sent: number
  readonly answered: number
  readonly peakRps: number
  readonly seconds: number
}

/** A spike phase sends its multiple of the phase's rps; every other fault leaves the rate alone. */
const phaseRps = (phase: Phase) => (phase.fault?.kind === "spike" ? phase.rps * phase.fault.multiplier : phase.rps)

/**
 * What the scenario sends and what gets answered (`rps × seconds × successRate` per phase). `running[i]` is the total
 * once phase `i` is over, so the reveal can count up in step with the run log; `total` is the last of them.
 */
export function requestCounts(scenario: Scenario, result: RunResult): { total: RequestCounts; running: readonly RequestCounts[] } {
  let soFar: RequestCounts = { sent: 0, answered: 0, peakRps: 0, seconds: 0 }
  const running = scenario.phases.map((phase, i) => {
    const sent = phaseRps(phase) * phase.seconds
    soFar = {
      sent: soFar.sent + sent,
      answered: soFar.answered + sent * (result.phases[i]?.successRate ?? 0),
      peakRps: Math.max(soFar.peakRps, phaseRps(phase)),
      seconds: soFar.seconds + phase.seconds,
    }
    return soFar
  })
  return { total: soFar, running }
}

export interface ReadoutLine {
  readonly key: "requests" | "answered" | "hottest" | "singlePoints"
  readonly text: string
}

const count = (n: number) => Math.round(n).toLocaleString("en-US")

function nameOf(design: Design, id: string): string {
  const node = design.nodes.find((n) => n.id === id)
  return node ? COMPONENTS[node.kind].name : id
}

/**
 * The plain-language lines under the meters: requests sent, answered and failed, the hottest node, and the single
 * points of failure. `counts` is the whole scenario, or the part of it a reveal has played; `settled` is false while a
 * reveal still plays, when the node lines would give away the result. A null `counts` leaves the two request lines out,
 * for a player who has not asked about the traffic, since the totals would answer that question.
 */
export function readout(design: Design, result: RunResult, counts: RequestCounts | null, settled = true): ReadoutLine[] {
  const lines: ReadoutLine[] = counts
    ? [
        { key: "requests", text: `${count(counts.sent)} requests over ${counts.seconds} s, peak ${count(counts.peakRps)} rps` },
        { key: "answered", text: `Answered ${count(counts.answered)}, failed ${count(Math.max(0, counts.sent - counts.answered))}` },
      ]
    : []
  if (!settled) return lines
  const hot = result.hot[0]
  if (hot) {
    const load = Number.isFinite(hot.utilization) ? `${Math.round(hot.utilization * 100)}% busy` : "down and still getting traffic"
    lines.push({ key: "hottest", text: `Busiest: ${nameOf(design, hot.id)}, ${load}` })
  }
  const single = [...new Set(result.singlePointsOfFailure.map((id) => nameOf(design, id)))]
  lines.push({ key: "singlePoints", text: single.length > 0 ? `Single points of failure: ${single.join(", ")}` : "No single point of failure" })
  return lines
}
