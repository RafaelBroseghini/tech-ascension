import { CAPITAL } from "../data/capital.ts"
import type { Era } from "../data/capital.ts"
import { FEATURES } from "../data/features.ts"
import type { FeatureId, FeatureRow } from "../data/features.ts"
import { GOLD_SKILLS } from "../data/gold.ts"
import { appendNotes, emptyJournal, journalFromSave } from "./careerLog.ts"
import type { CareerJournal, CareerNote } from "./careerLog.ts"
import type { OwnedMap, Progress } from "./economy.ts"
import { featureById, isCosmetic, isFeatureId, openFeatureIds, triggerMet } from "./features.ts"
import type { FeatureProgress } from "./features.ts"
import { phaseOf, phaseRank, PHASES } from "./phase.ts"
import type { SaveData } from "./save.ts"

/** The timeline's slice of the store. */
export type CareerSlice = {
  journal: CareerJournal
  /** Rows already unlocked, in the order they opened. Each reveal plays once. */
  unlocked: FeatureId[]
  /** Rows still marked NEW: unlocked, not used yet. */
  fresh: FeatureId[]
  /** Times the player came back after a break. */
  returns: number
  /** Reveals waiting to play, oldest first. Not saved: a reload keeps the NEW markers and the log instead. */
  reveals: FeatureId[]
  /** A save from before the timeline existed: show the one-time "what's new" card. */
  whatsNew: boolean
}

type SyncState = Progress & { gold: readonly number[]; stats: { playTimeMs: number }; returns: number }

export function progressOf(state: SyncState): FeatureProgress {
  return {
    money: state.money,
    xp: state.xp,
    xpTotal: state.xpTotal,
    peakMoney: state.peakMoney,
    skills: state.skills,
    equipment: state.equipment,
    owned: state.owned,
    jobs: state.jobs,
    gigs: state.gigs,
    gold: state.gold,
    returns: state.returns,
    playTimeMs: state.stats.playTimeMs,
  }
}

function newKeys(before: OwnedMap, after: OwnedMap): number[] {
  if (before === after) return []
  const out: number[] = []
  for (const [key, count] of Object.entries(after)) {
    if (count > 0 && !((before[key] ?? 0) > 0)) out.push(Number(key))
  }
  return out.sort((a, b) => a - b)
}

function newIds(before: readonly number[], after: readonly number[]): number[] {
  if (before === after) return []
  return after.filter((id) => !before.includes(id))
}

const ERA_ORDER: readonly Era[] = ["mid", "upper", "q3", "end"]

function erasHeld(owned: OwnedMap): Set<Era> {
  const eras = new Set<Era>()
  for (const row of CAPITAL) if ((owned[String(row.id)] ?? 0) > 0) eras.add(row.era)
  return eras
}

type PurchaseState = Pick<Progress, "skills" | "equipment" | "owned" | "jobs" | "gigs" | "xpTotal" | "peakMoney"> & { gold: readonly number[] }

/** First copies, clears, hires, perks, new eras and new phases between two states, in the order they read best. */
export function purchaseNotes(prev: PurchaseState, next: PurchaseState): CareerNote[] {
  const notes: CareerNote[] = []
  for (const id of newKeys(prev.skills, next.skills)) notes.push({ type: "learn", ref: `skill:${id}` })
  for (const id of newIds(prev.gigs, next.gigs)) notes.push({ type: "gig", ref: `gig:${id}` })
  for (const id of newIds(prev.jobs, next.jobs)) notes.push({ type: "hire", ref: `job:${id}` })
  for (const id of newKeys(prev.equipment, next.equipment)) notes.push({ type: "gear", ref: `gear:${id}` })
  for (const id of newKeys(prev.owned, next.owned)) notes.push({ type: "invest", ref: `capital:${id}` })
  if (prev.owned !== next.owned) {
    const before = erasHeld(prev.owned)
    const after = erasHeld(next.owned)
    for (const era of ERA_ORDER) if (after.has(era) && !before.has(era)) notes.push({ type: "era", ref: `era:${era}` })
  }
  for (const id of newIds(prev.gold, next.gold)) {
    if (GOLD_SKILLS.some((row) => row.id === id)) notes.push({ type: "perk", ref: `gold:${id}` })
  }
  // Read from progress, not the stored phase: the store moves that a beat later, in its own update.
  const from = phaseOf(prev)
  const to = phaseOf(next)
  if (phaseRank(to) > phaseRank(from)) {
    for (const phase of PHASES) {
      if (phaseRank(phase) > phaseRank(from) && phaseRank(phase) <= phaseRank(to)) notes.push({ type: "phase", ref: `phase:${phase}` })
    }
  }
  return notes
}

/** Rows whose gates are open now but that have not been unlocked yet, in table order. */
export function newlyOpen(progress: FeatureProgress, unlocked: readonly FeatureId[]): FeatureRow[] {
  if (unlocked.length >= FEATURES.length) return []
  const have = new Set<string>(unlocked)
  return FEATURES.filter((row) => !have.has(row.id) && triggerMet(row.trigger, progress))
}

/** NEW markers sit on things the player can go and use. Boards change the tab on their own, and dollars are just a number. */
export function getsMarker(row: FeatureRow): boolean {
  return row.size !== "phase" && row.id !== "money" && row.id !== "studio"
}

/** How loud each size is, for picking the one reveal a batch keeps. */
const LOUDNESS: Record<FeatureRow["size"], number> = { big: 3, standard: 2, small: 1, phase: 0 }

/** A batch at least this large (an admin grant, a test jump) plays one summary instead of a queue of cards. */
export const REVEAL_BATCH_LIMIT = 4

