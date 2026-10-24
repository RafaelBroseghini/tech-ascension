/**
 * The career's clock. There is no calendar in the game, so the year is read off lifetime XP (which never goes down):
 * the stretch before the first job is school and freelancing, and from the first job each rung of the ladder is a
 * year or more, stretching toward the end of a career. Pure functions over xpTotal, so the year needs no save field.
 * The marks that fall on it are in src/data/careerYears.ts.
 */
import { CAREER_MARKS } from "../data/careerYears.ts"
import type { CareerMark } from "../data/careerYears.ts"
import type { LeadId } from "../data/leadership.ts"
import type { OriginId } from "../data/origins.ts"
import { ORIGIN_ASK_XP } from "../data/origins.ts"
import { firstJobAtRank, GIG_BOARD_UNLOCK, JOB_TIERS } from "../data/phases.ts"

/** Years since the career began at each rank of the ladder (the first job lands in year 5), linear between the rungs named. */
const RANK_YEARS: readonly (readonly [number, number])[] = [
  [1, 4],
  [2, 5],
  [3, 5.5],
  [7, 7.5],
  [14, 11],
  [15, 12],
  [18, 16],
  [24, 25],
  [31, 33],
]

function yearOfRank(rank: number): number {
  for (let index = 1; index < RANK_YEARS.length; index++) {
    const [r1, y1] = RANK_YEARS[index - 1]!
    const [r2, y2] = RANK_YEARS[index]!
    if (rank <= r2) return y1 + ((rank - r1) / (r2 - r1)) * (y2 - y1)
  }
  return RANK_YEARS[RANK_YEARS.length - 1]![1]
}

type Anchor = { xp: number; year: number }

function buildAnchors(): readonly Anchor[] {
  const anchors: Anchor[] = [
    { xp: 0, year: 0 },
    { xp: ORIGIN_ASK_XP, year: 0.5 },
    { xp: GIG_BOARD_UNLOCK.minXp * 0.4, year: 1 },
    { xp: GIG_BOARD_UNLOCK.minXp, year: 2 },
  ]
  const ranks = [...new Set(JOB_TIERS.map((row) => row.rank))].sort((a, b) => a - b)
  for (const rank of ranks) {
    const row = firstJobAtRank(rank)
    if (!row) continue
    const last = anchors[anchors.length - 1]!
    anchors.push({ xp: Math.max(row.xpReq, last.xp + 1), year: Math.max(yearOfRank(rank), last.year) })
  }
  return anchors
}

const ANCHORS: readonly Anchor[] = buildAnchors()

/** Years since the career began, for a career that has earned this much lifetime XP. Rises with XP and never falls. */
export function careerYear(xpTotal: number): number {
  if (!(xpTotal > 0)) return 0
  const last = ANCHORS[ANCHORS.length - 1]!
  if (xpTotal >= last.xp) return last.year
  for (let index = 1; index < ANCHORS.length; index++) {
    const from = ANCHORS[index - 1]!
    const to = ANCHORS[index]!
    if (xpTotal <= to.xp) return from.year + ((xpTotal - from.xp) / (to.xp - from.xp)) * (to.year - from.year)
  }
  return last.year
}

/** The year as the player reads it: the first year of a career is Year 1. */
export const yearNumber = (xpTotal: number): number => Math.floor(careerYear(xpTotal)) + 1

/** The same for a mark: `at` 0.5 is in Year 1. */
export const markYear = (mark: Pick<CareerMark, "at">): number => Math.floor(mark.at) + 1

/** The marks a career has, in the order they fall: everyone's, its origin's and its leadership line's. */
export function marksFor(origin: OriginId | null | undefined, lead: LeadId | null | undefined): CareerMark[] {
  return CAREER_MARKS.filter((mark) => (!mark.origin || mark.origin === origin) && (!mark.lead || mark.lead === lead)).sort((a, b) => a.at - b.at)
}

/** Marks the career has reached (their year has come), in order. */
export function reachedMarks(xpTotal: number, origin: OriginId | null | undefined, lead: LeadId | null | undefined): CareerMark[] {
  const year = careerYear(xpTotal)
  return marksFor(origin, lead).filter((mark) => mark.at <= year)
}

/** The next marks still ahead, soonest first. */
export function upcomingMarks(xpTotal: number, origin: OriginId | null | undefined, lead: LeadId | null | undefined, count: number): CareerMark[] {
  const year = careerYear(xpTotal)
  return marksFor(origin, lead).filter((mark) => mark.at > year).slice(0, count)
}

export function markById(id: string): CareerMark | undefined {
  return CAREER_MARKS.find((mark) => mark.id === id)
}
