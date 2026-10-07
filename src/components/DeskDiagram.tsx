import { Presentation } from "lucide-react"
import { lazy, memo, Suspense } from "react"
import { INTERVIEWS } from "../data/studio/challenges.ts"
import type { Interview } from "../data/studio/challenges.ts"
import { useGame } from "../game/store.ts"
import { interviewById } from "../game/studio/interviews.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { jobOf, lastPassed, nextInterview, statusLine, useStatuses } from "./studio/status.ts"

const DeskDrawing = lazy(() => import("./DeskDrawing.tsx"))

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
 * The desk's backdrop, where the editor buffer used to be: the last passed whiteboard, drawn as a still SVG with slow
 * traffic dots, or before the first pass a dim card with the next interview's prompt. It sits behind the click
 * target and takes no pointer events.
 */
export const DeskDiagram = memo(function DeskDiagram() {
  const shownId = useGame((s) => lastPassed(s.interviews, s.journal.entries))
  const design = useGame((s) => (shownId ? s.interviews[shownId]?.design : undefined))
  const log = useGame((s) => s.interviews)
  const statuses = useStatuses()
  const shown = shownId ? interviewById(shownId) : undefined
  if (shown && design) {
    return (
      <Suspense fallback={null}>
        <DeskDrawing interview={shown} design={design} />
      </Suspense>
    )
  }
  const next = nextInterview(statuses)
  if (!next) return null
  return <NextPrompt interview={next} status={statusLine(statuses[INTERVIEWS.indexOf(next)], next, log)} />
})
