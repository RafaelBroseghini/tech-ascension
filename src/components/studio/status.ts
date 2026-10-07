import { useShallow } from "zustand/react/shallow"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { JOB_TIERS } from "../../data/phases.ts"
import { jobState } from "../../game/phase.ts"
import type { JobGates } from "../../game/phase.ts"
import { interviewPassed } from "../../game/studio/interviews.ts"
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

