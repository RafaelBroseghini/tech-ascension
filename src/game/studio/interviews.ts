import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { COMPONENTS } from "../../data/studio/components.ts"
import { JOB_TIERS } from "../../data/phases.ts"
import { evaluate } from "./evaluate.ts"
import { verdict } from "./score.ts"
import type { Verdict } from "./score.ts"
import type { ComponentKind, Design, DesignEdge, DesignNode, RunResult } from "./types.ts"

export type VerdictKind = Verdict["kind"]

/** The cheapest passing design, real or practice, with the numbers that rank it. */
export type Best = {
  readonly design: Design
  readonly costPerMonth: number
  readonly p95Ms: number
}

/** What a career keeps per interview: the latest verdict, every submission counted, the design it last sent and the best passing run. */
export type InterviewRecord = {
  /** Null until the first real Submit. Only `hire` and `strongHire` count as a pass. */
  readonly verdict: VerdictKind | null
  readonly attempts: number
  /** The last real submission; empty until one. */
  readonly design: Design
  readonly best?: Best
}

/**
 * Keyed by interview id. An interview has a record once it was submitted to, forced, or practiced (a held job from a
 * save before interviews practices with no Submit, so its verdict is null).
 */
export type InterviewLog = Readonly<Record<string, InterviewRecord>>

/** The latest whiteboard submission and what it cost. */
export type Submission = {
  readonly interviewId: string
  readonly verdict: Verdict
  /** Spendable XP actually taken: the No hire penalty, held to what the player had. 0 for a pass. */
  readonly penalty: number
}

/** A practice rerun: the verdict and run for a design, and whether it became the interview's best. */
export type PracticeRun = {
  readonly verdict: Verdict
  readonly result: RunResult
  readonly newBest: boolean
  /** The best on record after this run. */
  readonly best: Best | undefined
}

/** A No hire costs this share of the gated job's lifetime XP requirement, in spendable XP. */
export const NO_HIRE_PENALTY_SHARE = 0.05

const VERDICTS: readonly VerdictKind[] = ["noHire", "hire", "strongHire"]

export function interviewById(id: string): Interview | undefined {
  return INTERVIEWS.find((row) => row.id === id)
}

export function interviewForJob(jobId: number): Interview | undefined {
  return INTERVIEWS.find((row) => row.jobId === jobId)
}

export function noHirePenalty(interview: Interview): number {
  const xpReq = JOB_TIERS.find((job) => job.id === interview.jobId)?.xpReq ?? 0
  return Math.floor(xpReq * NO_HIRE_PENALTY_SHARE)
}

export const isPass = (kind: VerdictKind | null): kind is "hire" | "strongHire" => kind === "hire" || kind === "strongHire"

const GATED_JOBS: ReadonlySet<number> = new Set(INTERVIEWS.map((row) => row.jobId))

/**
 * Passed once a submission earned a Hire or Strong hire, or once the career holds the gated job or a later gated one,
 * so a save from before interviews, or forced progress, never re-locks a job. Only gated jobs latch: a job with no
 * interview never skips one. A pass is never overwritten, since a job past its interview refuses further submissions.
 */
export function interviewPassed(p: { interviews: InterviewLog; jobs: readonly number[] }, interview: Interview): boolean {
  const record = p.interviews[interview.id]
  if (record && isPass(record.verdict)) return true
  return p.jobs.some((id) => id >= interview.jobId && GATED_JOBS.has(id))
}

/** A design run against an interview's scenario and judged by its targets. Reads no career, so a Submit and a practice rerun judge alike. */
export function practice(interview: Interview, design: Design): { verdict: Verdict; result: RunResult } {
  const result = evaluate(design, interview.scenario)
  return { verdict: verdict(result, interview.targets, design), result }
}

export const bestOf = (design: Design, result: RunResult): Best => ({ design: copyDesign(design), costPerMonth: result.costPerMonth, p95Ms: result.p95Ms })

/** Lower cost wins; at the same cost, lower p95. Any passing run beats no best. */
export function betterBest(prev: Best | undefined, candidate: Best): boolean {
  if (!prev) return true
  return candidate.costPerMonth < prev.costPerMonth || (candidate.costPerMonth === prev.costPerMonth && candidate.p95Ms < prev.p95Ms)
}

/** The design as plain data, so a caller's extra fields or later mutations never reach the save. */
export function copyDesign(design: Design): Design {
  return {
    nodes: design.nodes.map((n) => ({ id: n.id, kind: n.kind, replicas: n.replicas })),
    edges: design.edges.map((e) => ({ from: e.from, to: e.to })),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const isKind = (value: unknown): value is ComponentKind => typeof value === "string" && Object.hasOwn(COMPONENTS, value)

/** A design from outside the type system (a save, the harness). Unknown kinds and malformed rows are dropped. */
export function parseDesign(raw: unknown): Design {
  if (!isRecord(raw) || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return { nodes: [], edges: [] }
  const nodes: DesignNode[] = []
  for (const n of raw.nodes) {
    if (!isRecord(n) || typeof n.id !== "string" || !isKind(n.kind)) continue
    const replicas = typeof n.replicas === "number" && Number.isFinite(n.replicas) ? Math.max(0, Math.floor(n.replicas)) : 1
    nodes.push({ id: n.id, kind: n.kind, replicas })
  }
  const edges: DesignEdge[] = []
  for (const e of raw.edges) {
    if (isRecord(e) && typeof e.from === "string" && typeof e.to === "string") edges.push({ from: e.from, to: e.to })
  }
  return { nodes, edges }
}

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

/** A saved best, or nothing when its numbers are missing or its design has no component. */
function parseBest(raw: unknown): Best | undefined {
  if (!isRecord(raw) || !isCount(raw.costPerMonth) || !isCount(raw.p95Ms)) return undefined
  const design = parseDesign(raw.design)
  return design.nodes.length > 0 ? { design, costPerMonth: raw.costPerMonth, p95Ms: raw.p95Ms } : undefined
}

/** Reads the save's `interviews` block. Unknown interview ids and unknown verdicts are dropped; a broken design is emptied. */
export function parseInterviews(raw: unknown): InterviewLog {
  const out: Record<string, InterviewRecord> = {}
  if (!isRecord(raw)) return out
  for (const [id, value] of Object.entries(raw)) {
    if (!interviewById(id) || !isRecord(value)) continue
    const kind = value.verdict === null ? null : VERDICTS.find((v) => v === value.verdict)
    if (kind === undefined) continue
    const attempts = isCount(value.attempts) ? Math.max(0, Math.floor(value.attempts)) : 0
    const best = parseBest(value.best)
    out[id] = { verdict: kind, attempts, design: parseDesign(value.design), ...(best ? { best } : {}) }
  }
  return out
}
