import type { ActiveBoost } from "../data/boosts.ts"
import { gigById, idlePerSec, jobById, xpPerSec } from "./economy.ts"
import { goldById, offlineCapMs } from "./gold.ts"
import type { OwnedMap } from "./economy.ts"
import { offlineToastText } from "./offlineNote.ts"
import { comboFactors, normalizeComboIds } from "./combos.ts"
import { clampForever, modFactors, pruneTemp, prestigeMult, TEMP_TARGETS } from "./mods.ts"
import { freshLegacy, isFreshLegacy, normalizeLegacy } from "./legacy.ts"
import type { LegacyState } from "./legacy.ts"
import type { TempMults } from "./mods.ts"
import { normalizeSeenMilestones } from "./milestones.ts"
import { creditMoney, emptyStats, normalizeStats } from "./stats.ts"
import type { GameStats } from "./stats.ts"
import { normalizeBuild } from "./build.ts"
import type { BuildState } from "./build.ts"
import { normalizeIdentity, randomIdentity } from "./identity.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts, parseCompany, settleGrowth } from "./globe/growth.ts"
import { productFactsOf } from "./globe/product.ts"
import type { Hires } from "./globe/hires.ts"
import { WIN_MULT } from "./globe/world.ts"
import type { CompanyState, GrowthNote } from "./globe/growth.ts"
import { parseHires, winNote } from "./globe/hires.ts"
import type { Ending } from "./globe/hires.ts"
import { parseFootprint } from "./globe/footprint.ts"
import type { Footprint } from "./globe/footprint.ts"
import type { SavedIdentity } from "./identity.ts"

/** Catalog ids grew in v4. Any other version wipes; there is no migration. */
export const SAVE_VERSION = 8
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
export const OFFLINE_TOAST_MIN_MS = 5_000
/** Away at least this long and the next load counts as a return: a career log line, and the desk cat's cue. */
export const RETURN_BREAK_MS = 10 * 60 * 1000
/** The journal keeps this many entries at most (the store trims to the same cap). */
const CAREER_LOG_CAP = 2000

/** One career journal entry: seq, time, type, what it is about, balance, lifetime XP, and optional flat extras. */
export type SavedCareerEntry =
  | [seq: number, at: number, type: string, ref: string, money: number, xpTotal: number]
  | [seq: number, at: number, type: string, ref: string, money: number, xpTotal: number, data: Record<string, number | string | boolean>]

/**
 * The career timeline: the journal, the unlocks already revealed (so each plays once), the ones still marked NEW,
 * and how many times the player came back after a break. Checked for shape here; the store checks ids at boot.
 */
export type SavedCareer = {
  seq: number
  log: SavedCareerEntry[]
  unlocked: string[]
  fresh: string[]
  returns: number
}

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
  /** The specialization picked and the one switch. Omitted before the pick. A save that holds a job above Mid-level without one is a Backend career. */
  build?: BuildState
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
  /** The career timeline. Saves from before it have none; the store fills it from what they own. */
  career?: SavedCareer
  /**
   * The handle on the GitHug and LinkedOut profiles, drawn from word lists, and whether the player kept it
   * (until then the start card offers a reroll). Saves from before it get a random one at boot.
   */
  profile?: SavedIdentity
  /** Users by region, the resistance, live incidents, the win latch and the uptime bars. Omitted before the company has a history. */
  company?: CompanyState
  /** Regions bought and points of presence deployed. Omitted until the company buys one. */
  footprint?: Footprint
  /** Heads hired of each kind (`HIRES`), by id. Omitted with nobody on the payroll. Saves from before the fork was removed kept them in a `founder` block; the load reads them from there. */
  hires?: Hires
  /** Prestige: runs, Prestige, earnings of earlier careers, Legacy perks. Omitted on a first career with nothing in it; a save without it is run 1 with no Prestige. */
  legacy?: LegacyState
  /** Kitchen combos found this career, by id: what the log lists and what is journaled once. Omitted with none; unknown ids are dropped on load. */
  combos?: string[]
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

/**
 * The timeline block, kept with a shallow check only: this file is on the boot path, so the entries, ids and types
 * are checked by the store at boot (`journalFromSave`, `bootCareer`). Undefined when the save has none.
 */
export function normalizeSavedCareer(raw: unknown): SavedCareer | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.log)) return undefined
  const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [])
  return {
    seq: Math.max(1, Math.floor(finite(raw.seq))),
    log: raw.log.slice(-CAREER_LOG_CAP) as SavedCareerEntry[],
    unlocked: strings(raw.unlocked),
    fresh: strings(raw.fresh),
    returns: Math.max(0, Math.floor(finite(raw.returns))),
  }
}

/** A new career's timeline: one line saying it started. */
export function freshCareer(now: number): SavedCareer {
  return { seq: 2, log: [[1, now, "start", "", 0, 0]], unlocked: [], fresh: [], returns: 0 }
}

/** The next free journal seq: past the counter, and past every entry the log already holds. */
function nextSeq(career: SavedCareer): number {
  const top = career.log.reduce((max, row) => (Array.isArray(row) && typeof row[0] === "number" ? Math.max(max, row[0]) : max), 0)
  return Math.max(career.seq, top + 1)
}

/** Notes a return in the journal: how long the player was away and what that paid. */
function noteReturn(career: SavedCareer, now: number, awayMs: number, money: number, xp: number, balance: number, xpTotal: number): SavedCareer {
  const seq = nextSeq(career)
  const entry: SavedCareerEntry = [
    seq,
    now,
    "return",
    "",
    Math.floor(balance),
    Math.floor(xpTotal),
    { awayMs: Math.round(awayMs), creditedMoney: Math.floor(money), creditedXp: Math.floor(xp) },
  ]
  return { ...career, seq: seq + 1, log: [...career.log, entry].slice(-CAREER_LOG_CAP), returns: career.returns + 1 }
}

