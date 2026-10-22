import { scalePurchaseCost } from "./costs.ts"

/**
 * 10x dev skills ("gold" in the code): one-off perks bought once with spendable XP. They are not part of the 104-skill grind;
 * they bend the rules of play instead of adding income. Each one opens at a lifetime-XP milestone, so
 * the first reaches the player in the early game and the last well past it.
 *
 * Two families, each a chain (a row waits on the one before it in its family):
 *  - hover: hovering the stage emoji clicks for you, faster with each tier. Owning every catalog row
 *    still grants the top 20/s on its own (see `MAX_CLICKS_PER_SEC`).
 *  - away: how much time away is paid on return. The default is 8 hours.
 */
export type GoldFamily = "hover" | "away"

export type GoldEffect =
  | { kind: "hoverRate"; perSec: number }
  | { kind: "offlineCap"; hours: number }

export type GoldSkill = {
  id: number
  name: string
  /** One line shown under the name. */
  blurb: string
  family: GoldFamily
  effect: GoldEffect
  /** Lifetime XP that opens the row. */
  unlockXp: number
  /** The job rank that also opens it, 0 or left out for none: hover clicking waits for a Senior SWE (rank 14). */
  unlockJobRank?: number
  /** Spendable XP, already scaled like every other price. */
  cost: number
}

type GoldRow = Omit<GoldSkill, "cost">

const GOLD_ROWS: readonly GoldRow[] = [
  { id: 2, name: "Hover Tap", blurb: "Rest the pointer on the emoji, or hold it on touch, to click 2 times a second.", family: "hover", effect: { kind: "hoverRate", perSec: 2 }, unlockXp: 20_000, unlockJobRank: 14 },
  { id: 4, name: "Overnight Cron", blurb: "Time away pays for up to 12 hours.", family: "away", effect: { kind: "offlineCap", hours: 12 }, unlockXp: 100_000 },
  { id: 5, name: "Hover Rhythm", blurb: "Hover clicking speeds up to 5 times a second.", family: "hover", effect: { kind: "hoverRate", perSec: 5 }, unlockXp: 250_000 },
  { id: 7, name: "Hover Flow", blurb: "Hover clicking speeds up to 10 times a second.", family: "hover", effect: { kind: "hoverRate", perSec: 10 }, unlockXp: 1_500_000 },
  { id: 8, name: "Weekend Cron", blurb: "Time away pays for up to 16 hours.", family: "away", effect: { kind: "offlineCap", hours: 16 }, unlockXp: 3_000_000 },
  { id: 9, name: "Hover Overdrive", blurb: "Hover clicking speeds up to 15 times a second.", family: "hover", effect: { kind: "hoverRate", perSec: 15 }, unlockXp: 8_000_000 },
  { id: 10, name: "Sabbatical", blurb: "Time away pays for up to 24 hours.", family: "away", effect: { kind: "offlineCap", hours: 24 }, unlockXp: 20_000_000 },
]

export const GOLD_COST_SHARE = 0.25

export const GOLD_SKILLS: readonly GoldSkill[] = GOLD_ROWS.map((row) => ({
  ...row,
  cost: scalePurchaseCost(Math.round(row.unlockXp * GOLD_COST_SHARE)),
}))

export const GOLD_FAMILY_NAME: Record<GoldFamily, string> = {
  hover: "Hover clicking",
  away: "Time away",
}
