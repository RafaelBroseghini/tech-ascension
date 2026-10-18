import { scalePurchaseCost } from "./costs.ts"

/**
 * 10x dev skills ("gold" in the code): one-off perks bought once with spendable XP. They are not part of the 104-skill grind;
 * they bend the rules of play instead of adding income. Each one opens at a lifetime-XP milestone, so
 * the first reaches the player in the early game and the last well past it.
 *
 * Three families, each a chain (a row waits on the one before it in its family):
 *  - buy: the Buy amount control. Without any, every purchase is a single copy.
 *  - hover: hovering the stage emoji clicks for you, faster with each tier. Owning every catalog row
 *    still grants the top 20/s on its own (see `MAX_CLICKS_PER_SEC`).
 *  - away: how much time away is paid on return. The default is 8 hours.
 */
export type GoldFamily = "buy" | "hover" | "away"

export type GoldEffect =
  | { kind: "buyStep"; step: 5 | 10 | "max" }
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
  /** Spendable XP, already scaled like every other price. */
  cost: number
}

type GoldRow = Omit<GoldSkill, "cost">

const GOLD_ROWS: readonly GoldRow[] = [
  { id: 1, name: "Bulk Buy ×5", blurb: "Buy up to 5 copies of a row in one click.", family: "buy", effect: { kind: "buyStep", step: 5 }, unlockXp: 8_000 },
  { id: 2, name: "Hover Tap", blurb: "Rest the pointer on the emoji, or hold it on touch, to click 2 times a second.", family: "hover", effect: { kind: "hoverRate", perSec: 2 }, unlockXp: 20_000 },
  { id: 3, name: "Bulk Buy ×10", blurb: "Buy up to 10 copies of a row in one click.", family: "buy", effect: { kind: "buyStep", step: 10 }, unlockXp: 60_000 },
  { id: 4, name: "Overnight Cron", blurb: "Time away pays for up to 12 hours.", family: "away", effect: { kind: "offlineCap", hours: 12 }, unlockXp: 100_000 },
  { id: 5, name: "Hover Rhythm", blurb: "Hover clicking speeds up to 5 times a second.", family: "hover", effect: { kind: "hoverRate", perSec: 5 }, unlockXp: 250_000 },
  { id: 6, name: "Bulk Buy Max", blurb: "Add a Max amount: buy every copy you can afford.", family: "buy", effect: { kind: "buyStep", step: "max" }, unlockXp: 600_000 },
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
  buy: "Buying",
  hover: "Hover clicking",
  away: "Time away",
}
