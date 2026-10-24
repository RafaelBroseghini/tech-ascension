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
 * lifetime XP that a new career spends minutes climbing toward. Gates below the knee ask for this share of what the
 * table writes, and the ones past it ask the same less the XP the share saved, so the curve stays one rising line with
 * no step in it. Skills keep their prices; only what the career has to have earned comes sooner.
 */
export const OPENING_XP_KNEE = 60_000
export const OPENING_XP_SHARE = 0.15

export function openingXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return xp
  return Math.round(xp <= OPENING_XP_KNEE ? xp * OPENING_XP_SHARE : xp - OPENING_XP_KNEE * (1 - OPENING_XP_SHARE))
}
