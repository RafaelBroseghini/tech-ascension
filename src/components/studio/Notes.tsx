import { memo } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { questionsFor } from "../../data/studio/questions.ts"
import { useGame } from "../../game/store.ts"
import { NO_RECORD } from "../../game/studio/interviews.ts"

/**
 * Sticky notes beside the board. Every question the interview asks has a note: blank until asked, then the answer, so
 * what the player knows and what they skipped reads at a glance. Nudges and hints taken land as notes of their own.
 */
export const Notes = memo(function Notes({ interview }: { interview: Interview }) {
  const { asked, nudges, hints } = useGame((s) => s.interviews[interview.id]) ?? NO_RECORD
  return (
    <aside className="studio-notes" aria-label="Notes from the interviewer" data-testid="studio-notes">
      {questionsFor(interview).map((question) =>
        asked.includes(question.id) ? (
          <p key={question.id} className="studio-note is-answered" data-testid="studio-note" data-question={question.id} data-asked="true">
            <b>{question.topic}</b>
            {question.answer(interview)}
          </p>
        ) : (
          <p key={question.id} className="studio-note is-blank" data-testid="studio-note" data-question={question.id} data-asked="false" aria-label={`${question.topic}, not asked`}>
            <b>{question.topic}</b>
          </p>
        ),
      )}
      {nudges.map((target) => (
        <p key={target} className="studio-note is-nudge" data-testid="studio-nudge-note" data-target={target}>
          <b>Nudge</b>
          {interview.nudges[target]}
        </p>
      ))}
      {hints.map((hint) => (
        <p key={hint} className="studio-note is-hint" data-testid="studio-hint-note">
          <b>Hint</b>
          {hint}
        </p>
      ))}
    </aside>
  )
})
