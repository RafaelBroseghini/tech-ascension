import type { ActiveBoost } from "../data/boosts.ts"
import { gigById, idlePerSec, jobById, xpPerSec } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { formatNumber } from "./format.ts"

export const SAVE_VERSION = 4
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
export const OFFLINE_TOAST_MIN_MS = 5_000

export type SaveData = {
  version: typeof SAVE_VERSION
  money: number
  /** Spendable XP. */
  xp: number
  /** Lifetime XP earned (gates read this, spending does not lower it). */
  xpTotal: number
  /** Phase A skill counts keyed by skill id. */
  skills: OwnedMap
  /** Gear counts keyed by gear id. */
  equipment: OwnedMap
  /** Phase D capital counts keyed by tier id (stringified, ids 1-25). Unknown ids are kept. */
  owned: OwnedMap
  /** Owned job ids. */
  jobs: number[]
  /** Completed gig ids. */
  gigs: number[]
  savedAt: number
  /** Omitted when no boost is running. Cleared on load if endsAt has passed. */
  activeBoost?: ActiveBoost
  /** Highest balance ever held. Gates which shop rows are revealed. */
  peakMoney: number
}

export type Hydrated = {
  save: SaveData
  toast: string | null
}

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
 * Current schema only. A save of any other version, or anything that is not a save object, is not
 * loaded: returns null and the caller starts a fresh career.
 */
export function parseSave(input: unknown): SaveData | null {
  if (!isRecord(input) || input.version !== SAVE_VERSION) return null

  const boost = normalizeBoost(input.activeBoost)
  const xp = Math.max(0, finite(input.xp))
  const money = Math.max(0, finite(input.money))
  const save: SaveData = {
    version: SAVE_VERSION,
    money,
    xp,
    xpTotal: Math.max(xp, finite(input.xpTotal)),
    skills: normalizeOwned(input.skills),
    equipment: normalizeOwned(input.equipment),
    owned: normalizeOwned(input.owned),
    jobs: normalizeIds(input.jobs, (id) => jobById(id) !== undefined),
    gigs: normalizeIds(input.gigs, (id) => gigById(id) !== undefined),
    savedAt: Math.max(0, finite(input.savedAt)),
    peakMoney: Math.max(money, finite(input.peakMoney)),
  }
  if (boost) save.activeBoost = boost
  return save
}

export function hydrate(rawText: string | null, now: number): Hydrated {
  if (rawText == null) {
    return { save: freshSave(now), toast: null }
  }

  let loaded: SaveData | null = null
  try {
    loaded = parseSave(JSON.parse(rawText))
  } catch {
    loaded = null
  }
  if (!loaded) return { save: freshSave(now), toast: "save was unreadable — new career started" }

  const credit = offlineCredit(idlePerSec(loaded), loaded.savedAt, now)
  const xpCredit = offlineCredit(xpPerSec(loaded.skills), loaded.savedAt, now)
  const elapsed = now - loaded.savedAt
  const save: SaveData = {
    ...loaded,
    money: loaded.money + credit,
    xp: loaded.xp + xpCredit,
    xpTotal: loaded.xpTotal + xpCredit,
    savedAt: now,
  }
  save.peakMoney = Math.max(save.peakMoney, save.money)
  if (save.activeBoost && save.activeBoost.endsAt <= now) {
    delete save.activeBoost
  }

  let toast: string | null = null
  if (elapsed >= OFFLINE_TOAST_MIN_MS) {
    if (credit > 0 && xpCredit > 0) toast = `welcome back, credited $${formatNumber(credit)} and ${formatNumber(xpCredit)} XP`
    else if (credit > 0) toast = `welcome back, credited $${formatNumber(credit)}`
    else if (xpCredit > 0) toast = `welcome back, studied +${formatNumber(xpCredit)} XP`
  }

  return { save, toast }
}
