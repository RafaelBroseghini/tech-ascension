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
