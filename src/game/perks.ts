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
  growth: 1,
  revenue: 1,
  startUsers: 0,
}

const KNOWN = new Set(LEGACY_PERKS.map((perk) => perk.id))
const memo = new Map<string, PerkEffects>()
/** The last answer for each list, with a copy of the ids it was read from: the same list, unchanged, is answered without building a key. */
const byList = new WeakMap<readonly string[], { readonly ids: readonly string[]; readonly effects: PerkEffects }>()

const sameIds = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((id, i) => id === b[i])

/** The effects of the perks held. Unknown ids are ignored. Answers are kept by the ids held (the game asks every tick), so a list changed in place is read afresh. */
export function perkEffects(perks: readonly string[] | undefined): PerkEffects {
  if (!perks || perks.length === 0) return NO_PERKS
  const seen = byList.get(perks)
  if (seen && sameIds(seen.ids, perks)) return seen.effects
  const key = perks.join(",")
  const cached = memo.get(key)
  if (cached) {
    byList.set(perks, { ids: [...perks], effects: cached })
    return cached
  }
  const has = (id: string) => KNOWN.has(id) && perks.includes(id)
  const effects: PerkEffects = {
    offlineHours: has("capital.offline") ? PERK.offlineHours : 0,
    capitalCost: has("capital.capitalCost") ? PERK.capitalCost : 1,
    gearCost: has("capital.gearCost") ? PERK.gearCost : 1,
    salaries: has("capital.salaries") ? PERK.salaries : 1,
    capitalIncome: has("capital.capitalIncome") ? PERK.capitalIncome : 1,
    growth: has("founder.growth") ? PERK.growth : 1,
    revenue: has("founder.revenue") ? PERK.revenue : 1,
    startUsers: has("founder.users") ? PERK.startUsers : 0,
  }
  memo.set(key, effects)
  byList.set(perks, { ids: [...perks], effects })
  return effects
}

/** Slice of a state that carries the perks: the store, a save and the harness all have `legacy`. */
export type HasPerks = { readonly legacy?: { readonly perks: readonly string[] } }

export const perksOf = (state: HasPerks): PerkEffects => perkEffects(state.legacy?.perks)
