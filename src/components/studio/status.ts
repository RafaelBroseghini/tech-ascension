import { useShallow } from "zustand/react/shallow"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { JOB_TIERS } from "../../data/phases.ts"
import { jobState } from "../../game/phase.ts"
import type { JobGates } from "../../game/phase.ts"
import type { CareerEntry } from "../../game/careerLog.ts"
import { interviewPassed, isPass } from "../../game/studio/interviews.ts"
import type { InterviewLog } from "../../game/studio/interviews.ts"
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

const drawable = (log: InterviewLog, id: string) => {
  const record = log[id]
  return record !== undefined && isPass(record.verdict) && record.design.nodes.length > 1
}

/**
 * The interview whose passing design the desk draws: the newest pass in the journal, or, once the journal has trimmed
 * it, the furthest interview with a passing design on record. Null before any pass with a design.
 */
export function lastPassed(log: InterviewLog, journal: readonly CareerEntry[]): string | null {
  for (let i = journal.length - 1; i >= 0; i--) {
    const entry = journal[i]
    if (entry.type !== "interview") continue
    const id = entry.ref.slice("interview:".length)
    if (entry.data?.verdict !== "noHire" && drawable(log, id)) return id
  }
  for (let i = INTERVIEWS.length - 1; i >= 0; i--) if (drawable(log, INTERVIEWS[i].id)) return INTERVIEWS[i].id
  return null
}
