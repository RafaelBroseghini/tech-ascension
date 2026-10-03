import type { EventOffer } from "../data/events.ts"
import { promptsForJob, reviewById } from "../data/reviews.ts"
import type { ReviewChoiceId, ReviewPrompt, ReviewReply } from "../data/reviews.ts"
import { sampleWaitMs } from "./boosts.ts"
import type { EventLine, EventResolution, EarningRates } from "./events.ts"
import { previewOffer, resolveOffer } from "./events.ts"

export { promptsForJob, reviewById }
export type { ReviewChoiceId, ReviewPrompt, ReviewReply }

/** About three event-waits. A 1:1 should feel rare next to the random-event clock. */
export const REVIEW_MEAN_WAIT_MS = 12 * 60 * 1000

/** A blocked roll (fight, event, or a review already up) fires this long after the block lifts. */
export const REVIEW_AFTER_BLOCK_MS = 5_000

/** Raise: minutes of current income, same stake rules as a gift. */
export const EXCEEDS_MINUTES = 12

/** The plan: minutes of XP gained and of money spent, same stake rules as a trade. */
export const PIP_MINUTES = 10

const EXCEEDS_OFFER: EventOffer = { kind: "gift", resource: "money", minutes: EXCEEDS_MINUTES }
const PIP_OFFER: EventOffer = { kind: "trade", gain: "xp", minutes: PIP_MINUTES }

const CHOICES: readonly ReviewChoiceId[] = ["exceeds", "meets", "pip"]

export function isReviewChoice(value: unknown): value is ReviewChoiceId {
  return typeof value === "string" && (CHOICES as readonly string[]).includes(value)
}

export function offerForChoice(choice: ReviewChoiceId): EventOffer | null {
  if (choice === "exceeds") return EXCEEDS_OFFER
  if (choice === "pip") return PIP_OFFER
  return null
}

export type ReviewPreview = {
  lines: EventLine[]
  canAccept: boolean
}

/** What this reply would do right now. Meets is always available and moves nothing. */
export function previewReviewChoice(choice: ReviewChoiceId, rates: EarningRates, money: number, xp: number): ReviewPreview {
  const offer = offerForChoice(choice)
  if (!offer) return { lines: [], canAccept: true }
  const preview = previewOffer(offer, rates, money, xp)
  return { lines: preview.lines, canAccept: preview.canAccept }
}

/** Applies the reply. Meets returns the same balances with applied set. A refused plan changes nothing. */
export function resolveReviewChoice(
  choice: ReviewChoiceId,
  money: number,
  xp: number,
  xpTotal: number,
  rates: EarningRates,
): EventResolution {
  const offer = offerForChoice(choice)
  if (!offer) return { money, xp, xpTotal, lines: [], applied: true }
  return resolveOffer(money, xp, xpTotal, offer, rates)
}

export function pickPrompt(pool: readonly ReviewPrompt[], rand: number): ReviewPrompt | null {
  if (pool.length === 0) return null
  const index = Math.min(pool.length - 1, Math.floor(Math.min(Math.max(rand, 0), 0.999999999) * pool.length))
  return pool[index] ?? null
}

export type ReviewContext = {
  /** Highest job held. Null skips the clock entirely. */
  jobId: number | null
  blocked: boolean
}

export type ReviewAdvance = {
  nextReviewAt: number | null
  fire: ReviewPrompt | null
}

/**
 * Same shape as the event clock. No job means no schedule and no roll.
 * After a fire the slot stays empty until the meeting closes, so two 1:1s never overlap.
 */
export function advanceReviewClock(
  nextReviewAt: number | null,
  ctx: ReviewContext,
  now: number,
  rng: () => number,
): ReviewAdvance {
  if (ctx.jobId == null) return { nextReviewAt: null, fire: null }
  if (ctx.blocked) {
    if (nextReviewAt === null) return { nextReviewAt: null, fire: null }
    return { nextReviewAt: Math.max(nextReviewAt, now + REVIEW_AFTER_BLOCK_MS), fire: null }
  }
  const dueAt = nextReviewAt ?? now + sampleWaitMs(REVIEW_MEAN_WAIT_MS, rng())
  if (now < dueAt) return { nextReviewAt: dueAt, fire: null }
  const fire = pickPrompt(promptsForJob(ctx.jobId), rng())
  if (!fire) return { nextReviewAt: now + sampleWaitMs(REVIEW_MEAN_WAIT_MS, rng()), fire: null }
  return { nextReviewAt: null, fire }
}
