import { useShallow } from "zustand/react/shallow"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { JOB_TIERS } from "../../data/phases.ts"
import { jobState } from "../../game/phase.ts"
import type { JobGates } from "../../game/phase.ts"
import type { CareerEntry } from "../../game/careerLog.ts"
import { interviewPassed, isPass } from "../../game/studio/interviews.ts"
import type { InterviewLog } from "../../game/studio/interviews.ts"
import type { Design } from "../../game/studio/types.ts"
import { useGame } from "../../game/store.ts"

/** Where an interview stands for this career. Only `open` takes a submission. */
export type InterviewStatus = "open" | "passed" | "hired" | "board" | "xp"

export const jobOf = (interview: Interview) => JOB_TIERS.find((job) => job.id === interview.jobId)

export function interviewStatus(gates: JobGates, interview: Interview): InterviewStatus {
  const job = jobOf(interview)
  if (!job) return "xp"
  switch (jobState(gates, job)) {
    case "owned":
      return "hired"
    case "board-locked":
      return "board"
    case "locked":
      return "xp"
    case "interview":
      return "open"
    case "ready":
      return interviewPassed(gates, interview) ? "passed" : "open"
  }
}

export const useStatuses = (): InterviewStatus[] =>
  useGame(useShallow((s) => INTERVIEWS.map((interview) => interviewStatus(s, interview))))

export function statusLine(status: InterviewStatus, interview: Interview, log: InterviewLog): string {
  const record = log[interview.id]
  switch (status) {
    case "hired":
      return "Hired"
    case "passed":
      return record?.verdict === "strongHire" ? "Strong hire" : "Passed"
    case "board":
      return "Opens with the Job Board"
    case "xp":
      return `Needs ${(jobOf(interview)?.xpReq ?? 0).toLocaleString("en-US")} lifetime XP`
    case "open":
      return record ? `No hire x${record.attempts}` : "Ready to interview"
  }
}


/** The interview the whiteboard opens on by default: the first one waiting for a submission, else the first not passed. */
export function nextInterview(statuses: readonly InterviewStatus[]): Interview | null {
  const open = statuses.indexOf("open")
  const ahead = open >= 0 ? open : statuses.findIndex((status) => status !== "passed" && status !== "hired")
  return INTERVIEWS[ahead] ?? null
}

/** A passing design on record, worth drawing: more than The Users alone. */
export function passedDesign(log: InterviewLog, id: string): Design | null {
  const record = log[id]
  return record && isPass(record.verdict) && record.design.nodes.length > 1 ? record.design : null
}

/**
 * The interview whose design the desk draws: the newest pass in the journal, else the furthest passing design on
 * record (the journal trims old entries), else the furthest interview a held job counts as passed (a save from before
 * interviews, or admin's Buy everything), which has no design of its own. Null before any pass.
 */
export function lastPassed(p: { interviews: InterviewLog; jobs: readonly number[] }, journal: readonly CareerEntry[]): string | null {
  for (let i = journal.length - 1; i >= 0; i--) {
    const entry = journal[i]
    if (entry.type !== "interview" || entry.data?.verdict === "noHire") continue
    const id = entry.ref.slice("interview:".length)
    if (passedDesign(p.interviews, id)) return id
  }
  for (let i = INTERVIEWS.length - 1; i >= 0; i--) if (passedDesign(p.interviews, INTERVIEWS[i].id)) return INTERVIEWS[i].id
  for (let i = INTERVIEWS.length - 1; i >= 0; i--) if (interviewPassed(p, INTERVIEWS[i])) return INTERVIEWS[i].id
  return null
}
