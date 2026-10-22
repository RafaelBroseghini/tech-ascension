import { leadById } from "../../data/leadership.ts"
import type { LeadId } from "../../data/leadership.ts"
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
  /** The ending the leadership line forces on a win. Left out with no line picked: the hires' share decides. */
  readonly ending?: Ending
}

/** What the Legacy block gives the product: the perks held and the Prestige total behind the permanent bonus. */
export interface LegacyFacts {
  readonly perks: readonly string[]
  readonly prestigeTotal: number
}

/**
 * The facts for the growth model. Growth is scaled once by the permanent Prestige bonus and by Viral loop; the hires' part
 * is scaled with it, so the team's share of the growth does not change. A leadership line decides the ending of a win
 * (IC: night owl, Manager: sponsor); without one, the hires' share does. Hires held under IC still grow the product and
 * still draw their salaries.
 */
export function productFactsOf(hires: Hires, legacy?: LegacyFacts, lead?: LeadId | null): ProductFacts {
  const perks = perkEffects(legacy?.perks)
  const scale = perks.growth * prestigeMult(legacy?.prestigeTotal ?? 0)
  const hireBonus = hireBonusOf(hires) * scale
  return {
    growthMult: scale + hireBonus,
    hireBonus,
    revenueMult: perks.revenue,
    payroll: hirePayrollOf(hires),
    ...(lead ? { ending: leadById(lead).ending } : {}),
  }
}

/** Dollars a second the served users pay once Viral loop's revenue perk is in. */
export const productRevenueOf = (baseRevenuePerSec: number, perks?: readonly string[]): number => baseRevenuePerSec * perkEffects(perks).revenue
