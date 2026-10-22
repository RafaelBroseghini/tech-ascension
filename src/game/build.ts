/**
 * The career's build: which specialization it picked, whether it has used its one switch, the highest rank it
 * held before a switch gave its old track up, and which leadership line it took after Senior. Pure rules; the data is
 * src/data/specializations.ts and src/data/leadership.ts, and the rows are in src/data/phases.ts. The store keeps the
 * state, the save carries it as an optional `build` block.
 */
import { highestJobRank, firstJobAtRank, JOB_TIERS } from "../data/phases.ts"
import type { JobTier } from "../data/phases.ts"
import { isLeadId, LEAD_NEEDED_ABOVE_RANK, LEAD_OPEN_RANK, LEADERSHIP } from "../data/leadership.ts"
import type { LeadId } from "../data/leadership.ts"
import { isSpecId, specById, SPECIALIZATIONS, TRUNK_TOP_RANK } from "../data/specializations.ts"
import type { SpecId } from "../data/specializations.ts"
import type { Hire, Hires } from "./globe/hires.ts"

const JOB_BY_ID = new Map<number, JobTier>(JOB_TIERS.map((row) => [row.id, row]))

export type BuildState = {
  /** The specialization picked, or null before the pick. Locked once picked, apart from the one switch. */
  spec: SpecId | null
  /** True once the career has used its one switch. */
  switched: boolean
  /**
   * The highest job rank held before a switch dropped the old track's jobs. Rank gates (capital, gear) read
   * `heldRank`, the larger of this and the jobs held now, so a switch never closes what was already open.
   */
  peakRank?: number
  /** The leadership line picked after Senior (IC or Manager), or left out before the pick. Locked once picked. */
  leadership?: LeadId
}

export const FRESH_BUILD: BuildState = { spec: null, switched: false }

/** Anything that carries a build. Left out means no pick yet. */
export type HasBuild = { build?: BuildState }

export const specOf = (p: HasBuild): SpecId | null => p.build?.spec ?? null

export const leadOf = (p: HasBuild): LeadId | null => p.build?.leadership ?? null

export function isFreshBuild(build: BuildState | undefined): boolean {
  return !build || (build.spec === null && !build.switched && !(build.peakRank && build.peakRank > 0) && !build.leadership)
}

/** The rank the career has reached: the highest job held now, or before a switch, whichever is higher. Rank gates read this. */
export function heldRank(p: HasBuild & { jobs: readonly number[] }): number {
  return Math.max(highestJobRank(p.jobs), p.build?.peakRank ?? 0)
}

/** The pick opens once a job of the trunk's top rank (Mid-level SWE) is held. */
export function pickOpen(p: HasBuild & { jobs: readonly number[] }): boolean {
  return specOf(p) === null && heldRank(p) >= TRUNK_TOP_RANK
}

export function canPick(p: HasBuild & { jobs: readonly number[] }, id: unknown): id is SpecId {
  return isSpecId(id) && pickOpen(p)
}

/** The build after the pick. */
export function pickedBuild(build: BuildState | undefined, id: SpecId): BuildState {
  return { ...(build ?? FRESH_BUILD), spec: id }
}

export function canSwitch(p: HasBuild & { jobs: readonly number[] }, id: unknown): id is SpecId {
  const spec = specOf(p)
  return isSpecId(id) && spec !== null && !p.build?.switched && id !== spec
}

/** The jobs left after leaving a track: the trunk and the shared rows stay, the old track's rows go. */
export function jobsAfterSwitch(jobs: readonly number[], from: SpecId): number[] {
  return jobs.filter((id) => JOB_BY_ID.get(id)?.spec !== from)
}

/** The build after the switch. The rank reached so far is kept, so the gates it opened stay open, and so is the leadership line. */
export function switchedBuild(p: HasBuild & { jobs: readonly number[] }, id: SpecId): BuildState {
  return { ...(p.build ?? FRESH_BUILD), spec: id, switched: true, peakRank: heldRank(p) }
}

