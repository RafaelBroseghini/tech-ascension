import { hireBonusOf, hirePayrollOf } from "./hires.ts"
import type { Hires } from "./hires.ts"
import { prestigeMult } from "../mods.ts"
import { perkEffects } from "../perks.ts"

/** The product grows on nights and weekends, with the days given to the job. The pace before the hires, the perks and Prestige scale it. */
export const GROWTH_BASE = 0.25

/** What the growth model reads from the career: the hires and the Legacy perks. */
export interface ProductFacts {
  /** The whole growth multiplier: the base, plus what the hires add. */
  readonly growthMult: number
  /** The part of `growthMult` the hires add. */
  readonly hireBonus: number
  readonly revenueMult: number
  /** Dollars a second the hires cost now. */
  readonly payroll: number
}

/** What the Legacy block gives the product: the perks held and the Prestige total behind the permanent bonus. */
export interface LegacyFacts {
  readonly perks: readonly string[]
  readonly prestigeTotal: number
}

/**
 * The facts for the growth model. Growth is scaled once by the permanent Prestige bonus and by Viral loop; the hires' part
 * is scaled with it, so the team's share of the growth does not change.
 */
export function productFactsOf(hires: Hires, legacy?: LegacyFacts): ProductFacts {
  const perks = perkEffects(legacy?.perks)
  const scale = perks.growth * prestigeMult(legacy?.prestigeTotal ?? 0)
  const hireBonus = hireBonusOf(hires) * scale
  return {
    growthMult: GROWTH_BASE * scale + hireBonus,
    hireBonus,
    revenueMult: perks.revenue,
    payroll: hirePayrollOf(hires),
  }
}

/** Dollars a second the served users pay once Viral loop's revenue perk is in. */
export const productRevenueOf = (baseRevenuePerSec: number, perks?: readonly string[]): number => baseRevenuePerSec * perkEffects(perks).revenue
