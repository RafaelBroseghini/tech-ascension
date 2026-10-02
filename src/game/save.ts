import type { ActiveBoost } from "../data/boosts.ts"
import { gigById, idlePerSec, jobById, xpPerSec } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { formatNumber } from "./format.ts"
import { clampForever, modFactors, pruneTemp, TEMP_TARGETS } from "./mods.ts"
import type { TempMults } from "./mods.ts"

export const SAVE_VERSION = 3
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
export const OFFLINE_TOAST_MIN_MS = 5_000

export type SaveData = {
  version: 3
  money: number
  /** Spendable XP. */
  xp: number
  /** Lifetime XP earned (gates read this, spending does not lower it). */
  xpTotal: number
  /** Phase A skill counts keyed by skill id. */
  skills: OwnedMap
  /** Phase C equipment counts keyed by equipment id. */
  equipment: OwnedMap
  /** Phase D capital counts keyed by tier id (stringified, ids 19+). Unknown ids are kept. */
  owned: OwnedMap
  /** Owned job ids. */
  jobs: number[]
  /** Completed gig ids. */
  gigs: number[]
  savedAt: number
  /** Omitted when no boost is running. Cleared on load if endsAt has passed. */
  activeBoost?: ActiveBoost
  /** Highest balance ever held. Gates which shop rows are revealed. Older saves omit it. */
  peakMoney?: number
  /** Permanent event multiplier. Omitted at 1. */
  foreverMult?: number
  /** Timed event multipliers still running. Dropped on load once ended. */
  tempMults?: TempMults
}

export type Hydrated = {
  save: SaveData
  toast: string | null
  /** True when a stored save was thrown away (corrupt, or a different schema version) and a fresh one returned. */
  reset: boolean
}

const UNREADABLE_TOAST = "save was unreadable — new career started"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeOwned(raw: unknown): OwnedMap {
  const out: OwnedMap = {}
  if (!isRecord(raw)) return out
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d+$/.test(key)) continue
    const count = finite(value)
    if (count > 0) out[key] = Math.floor(count)
  }
  return out
}

function normalizeIds(raw: unknown, valid: (id: number) => boolean): number[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set<number>()
  for (const value of raw) {
    const id = finite(value)
    if (Number.isInteger(id) && valid(id)) ids.add(id)
  }
  return [...ids].sort((a, b) => a - b)
}

function normalizeBoost(raw: unknown): ActiveBoost | undefined {
  if (!isRecord(raw)) return undefined
  const mult = finite(raw.mult)
  const endsAt = finite(raw.endsAt)
  if (mult <= 0 || endsAt <= 0) return undefined
  return { mult, endsAt }
}

function normalizeTemp(raw: unknown): TempMults {
  const out: TempMults = {}
  if (!isRecord(raw)) return out
  for (const target of TEMP_TARGETS) {
    const entry = raw[target]
    if (!isRecord(entry)) continue
    const mult = finite(entry.mult)
    const endsAt = finite(entry.endsAt)
    if (mult > 0 && endsAt > 0) out[target] = { mult, endsAt }
  }
  return out
}

export function freshSave(now: number): SaveData {
  return {
    version: SAVE_VERSION,
    money: 0,
    xp: 0,
    xpTotal: 0,
    skills: {},
    equipment: {},
    owned: {},
    jobs: [],
    gigs: [],
    savedAt: now,
    peakMoney: 0,
  }
}

export function offlineCredit(cps: number, savedAt: number, now: number): number {
  if (!Number.isFinite(cps) || cps <= 0) return 0
  if (!Number.isFinite(savedAt) || !Number.isFinite(now) || now <= savedAt) return 0
  const elapsed = Math.min(now - savedAt, OFFLINE_CAP_MS)
  return cps * (elapsed / 1000)
}

/**
 * Returns null unless the payload is a save of exactly this version. There is no migration:
 * a save from any other schema is not carried over, the caller starts a fresh career.
 * Fields are still sanitised so a hand-edited or damaged save of this version cannot poison the economy.
 */
export function parseSave(input: unknown): SaveData | null {
  if (!isRecord(input) || input.version !== SAVE_VERSION) return null
  const current = input

  const boost = normalizeBoost(current.activeBoost)
  const xp = Math.max(0, finite(current.xp))
  const save: SaveData = {
    version: 3,
    money: Math.max(0, finite(current.money)),
    xp,
    xpTotal: Math.max(xp, finite(current.xpTotal)),
    skills: normalizeOwned(current.skills),
    equipment: normalizeOwned(current.equipment),
    owned: normalizeOwned(current.owned),
    jobs: normalizeIds(current.jobs, (id) => jobById(id) !== undefined),
    gigs: normalizeIds(current.gigs, (id) => gigById(id) !== undefined),
    savedAt: Math.max(0, finite(current.savedAt)),
  }
  if (boost) save.activeBoost = boost
  save.peakMoney = Math.max(save.money, finite(current.peakMoney))
  const foreverMult = clampForever(finite(current.foreverMult) || 1)
  if (foreverMult !== 1) save.foreverMult = foreverMult
  const temp = normalizeTemp(current.tempMults)
  if (Object.keys(temp).length > 0) save.tempMults = temp
  return save
}

export function hydrate(rawText: string | null, now: number): Hydrated {
  if (rawText == null) {
    return { save: freshSave(now), toast: null, reset: false }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { save: freshSave(now), toast: UNREADABLE_TOAST, reset: true }
  }

  // A different schema version is wiped without a word: there are no old saves to carry over.
  const loaded = parseSave(parsed)
  if (!loaded) {
    return { save: freshSave(now), toast: isRecord(parsed) ? null : UNREADABLE_TOAST, reset: true }
  }

  const away = Math.min(Math.max(0, now - loaded.savedAt), OFFLINE_CAP_MS)
  const fx = modFactors({ foreverMult: loaded.foreverMult ?? 1, temp: loaded.tempMults ?? {} }, loaded.savedAt, loaded.savedAt + away)
  const credit = offlineCredit(idlePerSec(loaded) * fx.cps, loaded.savedAt, now)
  const xpCredit = offlineCredit(xpPerSec(loaded.skills) * fx.xpIdle, loaded.savedAt, now)
  const elapsed = now - loaded.savedAt
  const save: SaveData = {
    ...loaded,
    money: loaded.money + credit,
    xp: loaded.xp + xpCredit,
    xpTotal: loaded.xpTotal + xpCredit,
    savedAt: now,
  }
  save.peakMoney = Math.max(save.peakMoney ?? 0, save.money)
  if (save.activeBoost && save.activeBoost.endsAt <= now) {
    delete save.activeBoost
  }
  if (save.tempMults) {
    const live = pruneTemp(save.tempMults, now)
    if (Object.keys(live).length > 0) save.tempMults = live
    else delete save.tempMults
  }

  let toast: string | null = null
  if (elapsed >= OFFLINE_TOAST_MIN_MS) {
    if (credit > 0 && xpCredit > 0) toast = `welcome back, credited $${formatNumber(credit)} and ${formatNumber(xpCredit)} XP`
    else if (credit > 0) toast = `welcome back, credited $${formatNumber(credit)}`
    else if (xpCredit > 0) toast = `welcome back, studied +${formatNumber(xpCredit)} XP`
  }

  return { save, toast, reset: false }
}
