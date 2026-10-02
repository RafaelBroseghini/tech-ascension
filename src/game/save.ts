import type { ActiveBoost } from "../data/boosts.ts"
import { COST_GROWTH, LEGACY_EARLY_XP_PER_DOLLAR } from "../data/phases.ts"
import { gigById, idlePerSec, jobById, xpPerSec } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { formatNumber } from "./format.ts"

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
}

export type Hydrated = {
  save: SaveData
  toast: string | null
}

/**
 * Version 1 saves keyed owned counts by the original 48 tier ids. Stages added in
 * version 2 shifted most ids, so v1 -> v2 re-keys owned counts through this table.
 * Never edit it: it describes a frozen past layout.
 */
export const V1_TO_V2_TIER_IDS: Readonly<Record<string, number>> = {
  1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13, 9: 15, 10: 17, 11: 19, 12: 21, 13: 23, 14: 24, 15: 26, 16: 28, 17: 29, 18: 31, 19: 32, 20: 33, 21: 34, 22: 36, 23: 37, 24: 39, 25: 40, 26: 41, 27: 42, 28: 43, 29: 44, 30: 45, 31: 46, 32: 48, 33: 49, 34: 50, 35: 51, 36: 52, 37: 53, 38: 54, 39: 56, 40: 57, 41: 58, 42: 60, 43: 61, 44: 62, 45: 63, 46: 64, 47: 65, 48: 66,
}

/**
 * Base prices of the retired save-v2 early generators (ids 1–18). Used only to price the XP refund
 * in the v2 → v3 migration. Never edit it: it describes a frozen past layout.
 */
export const V2_EARLY_BASE_COSTS: readonly number[] = [
  15, 50, 120, 190, 300, 480, 750, 1150, 1800, 2900, 4500, 7000, 11000, 17500, 28000, 44000, 70000, 110000,
]

/** What `count` copies of a retired early generator cost in total (geometric, floor per copy, as the shop charged). */
export function legacyEarlySpend(id: number, count: number): number {
  const base = V2_EARLY_BASE_COSTS[id - 1]
  if (base === undefined || !(count > 0)) return 0
  let total = 0
  for (let owned = 0; owned < Math.min(count, 5000); owned++) {
    total += owned === 0 ? base : Math.floor(base * COST_GROWTH ** owned)
  }
  return total
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

/**
 * migrations[n] upgrades a version-n document to version n+1.
 * Version 0 is an unversioned blob (or a legacy owned array).
 */
const MIGRATIONS: Migration[] = [
  (raw) => ({
    version: 1,
    money: raw.money,
    xp: raw.xp,
    owned: Array.isArray(raw.owned) ? legacyArrayToMap(raw.owned) : raw.owned,
    savedAt: raw.savedAt,
    activeBoost: raw.activeBoost,
  }),
  (raw) => ({
    ...raw,
    version: 2,
    owned: remapOwned(raw.owned, V1_TO_V2_TIER_IDS),
  }),
  /**
   * v2 → v3 (phase economy). Capital tiers (ids 19+) carry over untouched, money and peakMoney are kept.
   * The retired early generators (ids 1–18) are removed and their total spend is refunded as XP at
   * LEGACY_EARLY_XP_PER_DOLLAR, so no one is left without a path: XP buys skills, skills open the boards.
   * The old vanity XP counter is replaced by the refund.
   */
  (raw) => {
    const kept: Record<string, unknown> = {}
    let spent = 0
    if (isRecord(raw.owned)) {
      for (const [key, value] of Object.entries(raw.owned)) {
        const id = Number(key)
        if (/^\d+$/.test(key) && id >= 1 && id <= V2_EARLY_BASE_COSTS.length) {
          spent += legacyEarlySpend(id, Math.floor(finite(value)))
        } else {
          kept[key] = value
        }
      }
    }
    const refund = Math.floor(spent * LEGACY_EARLY_XP_PER_DOLLAR)
    return { ...raw, version: 3, owned: kept, xp: refund, xpTotal: refund, skills: {}, equipment: {}, jobs: [], gigs: [] }
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** The unversioned format stored counts by position in the original 48-tier list (id = index + 1). */
function legacyArrayToMap(values: unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  values.forEach((value, index) => {
    out[String(index + 1)] = value
  })
  return out
}

function remapOwned(raw: unknown, table: Readonly<Record<string, number>>): unknown {
  if (!isRecord(raw)) return raw
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    out[String(table[key] ?? key)] = value
  }
  return out
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

/** Returns null when the payload cannot be salvaged. */
export function migrate(input: unknown): SaveData | null {
  if (!isRecord(input)) return null

  let version = typeof input.version === "number" && Number.isFinite(input.version) ? input.version : 0
  if (version < 0) return null

  let current: Record<string, unknown> = input
  if (version > SAVE_VERSION) {
    current = { ...input, version: SAVE_VERSION }
    version = SAVE_VERSION
  }

  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) return null
    const next = step(current)
    const nextVersion = typeof next.version === "number" ? next.version : version + 1
    if (nextVersion <= version) return null
    current = next
    version = nextVersion
  }

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
  return save
}

export function hydrate(rawText: string | null, now: number): Hydrated {
  if (rawText == null) {
    return { save: freshSave(now), toast: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { save: freshSave(now), toast: "save was unreadable — new career started" }
  }

  const migrated = migrate(parsed)
  if (!migrated) {
    return { save: freshSave(now), toast: "save was unreadable — new career started" }
  }

  const credit = offlineCredit(idlePerSec(migrated), migrated.savedAt, now)
  const xpCredit = offlineCredit(xpPerSec(migrated.skills), migrated.savedAt, now)
  const elapsed = now - migrated.savedAt
  const save: SaveData = {
    ...migrated,
    money: migrated.money + credit,
    xp: migrated.xp + xpCredit,
    xpTotal: migrated.xpTotal + xpCredit,
    savedAt: now,
  }
  save.peakMoney = Math.max(save.peakMoney ?? 0, save.money)
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
