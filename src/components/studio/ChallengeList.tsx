import { memo } from "react"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { jobOf, statusLine, useStatuses } from "./status.ts"
import type { InterviewStatus } from "./status.ts"

const reachable = (status: InterviewStatus) => status !== "board" && status !== "xp"

/** Every interview with its job, the verdict so far, and why a closed one is closed. */
export const ChallengeList = memo(function ChallengeList({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  const statuses = useStatuses()
  const log = useGame((s) => s.interviews)
  return (
    <nav className="studio-list" aria-label="Interviews">
      <label className="studio-list-select">
        <span className="sr-only">Interview</span>
        <select value={activeId} onChange={(e) => onPick(e.target.value)}>
          {INTERVIEWS.map((interview, i) => (
            <option key={interview.id} value={interview.id} disabled={!reachable(statuses[i])}>
              {`${interview.name}: ${statusLine(statuses[i], interview, log)}`}
            </option>
          ))}
        </select>
      </label>
      <ol className="studio-list-rows">
        {INTERVIEWS.map((interview, i) => {
          const status = statuses[i]
          return (
            <li key={interview.id}>
              <button
                type="button"
                className={interview.id === activeId ? "studio-list-row is-active" : "studio-list-row"}
                data-testid="studio-interview"
                data-interview={interview.id}
                data-status={status}
                aria-current={interview.id === activeId ? "true" : undefined}
                disabled={!reachable(status)}
                onClick={() => onPick(interview.id)}
              >
                <span className="studio-list-name">{interview.name}</span>
                <span className="studio-list-job">{jobOf(interview)?.name}</span>
                <span className={`studio-list-status is-${status}`}>{statusLine(status, interview, log)}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
})
