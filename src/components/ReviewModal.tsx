import { useEffect, useMemo, useRef } from "react"
import { jobById, production } from "../game/economy.ts"
import { modsOf } from "../game/mods.ts"
import { previewReviewChoice, reviewById } from "../game/reviews.ts"
import { useGame } from "../game/store.ts"
import type { ActiveReview } from "../game/store.ts"

/**
 * One 1:1 at a time. Nothing is applied until a reply is chosen. Escape and the backdrop
 * leave the meeting. Meets is a real reply that moves nothing. The plan stays disabled
 * when its cost cannot be paid.
 */
export function ReviewModal() {
  const review = useGame((state) => state.review)
  if (!review) return null
  return <ReviewDialog review={review} />
}

function ReviewDialog({ review }: { review: ActiveReview }) {
  const money = useGame((state) => state.money)
  const xp = useGame((state) => state.xp)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const founder = useGame((state) => state.founder)
  const activeBoost = useGame((state) => state.activeBoost)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const now = useGame((state) => state.now)
  const answer = useGame((state) => state.answerReview)
  const dismiss = useGame((state) => state.dismissReview)
  const view = useMemo(() => {
    const prompt = reviewById(review.promptId)
    if (!prompt) return null
    const rates = production({ skills, equipment, owned, jobs, gigs, founder }, activeBoost, now, modsOf({ foreverMult, tempMults }))
    const earning = {
      cps: rates.idle,
      click: rates.click,
      xpPerSec: rates.xpIdle,
      xpPerClick: rates.xpClick * rates.mult,
    }
    return {
      jobName: jobById(review.jobId)?.name ?? "Your job",
      question: prompt.question,
      replies: prompt.replies.map((reply) => ({
        ...reply,
        preview: previewReviewChoice(reply.choice, earning, money, xp),
      })),
    }
  }, [review, money, xp, skills, equipment, owned, jobs, gigs, founder, activeBoost, foreverMult, tempMults, now])
  const dialogRef = useRef<HTMLDivElement>(null)
  const reviewId = review.id

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [reviewId, dismiss])

  if (!view) return null

  return (
    <div className="event-backdrop" data-testid="review-backdrop" onClick={dismiss}>
      <div
        ref={dialogRef}
        key={review.id}
        className="event-modal review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        tabIndex={-1}
        data-testid="review-modal"
        data-prompt={review.promptId}
        onClick={(click) => click.stopPropagation()}
      >
        <p className="event-kicker">1:1</p>
        <h2 id="review-title" className="event-title">
          {view.jobName}
        </h2>
        <p className="event-flavor">{view.question}</p>
        <ul className="review-choices">
          {view.replies.map((reply) => (
            <li key={reply.choice}>
              <button
                type="button"
                className={`review-choice is-${reply.choice}`}
                data-testid={`review-${reply.choice}`}
                data-choice={reply.choice}
                disabled={!reply.preview.canAccept}
                onClick={() => answer(reply.choice)}
              >
                <span className="review-rating">{reply.rating}</span>
                <span className="review-say">{reply.label}</span>
                <span className="review-stake">
                  {reply.preview.lines.length > 0 ? (
                    reply.preview.lines.map((line) => (
                      <span key={line.text} className={line.tone === "good" ? "is-good" : "is-bad"}>
                        {line.text}
                      </span>
                    ))
                  ) : (
                    <span className="is-quiet">No change</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
