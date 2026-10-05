import type { ActiveBoost } from "../data/boosts.ts"
import { gigById, idlePerSec, jobById, xpPerSec } from "./economy.ts"
import { clampBuyAmount, goldById, offlineCapMs } from "./gold.ts"
import type { BuyAmount } from "./gold.ts"
import type { OwnedMap } from "./economy.ts"
import { offlineToastText } from "./offlineNote.ts"
import { clampForever, modFactors, pruneTemp, TEMP_TARGETS } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import { normalizeSeenMilestones } from "./milestones.ts"
import { creditMoney, emptyStats, normalizeStats } from "./stats.ts"
import type { GameStats } from "./stats.ts"

/** Catalog ids grew in v4. Any other version wipes; there is no migration. */
export const SAVE_VERSION = 5
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
  /** Owned gold skill ids. Omitted when none. */
  gold?: number[]
  /** The shop's Buy control. Omitted at one copy; never above what `gold` unlocks. */
  buyAmount?: BuyAmount
  savedAt: number
  /** Omitted when no boost is running. Cleared on load if endsAt has passed. */
  activeBoost?: ActiveBoost
  /** Highest balance ever held. Gates which shop rows are revealed. */
  peakMoney: number
  /** Permanent event multiplier. Omitted at 1. */
  foreverMult?: number
  /** Timed event multipliers still running. Dropped on load once ended. */
  tempMults?: TempMults
  /** Lifetime fun metrics. Omitted on a brand-new save. */
  stats?: GameStats
  /** One-time balance / XP joke pops already shown. */
  seenMilestones?: string[]
}

export type Hydrated = {
  save: SaveData
  toast: string | null
  /** True when a stored save was thrown away (corrupt, or a different schema version) and a fresh one returned. */
  reset: boolean
}

const UNREADABLE = "save was unreadable — new career started"

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
    stats: emptyStats(),
  }
}

export function offlineCredit(cps: number, savedAt: number, now: number, capMs: number = OFFLINE_CAP_MS): number {
  if (!Number.isFinite(cps) || cps <= 0) return 0
  if (!Number.isFinite(savedAt) || !Number.isFinite(now) || now <= savedAt) return 0
  const elapsed = Math.min(now - savedAt, capMs)
  return cps * (elapsed / 1000)
}

/**
 * Current schema only. A save of any other version, or anything that is not a save object, is not
 * loaded: returns null and the caller starts a fresh career. There is no migration.
 * Fields are still sanitised so a hand-edited save of this version cannot poison the economy.
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
  const gold = normalizeIds(input.gold, (id) => goldById(id) !== undefined)
  if (gold.length > 0) save.gold = gold
  const amount = input.buyAmount === "max" ? "max" : input.buyAmount === 5 || input.buyAmount === 10 ? input.buyAmount : 1
  const buyAmount = clampBuyAmount(gold, amount)
  if (buyAmount !== 1) save.buyAmount = buyAmount
  const foreverMult = clampForever(finite(input.foreverMult) || 1)
  if (foreverMult !== 1) save.foreverMult = foreverMult
  const temp = normalizeTemp(input.tempMults)
  if (Object.keys(temp).length > 0) save.tempMults = temp
  save.stats = normalizeStats(input.stats)
  const seen = normalizeSeenMilestones(input.seenMilestones)
  if (seen.length > 0) save.seenMilestones = seen
  return save
}

export function hydrate(rawText: string | null, now: number): Hydrated {
  if (rawText == null) {
    return { save: freshSave(now), toast: null, reset: false }
  }

  let loaded: SaveData | null = null
  try {
    loaded = parseSave(JSON.parse(rawText))
  } catch {
    loaded = null
  }
  if (!loaded) return { save: freshSave(now), toast: UNREADABLE, reset: true }

  const capMs = offlineCapMs(loaded.gold ?? [], OFFLINE_CAP_MS)
  const away = Math.min(Math.max(0, now - loaded.savedAt), capMs)
  const fx = modFactors({ foreverMult: loaded.foreverMult ?? 1, temp: loaded.tempMults ?? {} }, loaded.savedAt, loaded.savedAt + away)
  const credit = offlineCredit(idlePerSec(loaded) * fx.cps, loaded.savedAt, now, capMs)
  const xpCredit = offlineCredit(xpPerSec(loaded) * fx.xpIdle, loaded.savedAt, now, capMs)
  const elapsed = now - loaded.savedAt
  const save: SaveData = {
    ...loaded,
    money: loaded.money + credit,
    xp: loaded.xp + xpCredit,
    xpTotal: loaded.xpTotal + xpCredit,
    savedAt: now,
  }
  save.peakMoney = Math.max(save.peakMoney, save.money)
  if (credit > 0) {
    save.stats = creditMoney(save.stats ?? emptyStats(), credit, "idle")
  }
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
    toast = offlineToastText({ credit, xpCredit, jobs: save.jobs, elapsed })
  }

  return { save, toast, reset: false }
}
