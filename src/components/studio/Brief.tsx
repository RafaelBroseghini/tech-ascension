import { memo, useMemo } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { costPerMonth, evaluate } from "../../game/studio/evaluate.ts"
import { noHirePenalty } from "../../game/studio/interviews.ts"
import { draftOf, useBoard } from "./boardStore.ts"
import { money, requestList } from "./kinds.ts"
import { jobOf } from "./status.ts"
import type { InterviewStatus } from "./status.ts"

/** The interviewer's prompt, the live bill, what the board leaves unrouted, and the Submit button. */
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
  const { unrouted, cost } = useMemo(() => {
    const result = evaluate(draft, interview.scenario)
    return { unrouted: result.unrouted, cost: costPerMonth(draft) }
  }, [draft, interview])
  const budget = interview.targets.budgetPerMonth
  const penalty = noHirePenalty(interview)

  return (
    <section className="studio-brief" aria-labelledby="studio-brief-title">
      <p className="studio-kicker">{`Interview for ${jobOf(interview)?.name ?? "a job"}`}</p>
      <h2 id="studio-brief-title">{interview.name}</h2>
      <p className="studio-brief-text" data-testid="studio-brief">
        {interview.brief}
      </p>
      <p className={cost > budget ? "studio-bill is-over" : "studio-bill"} data-testid="studio-bill">
        {`Bill so far ${money(cost)} of ${money(budget)} a month`}
      </p>
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
