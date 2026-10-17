import { memo } from "react"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { jobOf, reachable, statusLine, useStatuses } from "./status.ts"

/** The interviews the career has reached, each with its job and the verdict so far. Locked ones are not listed. */
export const ChallengeList = memo(function ChallengeList({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  const statuses = useStatuses()
  const log = useGame((s) => s.interviews)
  const rows = INTERVIEWS.flatMap((interview, i) => {
    const status = statuses[i]
    return reachable(status) ? [{ interview, status }] : []
  })
  return (
    <nav className="studio-list" aria-label="Interviews">
      <label className="studio-list-select">
        <span className="sr-only">Interview</span>
        <select value={activeId} onChange={(e) => onPick(e.target.value)}>
          {rows.map(({ interview, status }) => (
            <option key={interview.id} value={interview.id}>
              {`${interview.name}: ${statusLine(status, interview, log)}`}
            </option>
          ))}
        </select>
      </label>
      <ol className="studio-list-rows">
        {rows.map(({ interview, status }) => (
          <li key={interview.id}>
            <button
              type="button"
              className={interview.id === activeId ? "studio-list-row is-active" : "studio-list-row"}
              data-testid="studio-interview"
              data-interview={interview.id}
              data-status={status}
              aria-current={interview.id === activeId ? "true" : undefined}
              onClick={() => onPick(interview.id)}
            >
              <span className="studio-list-name">{interview.name}</span>
              <span className="studio-list-job">{jobOf(interview)?.name}</span>
              <span className={`studio-list-status is-${status}`}>{statusLine(status, interview, log)}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
})