/** Journals what the company went through while the player was away: incidents, milestones, the win. */
function noteWorld(career: SavedCareer, notes: readonly GrowthNote[], now: number, balance: number, xpTotal: number): SavedCareer {
  if (notes.length === 0) return career
  let seq = nextSeq(career)
  const added = notes.map((note): SavedCareerEntry => {
    const row: SavedCareerEntry = [seq++, now, note.type, note.ref, Math.floor(balance), Math.floor(xpTotal)]
    return note.data ? [...row, note.data] as SavedCareerEntry : row
  })
  return { ...career, seq, log: [...career.log, ...added].slice(-CAREER_LOG_CAP) }
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
    career: freshCareer(now),
    profile: { ...randomIdentity(), chosen: false },
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
  const built = normalizeBuild(input.build, save.jobs)
  save.jobs = built.jobs
  if (built.build) save.build = built.build
  const gold = normalizeIds(input.gold, (id) => goldById(id) !== undefined)
  if (gold.length > 0) save.gold = gold
  const foreverMult = clampForever(finite(input.foreverMult) || 1)
  if (foreverMult !== 1) save.foreverMult = foreverMult
  const temp = normalizeTemp(input.tempMults)
  if (Object.keys(temp).length > 0) save.tempMults = temp
  save.stats = normalizeStats(input.stats)
  const seen = normalizeSeenMilestones(input.seenMilestones)
  if (seen.length > 0) save.seenMilestones = seen
  const career = normalizeSavedCareer(input.career)
  if (career) save.career = career
  const profile = normalizeIdentity(input.profile)
  if (profile) save.profile = profile
  const company = parseCompany(input.company)
  if (company) save.company = company
  const footprint = parseFootprint(input.footprint)
  if (footprint) save.footprint = footprint
  const legacyFounder = isRecord(input.founder) ? input.founder : {}
  const hires = parseHires(input.hires ?? legacyFounder.hires)
  if (Object.keys(hires).length > 0) save.hires = hires
  const combos = normalizeComboIds(input.combos)
  if (combos.length > 0) save.combos = combos
  if (input.legacy !== undefined) {
    const legacy = normalizeLegacy(input.legacy)
    if (!isFreshLegacy(legacy)) save.legacy = legacy
  }
  return save
}

const wonAway = (ending: Ending | undefined, mult: number) => `While you were out: ${winNote(ending, mult)}`

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

  const capMs = offlineCapMs(loaded.gold ?? [], OFFLINE_CAP_MS, loaded.legacy?.perks)
  const away = Math.min(Math.max(0, now - loaded.savedAt), capMs)
  const fx = modFactors(
    { foreverMult: loaded.foreverMult ?? 1, temp: loaded.tempMults ?? {}, legacyMult: prestigeMult(loaded.legacy?.prestigeTotal ?? 0), combo: comboFactors(loaded) },
    loaded.savedAt,
    loaded.savedAt + away,
  )
  const credit = offlineCredit(idlePerSec(loaded) * fx.cps, loaded.savedAt, now, capMs)
  // The company keeps going while away: its growth is walked in steps, and drops cost what they cost.
  const grown = advanceCompany(loaded.company ?? FRESH_COMPANY, growthFacts(loaded.gigs, loaded.equipment, loaded.footprint, productFactsOf(loaded.hires ?? {}, loaded.legacy ?? freshLegacy())), loaded.savedAt, loaded.savedAt + away, Math.random)
  const xpCredit = offlineCredit(xpPerSec(loaded) * fx.xpIdle, loaded.savedAt, now, capMs)
  const elapsed = now - loaded.savedAt
  const settled = settleGrowth(loaded.money + credit, loaded.foreverMult ?? 1, loaded.company?.won ?? false, grown)
  const save: SaveData = {
    ...loaded,
    ...(settled.wonNow ? { foreverMult: settled.foreverMult } : {}),
    money: settled.money,
    company: grown.state,
    xp: loaded.xp + xpCredit,
    xpTotal: loaded.xpTotal + xpCredit,
    savedAt: now,
  }
  save.peakMoney = Math.max(save.peakMoney, save.money)
  // Settling already added what the users paid; this is only what the note and the books show.
  const income = credit + grown.earned
  if (income > 0) {
    save.stats = creditMoney(save.stats ?? emptyStats(), income, "idle")
  }
  if (save.activeBoost && save.activeBoost.endsAt <= now) {
    delete save.activeBoost
  }
  if (save.tempMults) {
    const live = pruneTemp(save.tempMults, now)
    if (Object.keys(live).length > 0) save.tempMults = live
    else delete save.tempMults
  }

  if (save.career) save.career = noteWorld(save.career, grown.notes, now, save.money, save.xpTotal)
  if (save.career && elapsed >= RETURN_BREAK_MS) {
    save.career = noteReturn(save.career, now, elapsed, income, xpCredit, save.money, save.xpTotal)
  }

  let toast: string | null = null
  if (elapsed >= OFFLINE_TOAST_MIN_MS) {
    toast = offlineToastText({ credit: income, xpCredit, jobs: save.jobs, elapsed })
    // A win reached while away has no live moment to celebrate it, so it leads the note instead.
    if (settled.wonNow && toast) toast = `${wonAway(grown.state.ending, WIN_MULT)}${toast.slice(toast.indexOf("\n"))}`
  }

  return { save, toast, reset: false }
}