/** The leadership pick opens once a Senior job (rank 14) is held, now or before a switch. */
export function leadPickOpen(p: HasBuild & { jobs: readonly number[] }): boolean {
  return leadOf(p) === null && heldRank(p) >= LEAD_OPEN_RANK
}

export function canPickLead(p: HasBuild & { jobs: readonly number[] }, id: unknown): id is LeadId {
  return isLeadId(id) && leadPickOpen(p)
}

/** The build after the leadership pick. */
export function leadPickedBuild(build: BuildState | undefined, id: LeadId): BuildState {
  return { ...(build ?? FRESH_BUILD), leadership: id }
}

/** The lines the player could take right now: both while the pick is open, none otherwise. */
export function leadOptions(p: HasBuild & { jobs: readonly number[] }): LeadId[] {
  return leadPickOpen(p) ? LEADERSHIP.map((row) => row.id) : []
}

/** Why a hire kind is shut for this career, or null when it is open. Hiring belongs to the Manager line, and each kind opens at a manager rank. */
export function hireLocked(p: HasBuild & { jobs: readonly number[] }, row: Pick<Hire, "rank">): string | null {
  if (leadOf(p) !== "manager") return "Hiring opens when you lead as a Manager"
  if (highestJobRank(p.jobs) < row.rank) return `Needs ${firstJobAtRank(row.rank)?.name ?? `job ${row.rank}`}`
  return null
}

/** The specializations the player could take right now: all of them to pick, the other five to switch, none otherwise. */
export function specOptions(p: HasBuild & { jobs: readonly number[] }): SpecId[] {
  if (pickOpen(p)) return SPECIALIZATIONS.map((row) => row.id)
  const spec = specOf(p)
  if (spec !== null && !p.build?.switched) return SPECIALIZATIONS.filter((row) => row.id !== spec).map((row) => row.id)
  return []
}

/** A row the career can see: shared, on its own track, or on its own line. With no line picked yet, a line's rows are not hidden: they wait for the pick. */
export const rowVisible = (job: JobTier, spec: SpecId | null, lead: LeadId | null = null): boolean =>
  (job.spec === undefined || job.spec === spec) && (job.lead === undefined || lead === null || job.lead === lead)

/** Every job above the trunk needs a picked specialization. */
export const needsPick = (job: JobTier): boolean => job.rank > TRUNK_TOP_RANK

/** Every job above the specialization tracks (rank 15) needs a picked leadership line. */
export const needsLead = (job: JobTier): boolean => job.rank > LEAD_NEEDED_ABOVE_RANK

/**
 * What a save's build block makes of itself. An unknown spec is dropped. A save from before specializations that
 * holds a job above the trunk was on the plain ladder, which is Backend; one that holds another track's row (a
 * hand-edited save) takes that track. Jobs of other tracks are never kept alongside a pick.
 *
 * A save from before leadership that holds a job above rank 15 and picked no line takes one: Manager when it holds
 * hires or a manager-only row and no IC-only row, IC otherwise. Jobs of the other line are dropped. Hires are never
 * dropped here; they keep working, they just cannot be bought under IC.
 */
