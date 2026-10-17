/** Multipliers granted by random events and by Prestige. Pure data plus the math that folds them into rates. */
import { PRESTIGE_MULT_PER } from "../data/legacy.ts"

/** The multiplier on every income and XP stream: 1 + PRESTIGE_MULT_PER per Prestige earned, spent or not. */
export function prestigeMult(prestigeTotal: number): number {
  return 1 + PRESTIGE_MULT_PER * Math.max(0, prestigeTotal)
}

export type TempTarget = "click" | "cps" | "xpPerSec"

export type TempMult = { mult: number; endsAt: number }

export type TempMults = Partial<Record<TempTarget, TempMult>>

export type EventMods = {
  /** Permanent multiplier on every income stream. Starts at 1. */
  foreverMult: number
  /** Timed multipliers, at most one per target. */
  temp: TempMults
  /** Permanent multiplier from Prestige (`prestigeMult`), on every income and XP stream. Omitted means 1. */
  legacyMult?: number
}

/** The store keeps the timed table as `tempMults`; the math wants it as `temp`. */
export function modsOf(state: { foreverMult: number; tempMults: TempMults; legacy?: { prestigeTotal: number } }): EventMods {
  return { foreverMult: state.foreverMult, temp: state.tempMults, legacyMult: prestigeMult(state.legacy?.prestigeTotal ?? 0) }
}

export const NO_MODS: EventMods = { foreverMult: 1, temp: {} }

/** Keeps a long run of lucky (or unlucky) events from overflowing or zeroing the economy. */
export const FOREVER_MULT_MIN = 0.5
export const FOREVER_MULT_MAX = 10

export const TEMP_TARGETS: readonly TempTarget[] = ["click", "cps", "xpPerSec"]

export function clampForever(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  return Math.min(FOREVER_MULT_MAX, Math.max(FOREVER_MULT_MIN, value))
}

/** Factors folded into each rate. `click` covers both $ per click and XP per click. */
export type ModFactors = { click: number; cps: number; xpIdle: number }

function tempAverage(entry: TempMult | undefined, from: number, to: number): number {
  if (!entry || !(entry.mult > 0)) return 1
  if (!(to > from)) return entry.endsAt > from ? entry.mult : 1
  const overlap = Math.max(0, Math.min(to, entry.endsAt) - from)
  return 1 + ((entry.mult - 1) * overlap) / (to - from)
}

/** Average factors over [from, to]. With to <= from this is the instantaneous value at `from`. */
export function modFactors(mods: EventMods, from: number, to: number): ModFactors {
  const forever = clampForever(mods.foreverMult) * (mods.legacyMult !== undefined && mods.legacyMult > 0 ? mods.legacyMult : 1)
  return {
    click: forever * tempAverage(mods.temp.click, from, to),
    cps: forever * tempAverage(mods.temp.cps, from, to),
    xpIdle: forever * tempAverage(mods.temp.xpPerSec, from, to),
  }
}

/** Drops timed multipliers that have ended. Returns the same object when nothing expired. */
export function pruneTemp(temp: TempMults, now: number): TempMults {
  let changed = false
  const next: TempMults = {}
  for (const target of TEMP_TARGETS) {
    const entry = temp[target]
    if (!entry) continue
    if (entry.endsAt > now) next[target] = entry
    else changed = true
  }
  return changed ? next : temp
}
