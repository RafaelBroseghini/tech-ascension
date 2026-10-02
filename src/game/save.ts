import type { ActiveBoost } from "../data/boosts.ts"
import { idlePerSec } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { formatNumber } from "./format.ts"
import { TIERS } from "../data/tiers.ts"

export const SAVE_VERSION = 1
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
export const OFFLINE_TOAST_MIN_MS = 5_000

export type SaveV1 = {
  version: 1
  money: number
  xp: number
  /** Owned counts keyed by tier id (stringified). Unknown ids are kept. */
  owned: OwnedMap
  savedAt: number
  /** Omitted when no boost is running. Cleared on load if endsAt has passed. */
  activeBoost?: ActiveBoost
  /** Highest balance ever held. Gates which shop rows are revealed. Older saves omit it. */
  peakMoney?: number
}

export type Hydrated = {
  save: SaveV1
  toast: string | null
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
    owned: raw.owned,
    savedAt: raw.savedAt,
    activeBoost: raw.activeBoost,
  }),
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeOwned(raw: unknown): OwnedMap {
  const out: OwnedMap = {}
  if (Array.isArray(raw)) {
    raw.forEach((value, index) => {
      const tier = TIERS[index]
      if (!tier) return
      const count = finite(value)
      if (count > 0) out[String(tier.id)] = Math.floor(count)
    })
    return out
  }
  if (!isRecord(raw)) return out
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d+$/.test(key)) continue
    const count = finite(value)
    if (count > 0) out[key] = Math.floor(count)
  }
  return out
}

function normalizeBoost(raw: unknown): ActiveBoost | undefined {
  if (!isRecord(raw)) return undefined
  const mult = finite(raw.mult)
  const endsAt = finite(raw.endsAt)
  if (mult <= 0 || endsAt <= 0) return undefined
  return { mult, endsAt }
}

export function freshSave(now: number): SaveV1 {
  return {
    version: SAVE_VERSION,
    money: 0,
    xp: 0,
    owned: {},
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
export function migrate(input: unknown): SaveV1 | null {
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
  const save: SaveV1 = {
    version: 1,
    money: Math.max(0, finite(current.money)),
    xp: Math.max(0, finite(current.xp)),
    owned: normalizeOwned(current.owned),
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

  const credit = offlineCredit(idlePerSec(migrated.owned), migrated.savedAt, now)
  const elapsed = now - migrated.savedAt
  const save: SaveV1 = {
    ...migrated,
    money: migrated.money + credit,
    savedAt: now,
  }
  save.peakMoney = Math.max(save.peakMoney ?? 0, save.money)
  if (save.activeBoost && save.activeBoost.endsAt <= now) {
    delete save.activeBoost
  }

  const toast =
    elapsed >= OFFLINE_TOAST_MIN_MS && credit > 0
      ? `welcome back, credited $${formatNumber(credit)}`
      : null

  return { save, toast }
}
