import { Presentation } from "lucide-react"
import { memo } from "react"
import type { Interview } from "../data/studio/challenges.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { jobOf, nextInterview, statusLine, useStatuses } from "./studio/status.ts"

function NextPrompt({ interview, status }: { interview: Interview; status: string }) {
  return (
    <div className="desk-diagram" data-testid="desk-prompt" data-interview={interview.id} aria-hidden>
      <p className="desk-diagram-caption">
        <Presentation {...UI_ICON_SM} aria-hidden />
        Next interview · {interview.name}
      </p>
      <div className="desk-prompt-card">
        <p className="desk-prompt-kicker">For {jobOf(interview)?.name ?? "a job"}</p>
        <p className="desk-prompt-brief">{interview.brief}</p>
        <p className="desk-prompt-foot">{status}. The whiteboard button on the left opens it.</p>
      </div>
    </div>
  )
}

/**
 * The desk's backdrop, where the editor buffer used to be: a dim card with the prompt of the interview waiting for a
 * submission, and nothing otherwise, so a locked interview is never named. It sits behind the click target and takes no
 * pointer events.
 */
export const DeskDiagram = memo(function DeskDiagram() {
  const log = useGame((s) => s.interviews)
  const next = nextInterview(useStatuses())
  return next ? <NextPrompt interview={next} status={statusLine("open", next, log)} /> : null
})
