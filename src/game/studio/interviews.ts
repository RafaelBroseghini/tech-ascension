import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { COMPONENTS } from "../../data/studio/components.ts"
import { JOB_TIERS } from "../../data/phases.ts"
import { evaluate } from "./evaluate.ts"
import { verdict } from "./score.ts"
import type { Verdict } from "./score.ts"
import type { ComponentKind, Design, DesignEdge, DesignNode } from "./types.ts"

export type VerdictKind = Verdict["kind"]

/** What a career keeps per interview: the latest verdict, every submission counted, and the design it last sent. */
export type InterviewRecord = {
  readonly verdict: VerdictKind
  readonly attempts: number
  readonly design: Design
}

/** Keyed by interview id. Only interviews the player has submitted to (or that were forced) have a record. */
export type InterviewLog = Readonly<Record<string, InterviewRecord>>

/** The latest whiteboard submission and what it cost. */
export type Submission = {
  readonly interviewId: string
  readonly verdict: Verdict
  /** Spendable XP actually taken: the No hire penalty, held to what the player had. 0 for a pass. */
  readonly penalty: number
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

export const isPass = (kind: VerdictKind): boolean => kind !== "noHire"

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

export function judge(interview: Interview, design: Design): Verdict {
  return verdict(evaluate(design, interview.scenario), interview.targets, design)
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

/** Reads the save's `interviews` block. Unknown interview ids and unknown verdicts are dropped; a broken design is emptied. */
export function parseInterviews(raw: unknown): InterviewLog {
  const out: Record<string, InterviewRecord> = {}
  if (!isRecord(raw)) return out
  for (const [id, value] of Object.entries(raw)) {
    if (!interviewById(id) || !isRecord(value)) continue
    const kind = VERDICTS.find((v) => v === value.verdict)
    if (!kind) continue
    const attempts = typeof value.attempts === "number" && Number.isFinite(value.attempts) ? Math.max(0, Math.floor(value.attempts)) : 0
    out[id] = { verdict: kind, attempts, design: parseDesign(value.design) }
  }
  return out
}
