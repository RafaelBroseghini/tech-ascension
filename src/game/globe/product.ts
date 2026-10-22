import type { SpecId } from "../../data/specializations.ts"
import { effectsOf } from "../../data/specializations.ts"
import { leadById } from "../../data/leadership.ts"
import type { BuildFacts } from "../build.ts"
import { hireBonusOf, hirePayrollOf } from "./hires.ts"
import type { Ending, Hires } from "./hires.ts"
import { prestigeMult } from "../mods.ts"
import { perkEffects } from "../perks.ts"

/** What the growth model reads from the career: the hires, the Legacy perks and the leadership line. */
export interface ProductFacts {
  /** The whole growth multiplier: 1 for the player's own pace (`GROWTH_PER_SEC`), scaled by the perks, plus what the hires add. */
  readonly growthMult: number
  /** The part of `growthMult` the hires add. */
  readonly hireBonus: number
  readonly revenueMult: number
  /** Dollars a second the hires cost now. */
  readonly payroll: number
  /** What dropped requests cost, in dollars and in users who leave (1 is the plain ladder). */
  readonly dropsMult: number
  /** How often the world throws an incident and how hard a block or a law bleeds. */
  readonly incidentMult: number
  /** What each cleared gig seeds its region with. */
  readonly seedMult: number
  /** The ending the leadership line forces on a win. Left out with no line picked: the hires' share decides. */
  readonly ending?: Ending
}

/** What the Legacy block gives the product: the perks held and the Prestige total behind the permanent bonus. */
export interface LegacyFacts {
  readonly perks: readonly string[]
  readonly prestigeTotal: number
}

/** Growth an IC adds for each IC-line job held: the multiplier is 1 for the player's own pace, a small team is a few. Five rows make the line. */
export const IC_GROWTH_PER_ROW = 3

export const NO_BUILD: BuildFacts = { spec: null, lead: null, icRows: 0 }

/**
 * The facts for the growth model. Growth is scaled once by the permanent Prestige bonus, Viral loop and the
 * specialization's growth factor; the hires' part is scaled with it, so the team's share of the growth does not change.
 * An IC adds its own growth for each IC-line row held, scaled the same way but not counted as the team's. A leadership
 * line decides the ending of a win (IC: night owl, Manager: sponsor); without one, the hires' share does. Hires held
 * under IC still grow the product and still draw their salaries. The specialization's other effects (drops, incidents,
 * seeds, revenue) ride along.
 */
export function productFactsOf(hires: Hires, legacy?: LegacyFacts, build: BuildFacts = NO_BUILD): ProductFacts {
  const perks = perkEffects(legacy?.perks)
  const fx = effectsOf(build.spec)
  const scale = perks.growth * prestigeMult(legacy?.prestigeTotal ?? 0) * fx.growth
  const hireBonus = hireBonusOf(hires) * scale
  const icBonus = build.icRows * IC_GROWTH_PER_ROW * scale
  return {
    growthMult: scale + hireBonus + icBonus,
    hireBonus,
    revenueMult: perks.revenue * fx.revenue,
    payroll: hirePayrollOf(hires),
    dropsMult: fx.drops,
    incidentMult: fx.incidents,
    seedMult: fx.seeds,
    ...(build.lead ? { ending: leadById(build.lead).ending } : {}),
  }
}

/** Dollars a second the served users pay once Viral loop's revenue perk is in. */
export const productRevenueOf = (baseRevenuePerSec: number, perks?: readonly string[], spec: SpecId | null = null): number => baseRevenuePerSec * perkEffects(perks).revenue * effectsOf(spec).revenue
