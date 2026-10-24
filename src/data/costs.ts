/**
 * One multiplier for every catalog purchase price: skill XP costs and the money
 * prices on jobs, gear and capital. Payouts (cps, click bonuses, gig lumps and
 * retainers) and gates (unlock XP, unlock money, board thresholds) stay as written.
 * Gigs have no purchase price, so this scale does not touch them.
 */
export const PURCHASE_COST_SCALE = 0.85

/** A zero price (the free internship) stays free. */
export function scalePurchaseCost(cost: number): number {
  if (!Number.isFinite(cost) || cost <= 0) return cost
  return cost * PURCHASE_COST_SCALE
}

/**
 * The opening is the one stretch where the gates are the grind: the Gig Board, the first gigs and the first jobs ask for
 * lifetime XP that a new career spends minutes climbing toward. Two rules bring them forward without bunching them up.
 *
 * Gigs keep the table's spacing and only start sooner: every gig asks for `GIG_HEAD_START` XP less, so the Gig Board
 * opens about three minutes in and a new gig follows every fifteen seconds or so, as it always did. Scaling them down
 * instead packs twenty gigs into the same minute, which is the bunch a player sees as "everything unlocked at once".
 *
 * The first jobs are set by hand: the table's steps between the internship and Mid-level SWE read as a staircase
 * (`JOB_STEPS`), each a half minute or so apart, and anything past the last step keeps the table's spacing, less
 * what the staircase saved, so the curve has no step in it.
 */
export const GIG_HEAD_START = 9_900

export function openingGigXp(xp: number): number {
  return xp > 0 ? Math.max(1, xp - GIG_HEAD_START) : xp
}

/** [what the table asks, what the opening asks], for the first seven ranks of the ladder. */
const JOB_STEPS: readonly (readonly [number, number])[] = [
  [35_000, 12_000],
  [45_000, 17_000],
  [50_000, 20_000],
  [55_000, 24_000],
  [60_000, 28_000],
  [70_000, 34_000],
  [90_000, 48_000],
]
/** The share of a lump of XP kept on the rows of the staircase, so a lump still closes about the same share of the next gap. */
export const OPENING_LUMP_SHARE = 0.4

export function openingJobXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return xp
  const first = JOB_STEPS[0]!
  if (xp <= first[0]) return Math.round((xp / first[0]) * first[1])
  for (let index = 1; index < JOB_STEPS.length; index++) {
    const [from, fromTo] = JOB_STEPS[index - 1]!
    const [to, toTo] = JOB_STEPS[index]!
    if (xp <= to) return Math.round(fromTo + ((xp - from) / (to - from)) * (toTo - fromTo))
  }
  const [last, lastTo] = JOB_STEPS[JOB_STEPS.length - 1]!
  return xp - (last - lastTo)
}

/** Whether a job's row is on the staircase (its table value is one the opening reshapes). */
export const onJobStairs = (xp: number): boolean => xp <= JOB_STEPS[JOB_STEPS.length - 1]![0]
