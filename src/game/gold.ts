import { GOLD_SKILLS } from "../data/gold.ts"
import { perkEffects } from "./perks.ts"
import type { GoldSkill } from "../data/gold.ts"
import { MAX_CLICKS_PER_SEC } from "./autoClick.ts"
import { canAfford } from "./economy.ts"
import { heldRank } from "./build.ts"
import type { BuildState } from "./build.ts"

const GOLD_BY_ID = new Map<number, GoldSkill>(GOLD_SKILLS.map((row) => [row.id, row]))

export const goldById = (id: number): GoldSkill | undefined => GOLD_BY_ID.get(id)

/** The gold rows a save holds, in table order. Unknown ids are dropped. */
export function ownedGold(gold: readonly number[]): GoldSkill[] {
  return GOLD_SKILLS.filter((row) => gold.includes(row.id))
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

/** `jobs` (and `build`, for the rank a switch kept) are the career's jobs: a row with a job rank waits on it. Left out, the rank is not tracked and the row opens on XP alone. */
export type GoldGates = { xpTotal: number; gold: readonly number[]; jobs?: readonly number[]; build?: BuildState }

/** A gold row shows once lifetime XP reaches its gate and a job of its rank is held, or when it is already owned. */
export function isGoldRevealed(row: GoldSkill, p: GoldGates): boolean {
  if (p.gold.includes(row.id)) return true
  if (p.xpTotal < row.unlockXp) return false
  return !row.unlockJobRank || p.jobs === undefined || heldRank({ jobs: p.jobs, build: p.build }) >= row.unlockJobRank
}

/** The gold section stays out of the shop until the first row is in reach. */
export function goldSectionOpen(p: GoldGates): boolean {
  return p.gold.length > 0 || GOLD_SKILLS.some((row) => isGoldRevealed(row, p))
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
