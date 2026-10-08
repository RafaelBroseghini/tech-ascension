import { memo } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { questionsFor } from "../../data/studio/questions.ts"
import { useGame } from "../../game/store.ts"
import { NO_RECORD } from "../../game/studio/interviews.ts"
import type { TargetName } from "../../game/studio/types.ts"
import { draftOf, useBoard } from "./boardStore.ts"
import type { ReachableStatus } from "./status.ts"

/** What a nudge is about, without saying what it says. */
const NUDGE_TOPIC: Readonly<Record<TargetName, string>> = {
  budget: "money",
  success: "dropped requests",
  p95: "waiting",
  lag: "the queue",
  availability: "uptime",
  faults: "things breaking",
  features: "broken features",
}

/**
 * Three separate groups. Questions and nudges are free and never touch the offer; a hint gives away part of the answer,
 * says what it costs before the click, and exists only while the interview is open.
 */
export const Ask = memo(function Ask({ interview, status, hint }: { interview: Interview; status: ReachableStatus; hint: string | null }) {
  const { asked, nudges, hints } = useGame((s) => s.interviews[interview.id]) ?? NO_RECORD
  const nudgeTargets = (Object.keys(interview.nudges) as TargetName[]).filter((target) => interview.nudges[target] !== undefined)
  const downLeveled = hints.length > 0
  const repeat = hint !== null && hints.includes(hint)
  return (
    <div className="studio-ask">
      <fieldset className="studio-group" data-group="questions">
        <legend>Ask the interviewer · free</legend>
        {questionsFor(interview).map((question) => (
          <button
            key={question.id}
            type="button"
            className="studio-chip"
            data-testid="studio-question"
            data-question={question.id}
            aria-pressed={asked.includes(question.id)}
            disabled={asked.includes(question.id)}
            onClick={() => useGame.getState().askInterviewer(interview.id, question.id)}
          >
            {question.ask}
          </button>
        ))}
      </fieldset>
      {nudgeTargets.length > 0 ? (
        <fieldset className="studio-group" data-group="nudges">
          <legend>Nudges · free</legend>
          {nudgeTargets.map((target) => (
            <button
              key={target}
              type="button"
              className="studio-chip"
              data-testid="studio-nudge"
              data-target={target}
              aria-pressed={nudges.includes(target)}
              disabled={nudges.includes(target)}
              onClick={() => useGame.getState().takeNudge(interview.id, target)}
            >
              {`A nudge about ${NUDGE_TOPIC[target]}`}
            </button>
          ))}
        </fieldset>
      ) : null}
      {status === "open" ? (
        <fieldset className="studio-group" data-group="hints">
          <legend>Hints · cost an offer step</legend>
          <button
            type="button"
            className="studio-chip is-hint"
            data-testid="studio-hint"
            disabled={hint === null || repeat}
            onClick={() => hint !== null && useGame.getState().takeHint(interview.id, draftOf(useBoard.getState()))}
          >
            <span className="studio-cost" data-testid="studio-hint-cost">
              {downLeveled ? "Already down-leveled, no further drop" : "Drops the offer to the bottom of the band"}
            </span>
            <span>{hint === null ? "Your board covers everything I would say" : repeat ? "You have this hint" : "Take a hint"}</span>
          </button>
        </fieldset>
      ) : null}
    </div>
  )
})
