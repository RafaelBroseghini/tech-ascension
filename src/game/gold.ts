import { GOLD_SKILLS } from "../data/gold.ts"
import { perkEffects } from "./perks.ts"
import type { GoldSkill } from "../data/gold.ts"
import { MAX_CLICKS_PER_SEC } from "./autoClick.ts"
import { canAfford } from "./economy.ts"

/** How many copies of a repeatable row one click buys. "max" is every copy the budget covers. */
export type BuyAmount = 1 | 5 | 10 | "max"

/** Amounts in the order the Buy control lists them. */
export const BUY_AMOUNTS: readonly BuyAmount[] = [1, 5, 10, "max"]

const GOLD_BY_ID = new Map<number, GoldSkill>(GOLD_SKILLS.map((row) => [row.id, row]))

export const goldById = (id: number): GoldSkill | undefined => GOLD_BY_ID.get(id)

/** The gold rows a save holds, in table order. Unknown ids are dropped. */
export function ownedGold(gold: readonly number[]): GoldSkill[] {
  return GOLD_SKILLS.filter((row) => gold.includes(row.id))
}

/** Amounts the player may pick. One copy is always on the list. */
export function buyAmounts(gold: readonly number[]): BuyAmount[] {
  const steps = new Set<BuyAmount>([1])
  for (const row of ownedGold(gold)) if (row.effect.kind === "buyStep") steps.add(row.effect.step)
  return BUY_AMOUNTS.filter((amount) => steps.has(amount))
}

/** The largest unlocked amount that does not pass `want`. A request nothing unlocks falls back to one copy. */
export function clampBuyAmount(gold: readonly number[], want: BuyAmount): BuyAmount {
  const allowed = buyAmounts(gold)
  const rank = BUY_AMOUNTS.indexOf(want)
  let best: BuyAmount = 1
  for (const amount of allowed) if (BUY_AMOUNTS.indexOf(amount) <= rank) best = amount
  return best
}

/** Turns the loose modes the store accepts ("one", "max", a count) into a BuyAmount. */
export function toBuyAmount(mode: "one" | "max" | number): BuyAmount {
  if (mode === "max") return "max"
  if (mode === "one" || !(mode > 1)) return 1
  return mode >= 10 ? 10 : mode >= 5 ? 5 : 1
}

/** Hover clicks per second. Zero until a hover skill is owned; owning every catalog row always grants the ceiling. */
export function hoverRate(gold: readonly number[], catalogComplete: boolean): number {
  let rate = catalogComplete ? MAX_CLICKS_PER_SEC : 0
  for (const row of ownedGold(gold)) if (row.effect.kind === "hoverRate") rate = Math.max(rate, row.effect.perSec)
  return Math.min(rate, MAX_CLICKS_PER_SEC)
}

/** How much time away is paid. `baseMs` is the default cap with no gold. `perks` are the Legacy perks held: Long weekend adds its hours on top. */
export function offlineCapMs(gold: readonly number[], baseMs: number, perks?: readonly string[]): number {
  let cap = baseMs
  for (const row of ownedGold(gold)) if (row.effect.kind === "offlineCap") cap = Math.max(cap, row.effect.hours * 3_600_000)
  return cap + perkEffects(perks).offlineHours * 3_600_000
}

export type GoldGates = { xpTotal: number; gold: readonly number[] }

/** A gold row shows once lifetime XP reaches its gate, or when it is already owned. */
export function isGoldRevealed(row: GoldSkill, p: GoldGates): boolean {
  return p.gold.includes(row.id) || p.xpTotal >= row.unlockXp
}

/** The gold section stays out of the shop until the first row is in reach. */
export function goldSectionOpen(p: GoldGates): boolean {
  return p.gold.length > 0 || GOLD_SKILLS.some((row) => p.xpTotal >= row.unlockXp)
}

/**
 * Rows to list: everything owned, plus the next unowned row of each family (even while its gate is
 * shut, so the next perk is never a blank), ordered by the XP that opens them.
 */
export function visibleGold(gold: readonly number[]): GoldSkill[] {
  const seen = new Set<string>()
  const rows: GoldSkill[] = []
  for (const row of GOLD_SKILLS) {
    if (gold.includes(row.id)) {
      rows.push(row)
      continue
    }
    if (seen.has(row.family)) continue
    seen.add(row.family)
    rows.push(row)
  }
  return rows.sort((a, b) => a.unlockXp - b.unlockXp)
}

/** The row of this family the player can buy next: the first not yet owned. */
export function nextInFamily(gold: readonly number[], row: GoldSkill): boolean {
  return GOLD_SKILLS.find((other) => other.family === row.family && !gold.includes(other.id))?.id === row.id
}

export function canBuyGold(p: GoldGates & { xp: number }, row: GoldSkill): boolean {
  if (p.gold.includes(row.id)) return false
  if (!isGoldRevealed(row, p)) return false
  if (!nextInFamily(p.gold, row)) return false
  return canAfford(p.xp, row.cost)
}
