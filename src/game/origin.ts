/**
 * What a career's origin does to the early game (src/data/origins.ts). Pure functions over the origin id, so the store,
 * the shop and the pace model read the same numbers. Every one is the identity for no origin.
 */
import { GIG_BOARD_UNLOCK, JOB_BOARD_UNLOCK } from "../data/phases.ts"
import type { Gig, JobTier, SkillTier } from "../data/phases.ts"
import { isOriginId, originById } from "../data/origins.ts"
import type { OriginEffects, OriginId } from "../data/origins.ts"

export const effectsOfOrigin = (origin: OriginId | null | undefined): OriginEffects => (origin && isOriginId(origin) ? originById(origin).effects : {})

/** The share of a skill's price an origin charges: the cheapest of the matching rows' discounts, or the dearest surcharge, never both. */
export function skillPriceMult(origin: OriginId | null | undefined, row: Pick<SkillTier, "tags">): number {
  const rows = (effectsOfOrigin(origin).skillPrice ?? []).filter((price) => price.tags.some((tag) => row.tags.includes(tag)))
  if (rows.length === 0) return 1
  const discounts = rows.filter((price) => price.mult < 1).map((price) => price.mult)
  if (discounts.length > 0) return Math.min(...discounts)
  return Math.max(...rows.map((price) => price.mult))
}

/** XP a second the origin gives on top of the skills and jobs. */
export const originXpPerSec = (origin: OriginId | null | undefined): number => effectsOfOrigin(origin).xpPerSec ?? 0

/** A gig's lifetime XP requirement under the origin. */
export const gigXpReq = (origin: OriginId | null | undefined, gig: Pick<Gig, "xpReq">): number => Math.round(gig.xpReq * (effectsOfOrigin(origin).gigXp ?? 1))

/** Lifetime XP that opens the Gig Board under the origin. */
export const gigBoardXp = (origin: OriginId | null | undefined): number => Math.round(GIG_BOARD_UNLOCK.minXp * (effectsOfOrigin(origin).gigBoardXp ?? 1))

/** Cleared gigs that open the Job Board under the origin. */
export const jobBoardGigs = (origin: OriginId | null | undefined): number => effectsOfOrigin(origin).jobBoardGigs ?? JOB_BOARD_UNLOCK.minGigsCompleted

/** What a gig pays under the origin. */
export const gigLump = (origin: OriginId | null | undefined, gig: Pick<Gig, "lump">): number => gig.lump * (effectsOfOrigin(origin).gigPay ?? 1)

/** The share of its seed users a cleared gig brings under the origin. */
export const originSeedMult = (origin: OriginId | null | undefined): number => effectsOfOrigin(origin).seeds ?? 1

/** A job's lifetime XP requirement under the origin. */
export function jobXpReq(origin: OriginId | null | undefined, job: Pick<JobTier, "xpReq" | "rank">): number {
  const rule = effectsOfOrigin(origin).jobXp
  return rule && job.rank >= rule.fromRank ? Math.round(job.xpReq * rule.mult) : job.xpReq
}