export type UnlockPlan = {
  unlocked: FeatureId[]
  fresh: FeatureId[]
  reveals: FeatureId[]
  notes: CareerNote[]
}

/**
 * What a set of newly opened rows does: every row is unlocked and logged; rows with a place to go get a NEW marker;
 * reveals queue in table order. A cosmetic whose picker is still closed arrives quietly with its picker. `quiet`
 * (a return, a batch) keeps only the loudest reveal.
 */
export function planUnlocks(
  rows: readonly FeatureRow[],
  slice: Pick<CareerSlice, "unlocked" | "fresh" | "reveals">,
  quiet = false,
): UnlockPlan {
  const unlocked = [...slice.unlocked]
  const fresh = [...slice.fresh]
  const queued: FeatureRow[] = []
  const notes: CareerNote[] = []
  for (const row of rows) {
    unlocked.push(row.id)
    // A board that changes the phase already has its own line ("Job Board opened").
    if (row.size !== "phase") notes.push({ type: "unlock", ref: row.id })
    if (getsMarker(row) && !fresh.includes(row.id)) fresh.push(row.id)
    if (row.size === "phase") continue
    if (isCosmetic(row) && !(row.parent && slice.unlocked.includes(row.parent))) continue
    queued.push(row)
  }
  const loud = queued.filter((row) => !isCosmetic(row))
  let reveals = queued.map((row) => row.id)
  if (quiet || loud.length >= REVEAL_BATCH_LIMIT) {
    const loudest = [...queued].sort((a, b) => LOUDNESS[b.size] - LOUDNESS[a.size])[0]
    reveals = loudest ? [loudest.id] : []
  }
  return { unlocked, fresh, reveals: [...slice.reveals, ...reveals], notes }
}

/** Clears a NEW marker. Opening a picker also clears the NEW items inside it. */
export function seenFresh(fresh: readonly FeatureId[], id: FeatureId): FeatureId[] {
  const prefix = id === "themes" ? "theme:" : id === "clickKits" ? "kit:" : id === "music" ? "music:" : null
  const next = fresh.filter((key) => key !== id && !(prefix && key.startsWith(prefix)))
  return next.length === fresh.length ? (fresh as FeatureId[]) : next
}

function cleanIds(ids: readonly string[]): FeatureId[] {
  return ids.filter(isFeatureId)
}

/** The opening notes for a save from before the timeline: what it already holds, as of this load. */
function backfillNotes(save: SaveData, open: readonly FeatureId[]): CareerNote[] {
  const notes: CareerNote[] = [{ type: "start", ref: "", data: { backfill: true } }]
  const phase = phaseOf(save)
  for (const step of PHASES) {
    if (step !== "A" && phaseRank(step) <= phaseRank(phase)) notes.push({ type: "phase", ref: `phase:${step}`, data: { backfill: true } })
  }
  for (const id of save.jobs) notes.push({ type: "hire", ref: `job:${id}`, data: { backfill: true } })
  const eras = erasHeld(save.owned)
  for (const era of ERA_ORDER) if (eras.has(era)) notes.push({ type: "era", ref: `era:${era}`, data: { backfill: true } })
  for (const id of open) {
    if (featureById(id)?.size !== "phase") notes.push({ type: "unlock", ref: id, data: { backfill: true } })
  }
  return notes
}

function hasProgress(save: SaveData): boolean {
  const any = (map: OwnedMap) => Object.values(map).some((count) => count > 0)
  return save.xpTotal > 0 || any(save.skills) || any(save.equipment) || any(save.owned) || save.jobs.length > 0 || save.gigs.length > 0
}

export type CareerBoot = CareerSlice & {
  /** Names of rows that opened while the player was away, for the sticky note. */
  awayUnlocks: string[]
}

/**
 * The timeline at boot. A save from before it gets everything it already earned, quietly, plus the desk cat it
 * already had, and a one-time card. A current save picks up where it left off; rows that opened while the player
 * was away go on the sticky note and only the loudest one plays.
 */
export function bootCareer(save: SaveData, now: number): CareerBoot {
  const progress = (returns: number): FeatureProgress => ({
    ...save,
    gold: save.gold ?? [],
    returns,
    playTimeMs: save.stats?.playTimeMs ?? 0,
  })

  if (!save.career) {
    if (!hasProgress(save)) {
      const journal = appendNotes(emptyJournal(), [{ type: "start", ref: "" }], save, now)
      return { journal, unlocked: [], fresh: [], returns: 0, reveals: [], whatsNew: false, awayUnlocks: [] }
    }
    const open = [...new Set<FeatureId>([...openFeatureIds(progress(1)), "cat"])]
    const journal = appendNotes(emptyJournal(), backfillNotes(save, open), save, now)
    return { journal, unlocked: open, fresh: [], returns: 1, reveals: [], whatsNew: true, awayUnlocks: [] }
  }

  const saved = save.career
  const slice: CareerSlice = {
    journal: journalFromSave(saved),
    unlocked: cleanIds(saved.unlocked),
    fresh: cleanIds(saved.fresh),
    returns: saved.returns,
    reveals: [],
    whatsNew: false,
  }
  const rows = newlyOpen(progress(saved.returns), slice.unlocked)
  if (rows.length === 0) return { ...slice, awayUnlocks: [] }
  const plan = planUnlocks(rows, slice, true)
  return {
    ...slice,
    journal: appendNotes(slice.journal, plan.notes, save, now),
    unlocked: plan.unlocked,
    fresh: plan.fresh,
    reveals: plan.reveals,
    awayUnlocks: rows.filter((row) => row.size !== "phase").map((row) => featureById(row.id)?.name ?? row.id),
  }
}
