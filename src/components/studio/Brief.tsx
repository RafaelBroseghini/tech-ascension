import { memo, useMemo } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { evaluate } from "../../game/studio/evaluate.ts"
import { noHirePenalty } from "../../game/studio/interviews.ts"
import { faultTally, verdict } from "../../game/studio/score.ts"
import type { TargetName } from "../../game/studio/types.ts"
import { draftOf, useBoard } from "./boardStore.ts"
import { money, requestList } from "./kinds.ts"
import { MeterList } from "./MeterList.tsx"
import { meters } from "./meters.ts"
import { jobOf } from "./status.ts"
import type { ReachableStatus } from "./status.ts"

const ms = (x: number) => (Number.isFinite(x) ? `${Math.round(x)} ms` : "forever")

/**
 * The interviewer's prompt, the live meters, what the board leaves unrouted, and the Submit button. While the interview
 * is open nothing here says whether the board would pass. Once it is passed the same board is a practice run, and the
 * meters show pass or fail and the best so far.
 */
export const Brief = memo(function Brief({
  interview,
  status,
  onSubmit,
}: {
  interview: Interview
  status: ReachableStatus
  onSubmit: () => void
}) {
  const draft = useBoard(draftOf)
  const revealing = useBoard((s) => Boolean(s.run?.revealing))
  // A Submit flips the status the moment it lands; the board keeps reading as the interview until the reveal ends.
  const submitting = useBoard((s) => Boolean(s.run?.revealing && !s.run.practice))
  const best = useGame((s) => s.interviews[interview.id]?.best)
  const practicing = status !== "open" && !submitting
  const result = useMemo(() => evaluate(draft, interview.scenario), [draft, interview])
  const live = useMemo(() => meters(result, interview.targets, faultTally(result, interview.targets)), [result, interview])
  const missed = useMemo<ReadonlySet<TargetName> | undefined>(() => {
    if (!practicing) return undefined
    const judged = verdict(result, interview.targets, draft)
    return new Set(judged.kind === "noHire" ? judged.missed.map((miss) => miss.target) : [])
  }, [practicing, result, interview, draft])
  const { unrouted } = result
  const penalty = noHirePenalty(interview)
  const job = jobOf(interview)?.name ?? "a job"

  return (
    <section className="studio-brief" aria-labelledby="studio-brief-title">
      <p className="studio-kicker" data-testid="studio-kicker" data-practice={practicing}>
        {practicing ? `Practice · ${job}` : `Interview for ${job}`}
      </p>
      <h2 id="studio-brief-title">{interview.name}</h2>
      <p className="studio-brief-text" data-testid="studio-brief">
        {interview.brief}
      </p>
      <MeterList meters={live} failed={missed} testid="studio-live-meter" />
      {practicing && best ? (
        <p className="studio-best" data-testid="studio-best">{`Best: ${money(best.costPerMonth)}/mo at p95 ${ms(best.p95Ms)}`}</p>
      ) : null}
      {unrouted.length > 0 ? (
        <p className="studio-warn" role="status" data-testid="studio-unrouted" data-unrouted={unrouted.join(",")}>
          {`Unrouted: nothing on this board answers ${requestList(unrouted)}. They will fail.`}
        </p>
      ) : null}
      <div className="studio-submit-row">
        <button type="button" className="studio-submit" data-testid="studio-submit" disabled={revealing} onClick={onSubmit}>
          {practicing ? "Run it again (practice)" : "Submit to interviewer"}
        </button>
        {practicing ? null : <span className="studio-penalty" data-testid="studio-penalty">{`No hire costs ${penalty.toLocaleString("en-US")} XP`}</span>}
      </div>
    </section>
  )
})
