import type { ActiveBoost } from "../data/boosts.ts"
import { COST_GROWTH, TIERS } from "../data/tiers.ts"
import type { Tier } from "../data/tiers.ts"

/**
 * Balances and costs are IEEE-754 doubles.
 *
 * `Math.floor` is exact only while the result is <= Number.MAX_SAFE_INTEGER
 * (~9.01e15). Foundry and Mars tiers (~1e16–5e22) still play, but the last
 * dollars are approximate. When exact integers past ~1e15 matter, swap this
 * module for decimal.js or break_infinity.js. Call sites should keep using
 * `nextCost`, `clickPower`, `idlePerSec`, and `production`.
 */
export type OwnedMap = Record<string, number>

export const BASE_CLICK = 1

const TIER_BY_ID = new Map<number, Tier>(TIERS.map((tier) => [tier.id, tier]))

export function tierById(id: number): Tier | undefined {
  return TIER_BY_ID.get(id)
}

export function ownedCount(owned: OwnedMap, id: number): number {
  const value = owned[String(id)]
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0
}

/** nextCost = floor(baseCost × COST_GROWTH ^ owned). Owned 0 returns baseCost. */
export function nextCost(baseCost: number, owned: number): number {
  if (!Number.isFinite(baseCost) || baseCost < 0) return Number.POSITIVE_INFINITY
  const count = Number.isFinite(owned) && owned > 0 ? Math.floor(owned) : 0
  if (count === 0) return baseCost
  return Math.floor(baseCost * COST_GROWTH ** count)
}

export function canAfford(money: number, cost: number): boolean {
  if (!Number.isFinite(money) || !Number.isFinite(cost) || cost < 0) return false
  if (money >= cost) return true
  return cost - money <= Math.max(1, Math.abs(cost)) * 1e-8
}

export function clickPower(owned: OwnedMap): number {
  let bonus = 0
  for (const tier of TIERS) {
    bonus += ownedCount(owned, tier.id) * tier.clickBonus
  }
  return BASE_CLICK + bonus
}

/** Idle $/s from generators. Click boosts do not apply. */
export function idlePerSec(owned: OwnedMap): number {
  let cps = 0
  for (const tier of TIERS) {
    cps += ownedCount(owned, tier.id) * tier.cps
  }
  return cps
}

export function highestOwnedTier(owned: OwnedMap): Tier | null {
  let best: Tier | null = null
  for (const tier of TIERS) {
    if (ownedCount(owned, tier.id) <= 0) continue
    if (!best || tier.id > best.id) best = tier
  }
  return best
}

export function boostMultiplier(boost: ActiveBoost | null | undefined, now: number): number {
  if (!boost) return 1
  if (!(boost.endsAt > now)) return 1
  if (!Number.isFinite(boost.mult) || boost.mult <= 0) return 1
  return boost.mult
}

/** Click gain includes the boost. Idle never does. */
export function production(
  owned: OwnedMap,
  boost: ActiveBoost | null | undefined,
  now: number,
): { click: number; idle: number; mult: number } {
  const mult = boostMultiplier(boost, now)
  return {
    click: clickPower(owned) * mult,
    idle: idlePerSec(owned),
    mult,
  }
}

export function quotePurchase(
  money: number,
  baseCost: number,
  owned: number,
  mode: "one" | "max",
): { count: number; total: number } {
  const empty = { count: 0, total: 0 }
  if (mode === "one") {
    const cost = nextCost(baseCost, owned)
    if (!(cost > 0) || !canAfford(money, cost)) return empty
    return { count: 1, total: cost }
  }

  let count = 0
  let total = 0
  let pool = money
  let have = owned
  for (let i = 0; i < 5000; i++) {
    const cost = nextCost(baseCost, have)
    if (!(cost > 0) || !Number.isFinite(cost) || !canAfford(pool, cost)) break
    pool -= cost
    total += cost
    have += 1
    count += 1
  }
  return { count, total }
}
