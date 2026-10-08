import { memo, useMemo } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { evaluate } from "../../game/studio/evaluate.ts"
import { noHirePenalty } from "../../game/studio/interviews.ts"
import { faultTally } from "../../game/studio/score.ts"
import { draftOf, useBoard } from "./boardStore.ts"
import { requestList } from "./kinds.ts"
import { MeterList } from "./MeterList.tsx"
import { meters } from "./meters.ts"
import { jobOf } from "./status.ts"
import type { InterviewStatus } from "./status.ts"

/** The interviewer's prompt, the live meters, what the board leaves unrouted, and the Submit button. */
export const Brief = memo(function Brief({
  interview,
  status,
  onSubmit,
}: {
  interview: Interview
  status: InterviewStatus
  onSubmit: () => void
}) {
  const draft = useBoard(draftOf)
  const revealing = useBoard((s) => Boolean(s.run?.revealing))
  const result = useMemo(() => evaluate(draft, interview.scenario), [draft, interview])
  const live = useMemo(() => meters(result, interview.targets, faultTally(result, interview.targets)), [result, interview])
  const { unrouted } = result
  const penalty = noHirePenalty(interview)

  return (
    <section className="studio-brief" aria-labelledby="studio-brief-title">
      <p className="studio-kicker">{`Interview for ${jobOf(interview)?.name ?? "a job"}`}</p>
      <h2 id="studio-brief-title">{interview.name}</h2>
      <p className="studio-brief-text" data-testid="studio-brief">
        {interview.brief}
      </p>
      <MeterList meters={live} testid="studio-live-meter" />
      {unrouted.length > 0 ? (
        <p className="studio-warn" role="status" data-testid="studio-unrouted" data-unrouted={unrouted.join(",")}>
          {`Unrouted: nothing on this board answers ${requestList(unrouted)}. They will fail.`}
        </p>
      ) : null}
      <div className="studio-submit-row">
        <button
          type="button"
          className="studio-submit"
          data-testid="studio-submit"
          disabled={status !== "open" || revealing}
          onClick={onSubmit}
        >
          {status === "open" ? "Submit to interviewer" : status === "hired" ? "Hired" : "Passed"}
        </button>
        {status === "open" ? (
          <span className="studio-penalty" data-testid="studio-penalty">{`No hire costs ${penalty.toLocaleString("en-US")} XP`}</span>
        ) : null}
      </div>
    </section>
  )
})