export function normalizeBuild(raw: unknown, jobs: readonly number[], hires: Hires = {}): { build: BuildState | undefined; jobs: number[] } {
  const record = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  let spec: SpecId | null = isSpecId(record.spec) ? record.spec : null
  if (spec === null && highestJobRank(jobs) > TRUNK_TOP_RANK) {
    const track = jobs.map((id) => JOB_BY_ID.get(id)).filter((job): job is JobTier => job?.spec !== undefined).sort((a, b) => b.rank - a.rank)[0]
    spec = track?.spec ?? "backend"
  }
  let lead: LeadId | null = isLeadId(record.leadership) ? record.leadership : null
  if (lead === null && highestJobRank(jobs) > LEAD_NEEDED_ABOVE_RANK) {
    const held = jobs.map((id) => JOB_BY_ID.get(id)?.lead)
    const manager = Object.keys(hires).length > 0 || held.includes("manager")
    lead = manager && !held.includes("ic") ? "manager" : "ic"
  }
  const peak = typeof record.peakRank === "number" && Number.isFinite(record.peakRank) ? Math.floor(record.peakRank) : 0
  const peakRank = Math.min(Math.max(0, peak), 31)
  const kept = jobs.filter((id) => {
    const row = JOB_BY_ID.get(id)
    return row !== undefined && rowVisible(row, spec, lead) && (lead !== null || row.lead === undefined)
  })
  const build: BuildState = { spec, switched: spec !== null && record.switched === true, ...(peakRank > 0 ? { peakRank } : {}), ...(lead !== null ? { leadership: lead } : {}) }
  return { build: isFreshBuild(build) ? undefined : build, jobs: kept }
}

/** Where a click comes from. Hover clicks and auto-click are "auto"; only a manual click earns a click build's multiple. */
export type ClickSource = "manual" | "auto"

/**
 * A click build's promise: manual clicks at 2 a second pay 5 times the idle $/s while clicking, with every job the build
 * can see held. 5 minutes of clicking are then worth about 30 minutes of idle (the other 5 of the 30 are the idle that
 * keeps running). A click is therefore worth 2.5 times the idle $/s.
 */
export const MANUAL_CLICKS_PER_SEC = 2
export const CLICK_BUILD_TARGET = 5
const CLICK_BUILD_CLICK_WORTH = CLICK_BUILD_TARGET / MANUAL_CLICKS_PER_SEC

/**
 * The jobs' click share once every row of the ladder is held, both leadership lines' rows together: the sum of their
 * `clickPct` as a fraction (0.68). Every track has the same rows' numbers, so every build gets the same. A career holds
 * one line only (27 rows as an IC, 26 as a Manager), so a fully held click build lands at about 4.2 times, not 5 (tuning
 * is open, docs/BUILDS.md).
 */
const FULL_CLICK_SHARE = JOB_TIERS.filter((job) => job.spec === undefined || job.spec === "frontend").reduce((sum, job) => sum + job.clickPct, 0) / 100

/**
 * The click build's multiplier on the jobs' click share. The plain ladder's share is 0.68, so 2.5 / 0.68 lifts a fully
 * held build to a share of 2.5 per click (5 at 2 clicks a second).
 */
export const CLICK_BUILD_CLICK_MULT = CLICK_BUILD_CLICK_WORTH / FULL_CLICK_SHARE

/** An idle build earns a quarter more while away and half the click share, so its clicks matter less. */
export const IDLE_BUILD_IDLE_MULT = 1.25
export const IDLE_BUILD_CLICK_MULT = 0.5

/** What a build's style does to the plain ladder: a multiplier on idle $/s and one on the jobs' click share. */
export type StyleFactors = { idle: number; click: number }

const NO_STYLE: StyleFactors = { idle: 1, click: 1 }
const CLICK_STYLE: StyleFactors = { idle: 1, click: CLICK_BUILD_CLICK_MULT }
const IDLE_STYLE: StyleFactors = { idle: IDLE_BUILD_IDLE_MULT, click: IDLE_BUILD_CLICK_MULT }

export function styleFactors(spec: SpecId | null): StyleFactors {
  if (spec === null) return NO_STYLE
  const style = specById(spec).style
  return style === "click" ? CLICK_STYLE : style === "idle" ? IDLE_STYLE : NO_STYLE
}

/**
 * The multiplier on the jobs' click share for one kind of click. Hover and auto clicks never get a click build's
 * multiple; an idle build's penalty still applies to them.
 */
export function clickShareMult(spec: SpecId | null, source: ClickSource): number {
  const mult = styleFactors(spec).click
  return source === "manual" ? mult : Math.min(1, mult)
}
