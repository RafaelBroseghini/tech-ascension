import { LEGACY_PERKS, PERK } from "../data/legacy.ts"

/**
 * What the Legacy perks held do, as plain numbers. Pure: the economy, the growth model, the offline cap and the shop
 * each read the factor they need from here, so every number the game shows is the number it pays.
 */
export type PerkEffects = {
  /** Hours added to the offline cap, on top of the Time away gold skills. */
  offlineHours: number
  /** Multiplier on a capital row's price. */
  capitalCost: number
  /** Multiplier on a gear row's price. */
  gearCost: number
  /** Multiplier on salaries and gig retainers. */
  salaries: number
  /** Multiplier on what capital rows earn. */
  capitalIncome: number
  /** Multiplier on the founder's burn (the team and office, not the hires' salaries). */
  burn: number
  /** The first bridge of a career costs no equity. */
  freeBridge: boolean
  /** Multiplier on product growth. */
  growth: number
  /** Multiplier on product revenue. */
  revenue: number
  /** Users each career starts with. */
  startUsers: number
}

export const NO_PERKS: PerkEffects = {
  offlineHours: 0,
  capitalCost: 1,
  gearCost: 1,
  salaries: 1,
  capitalIncome: 1,
  burn: 1,
  freeBridge: false,
  growth: 1,
  revenue: 1,
  startUsers: 0,
}

const KNOWN = new Set(LEGACY_PERKS.map((perk) => perk.id))
const memo = new WeakMap<readonly string[], PerkEffects>()

/** The effects of the perks held. Unknown ids are ignored. The last answer for an array is kept, since the game asks every tick. */
export function perkEffects(perks: readonly string[] | undefined): PerkEffects {
  if (!perks || perks.length === 0) return NO_PERKS
  const cached = memo.get(perks)
  if (cached) return cached
  const has = (id: string) => KNOWN.has(id) && perks.includes(id)
  const effects: PerkEffects = {
    offlineHours: has("capital.offline") ? PERK.offlineHours : 0,
    capitalCost: has("capital.capitalCost") ? PERK.capitalCost : 1,
    gearCost: has("capital.gearCost") ? PERK.gearCost : 1,
    salaries: has("capital.salaries") ? PERK.salaries : 1,
    capitalIncome: has("capital.capitalIncome") ? PERK.capitalIncome : 1,
    burn: has("founder.burn") ? 1 - PERK.burnCut : 1,
    freeBridge: has("founder.bridge"),
    growth: has("founder.growth") ? PERK.growth : 1,
    revenue: has("founder.revenue") ? PERK.revenue : 1,
    startUsers: has("founder.users") ? PERK.startUsers : 0,
  }
  memo.set(perks, effects)
  return effects
}

/** Slice of a state that carries the perks: the store, a save and the harness all have `legacy`. */
export type HasPerks = { readonly legacy?: { readonly perks: readonly string[] } }

export const perksOf = (state: HasPerks): PerkEffects => perkEffects(state.legacy?.perks)
