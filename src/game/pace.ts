/**
 * Pacing model: how long a player who is not at the game all day takes to own every row at least once
 * (`ownsEverything`). It plays the real tables with the real gates, so a table change moves the answer.
 * The formula it backs, and the numbers it gives, are in docs/PACING.md. `npm run pace` prints them.
 *
 * What the model assumes about the player:
 * - They visit `visitsPerDay` times, evenly spaced, and stay `minutesPerVisit` each time, clicking
 *   `clicksPerSec` the whole visit. Nothing is bought while they are away.
 * - Away time pays idle income and idle XP up to the offline cap, once, when they return.
 * - They take every gig and job as soon as it opens, and buy a first copy of anything as soon as they can.
 * - They buy a second copy of a skill, gear row or capital row only when it pays for itself within
 *   `paybackSeconds`, best payback first. That one number is how well they reinvest.
 * It leaves out random events and click boosts, so the answer is a plain estimate with no luck in it.
 */
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { GIGS, SKILL_TIERS, highestJobRank, visibleJobs } from "../data/phases.ts"
import type { LeadId } from "../data/leadership.ts"
import type { SpecId } from "../data/specializations.ts"
import type { TreeView } from "./tree/index.ts"
import { leadPickedBuild, leadPickOpen, pickedBuild, pickOpen } from "./build.ts"
import {
  canAfford,
  capitalBase,
  clickPower,
  clickShare,
  gearBase,
  idlePerSec,
  isGearRevealed,
  isRevealed,
  isSkillRevealed,
  nextCost,
  ownedCount,
  skillCost,
  xpPerClick,
  xpPerSec,
} from "./economy.ts"
import type { Progress } from "./economy.ts"
import { LEGACY_PERKS, PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import { canBuyPerk, earningsPrestige, exitOpen, freshLegacy, mergeGrant, startingGrant } from "./legacy.ts"
import type { LegacyState } from "./legacy.ts"
import { prestigeMult } from "./mods.ts"
import { perkEffects } from "./perks.ts"
import { ownsEverything } from "./nextUnlock.ts"
import { canBuyJob, capitalUnlocked, equipmentOpen, gigBoardUnlocked, gigState, jobBoardUnlocked } from "./phase.ts"

const DAY_SECONDS = 86_400

/** Away time that still pays. The game's own cap is `OFFLINE_CAP_MS` in save.ts; a test keeps the two equal. */
export const OFFLINE_CAP_SECONDS = 8 * 60 * 60

export type PlayProfile = {
  /** Times the player opens the game in a day, evenly spaced. */
  visitsPerDay: number
  /** Minutes they stay each visit. */
  minutesPerVisit: number
  /** Clicks per second while they are there. */
  clicksPerSec: number
}

export type Cadence = {
  cycleSeconds: number
  activeSeconds: number
  awaySeconds: number
  /** Share of wall-clock time that earns idle income: each visit plus the away time up to the offline cap. */
  idleShare: number
  /** Clicks per wall-clock second, averaged over the whole day. */
  clicksPerWallSecond: number
}

export function cadenceOf(profile: PlayProfile, capSeconds: number = OFFLINE_CAP_SECONDS): Cadence {
  const cycleSeconds = DAY_SECONDS / profile.visitsPerDay
  const activeSeconds = Math.min(cycleSeconds, profile.minutesPerVisit * 60)
  const awaySeconds = cycleSeconds - activeSeconds
  const earningSeconds = activeSeconds + Math.min(awaySeconds, capSeconds)
  return {
    cycleSeconds,
    activeSeconds,
    awaySeconds,
    idleShare: earningSeconds / cycleSeconds,
    clicksPerWallSecond: (profile.clicksPerSec * activeSeconds) / cycleSeconds,
  }
}

/** The track the model takes when it reaches the pick, unless a run asks for another. Backend is the plain ladder. */
export const DEFAULT_PACE_SPEC: SpecId = "backend"

/** The line the model takes when it reaches Senior, unless a run asks for another. */
export const DEFAULT_PACE_LEAD: LeadId = "ic"

/** Share of idle income each click adds once every job the pace build can see is held: the sum of their `clickPct`, as a fraction. */
export const FINAL_CLICK_SHARE = clickShare({ jobs: visibleJobs(DEFAULT_PACE_SPEC, DEFAULT_PACE_LEAD).map((job) => job.id) })

/**
 * The fitted constant of the formula, in days. The model's finish time is close to `k / pace`, where `pace` is
 * how much of a full day of income the player really collects (`paceOf`). A smaller `k` is a player who
 * reinvests better. Both were fitted to `simulatePace` over visits of 10 to 60 minutes, once to many times a
 * day, and `pace.test.ts` fails if the tables drift far enough to make them wrong. The stacker constant
 * only holds for a player who visits at least daily; further apart, use the one-of-each player's.
 */
export const PACE_K = { oneOfEach: 0.8, stacker: 0.9 } as const

/** Multiplier on a full always-open, never-clicking day of income: idle share plus what clicking adds. */
export function paceOf(profile: PlayProfile): number {
  const cad = cadenceOf(profile)
  return cad.idleShare + cad.clicksPerWallSecond * FINAL_CLICK_SHARE
}

/** The closed-form estimate the docs give, in days: `k / paceOf(profile)`. */
export function estimateDays(profile: PlayProfile, k: number): number {
  return k / paceOf(profile)
}

/** The milestones a career passes, in the order a result lists them. The `all` ones are the finish line. */
export const PACE_MILESTONES = [
  "gigBoard",
  "gear",
  "jobBoard",
  "midJob",
  "seniorJob",
  "capital",
  "allSkills",
  "allGigs",
  "allJobs",
  "allGear",
  "allCapital",
] as const

export type PaceMilestone = (typeof PACE_MILESTONES)[number]

/** Job ranks of the picks: Mid-level SWE (the specialization pick) and Senior SWE (the leadership pick). A milestone is met by holding a job of that rank or higher. */
export const MID_JOB_RANK = 7
export const SENIOR_JOB_RANK = 14

export type PaceResult = {
  profile: PlayProfile
  /** True when everything was owned before `maxDays`. */
  complete: boolean
  /** Wall-clock days until the career finished by owning everything (or `maxDays` when it never did). */
  days: number
  /** Wall-clock day everything was owned (`ownsEverything`), or null if it never was. The formula in docs/PACING.md is about this day. */
  ownedDays: number | null
  /** The day each milestone first held, for the ones that did. */
  milestones: Partial<Record<PaceMilestone, number>>
  /** The profile's earning share of the day and clicks per wall-clock second, the two terms of the formula. */
  idleShare: number
  clicksPerWallSecond: number
  /**
   * The most visits in a row that bought no first copy (of a skill, gig, job, gear or capital row) before
   * everything was owned. The model only buys at visits, so a wait is counted in visits, not minutes.
   */
  longestWaitVisits: number
}

type Sim = Omit<Progress, "jobs" | "gigs"> & {
  jobs: number[]
  gigs: number[]
  /** The Prestige multiplier on every income and XP rate. 1 in a single run. */
  mult: number
  /** Dollars credited this career (gig lumps, idle and click income); the seed money is not. */
  earned: number
  /** The specialization the run picks the first time it holds Mid-level SWE. */
  track: SpecId
  /** The leadership line the run picks the first time it holds Senior SWE. */
  lead: LeadId
  /** A test's probe, called at every round of the shop (`PaceOptions.inspect`). */
  inspect?: (career: PaceCareer) => void
}

function freshSim(track: SpecId, lead: LeadId): Sim {
  return {
    track,
    lead,
    money: 0,
    xp: 0,
    xpTotal: 0,
    peakMoney: 0,
    skills: {},
    equipment: {},
    owned: {},
    jobs: [],
    gigs: [],
    mult: 1,
    earned: 0,
  }
}

const MILESTONE_TESTS: Record<PaceMilestone, (s: Sim) => boolean> = {
  gigBoard: gigBoardUnlocked,
  gear: equipmentOpen,
  jobBoard: jobBoardUnlocked,
  midJob: (s) => highestJobRank(s.jobs) >= MID_JOB_RANK,
  seniorJob: (s) => highestJobRank(s.jobs) >= SENIOR_JOB_RANK,
  capital: capitalUnlocked,
  allSkills: (s) => SKILL_TIERS.every((row) => ownedCount(s.skills, row.id) > 0),
  allGigs: (s) => GIGS.every((gig) => s.gigs.includes(gig.id)),
  allJobs: (s) => visibleJobs(s.track, s.lead).every((job) => s.jobs.includes(job.id)),
  allGear: (s) => GEAR.every((row) => ownedCount(s.equipment, row.id) > 0),
  allCapital: (s) => CAPITAL.every((row) => ownedCount(s.owned, row.id) > 0),
}

/** Rows held at least once across every catalog: the count a "first copy" bought during a visit raises. */
function firstCopies(s: Sim): number {
  const held = (rows: readonly { id: number }[], owned: Record<string, number>) => rows.filter((row) => ownedCount(owned, row.id) > 0).length
  return held(SKILL_TIERS, s.skills) + held(GEAR, s.equipment) + held(CAPITAL, s.owned) + s.gigs.length + s.jobs.length
}

function earn(s: Sim, money: number, xp: number) {
  s.earned += money
  s.money += money
  s.xp += xp
  s.xpTotal += xp
  if (s.money > s.peakMoney) s.peakMoney = s.money
}

/** Gigs cost nothing, so they are cleared the moment they open. */
function clearGigs(s: Sim): boolean {
  let any = false
  for (let changed = true; changed; ) {
    changed = false
    for (const gig of GIGS) {
      if (gigState(s, gig) !== "ready") continue
      s.gigs.push(gig.id)
      s.gigs.sort((a, b) => a - b)
      earn(s, gig.lump, 0)
      changed = any = true
    }
  }
  return any
}

/** The model takes its track the moment the pick opens (Mid-level SWE held) and its line once Senior is held. */
function takePicks(s: Sim): boolean {
  let any = false
  if (pickOpen(s)) {
    s.build = pickedBuild(s.build, s.track)
    any = true
  }
  if (leadPickOpen(s)) {
    s.build = leadPickedBuild(s.build, s.lead)
    any = true
  }
  return any
}

/** A job pays salary and, for the teaching ones, XP, so it is taken the moment it can be afforded. */
function takeJobs(s: Sim): boolean {
  let any = takePicks(s)
  for (const job of visibleJobs(s.track, s.lead)) {
    if (!canBuyJob(s, job)) continue
    s.xp -= job.xpCost
    s.jobs.push(job.id)
    s.jobs.sort((a, b) => a - b)
    earn(s, 0, job.xpLump)
    takePicks(s)
    any = true
  }
  return any
}

/**
 * Gear and capital are bought by payback: `cost / gain`, where `gain` is the $/s the copy adds as the
 * player actually earns it (idle share of the day, plus the click share of a visit). A first copy is bought
 * as soon as it is affordable. A repeat copy is bought only if its payback is within `paybackSeconds`.
 * The best payback goes first. A row that adds nothing is bought last, once nothing better is left.
 */
function spendMoney(s: Sim, cad: Cadence, paybackSeconds: number): boolean {
  let any = false
  for (let guard = 0; guard < 2000; guard++) {
    const paysClicks = s.jobs.length > 0
    const perIdleSecond = cad.idleShare + (paysClicks ? cad.clicksPerWallSecond * clickShare(s) : 0)
    const perClick = paysClicks ? cad.clicksPerWallSecond : 0
    const capitalIncome = perkEffects(s.legacy?.perks).capitalIncome

    let best: { payback: number; cost: number; buy: () => void } | null = null
    const consider = (cost: number, first: boolean, gain: number, buy: () => void) => {
      if (!canAfford(s.money, cost)) return
      const payback = gain > 0 ? cost / gain : Number.POSITIVE_INFINITY
      if (!first && payback > paybackSeconds) return
      if (!best || payback < best.payback || (payback === best.payback && cost < best.cost)) best = { payback, cost, buy }
    }

    for (const row of GEAR) {
      const have = ownedCount(s.equipment, row.id)
      if (!equipmentOpen(s) || !isGearRevealed(row, s.equipment, s.peakMoney, s.jobs, s.build?.peakRank)) continue
      consider(nextCost(gearBase(row, s), have), have === 0, (row.cps * perIdleSecond + row.clickBonus * perClick) * s.mult, () => (s.equipment[String(row.id)] = have + 1))
    }
    if (capitalUnlocked(s)) {
      for (const row of CAPITAL) {
        const have = ownedCount(s.owned, row.id)
        if (!isRevealed(row, s.owned, s.peakMoney)) continue
        consider(nextCost(capitalBase(row, s), have), have === 0, (row.cps * capitalIncome * perIdleSecond + row.clickBonus * perClick) * s.mult, () => (s.owned[String(row.id)] = have + 1))
      }
    }

    const pick = best as { cost: number; buy: () => void } | null
    if (!pick) break
    s.money -= pick.cost
    pick.buy()
    any = true
  }
  return any
}

/** Skills follow the same rule, paid in XP, with `gain` in XP/s: the study rate plus the XP a click pays. */
function spendXp(s: Sim, cad: Cadence, paybackSeconds: number): boolean {
  let any = false
  for (let guard = 0; guard < 2000; guard++) {
    let best: { payback: number; cost: number; id: number } | null = null
    for (const row of SKILL_TIERS) {
      const have = ownedCount(s.skills, row.id)
      if (!isSkillRevealed(row, s.skills, s.xpTotal)) continue
      const cost = skillCost(row, have)
      if (!canAfford(s.xp, cost)) continue
      const gain = (row.xpPerSec * cad.idleShare + row.xpPerClick * cad.clicksPerWallSecond) * s.mult
      const payback = gain > 0 ? cost / gain : Number.POSITIVE_INFINITY
      if (have > 0 && payback > paybackSeconds) continue
      if (!best || payback < best.payback || (payback === best.payback && cost < best.cost)) best = { payback, cost, id: row.id }
    }
    const pick = best as { cost: number; id: number } | null
    if (!pick) break
    s.xp -= pick.cost
    s.skills[String(pick.id)] = ownedCount(s.skills, pick.id) + 1
    any = true
  }
  return any
}

/** Buy until nothing more is worth buying, since each buy can open the next. */
function shop(s: Sim, cad: Cadence, paybackSeconds: number) {
  for (let round = 0; round < 40; round++) {
    s.inspect?.(s)
    const moved = [clearGigs(s), takeJobs(s), spendMoney(s, cad, paybackSeconds), spendXp(s, cad, paybackSeconds)]
    if (!moved.some(Boolean)) return
  }
}

export type PaceOptions = {
  /** Give up after this many days. */
  maxDays?: number
  /**
   * A second copy is bought only if it pays for itself within this many seconds of the player's own earning
   * (best payback first). 0 never buys one. Default `STACKER_PAYBACK_SECONDS`.
   */
  paybackSeconds?: number
  /** The specialization the career picks at Mid-level SWE. Default `DEFAULT_PACE_SPEC` (Backend, the plain ladder). */
  specialization?: SpecId
  /** The leadership line the career picks at Senior SWE. Default `DEFAULT_PACE_LEAD` (IC). */
  leadership?: LeadId
  /** Called with the career at every round of the shop, so a test can check the whole game's rules against it. Never set in play. */
  inspect?: (career: PaceCareer) => void
}

/** What a probe sees of the career: the same shape the shop and the tree read. */
export type PaceCareer = TreeView & { equipment: Record<string, number> }

/**
 * Two players the docs quote. The one-of-each player takes what the shop lists and re-buys only what pays for itself
 * within the hour, which in practice is almost nothing. The stacker re-buys anything that pays for itself
 * within two days, which is where the finish stops getting faster and starts to waste money.
 */
export const ONE_OF_EACH_PAYBACK_SECONDS = 60 * 60
export const STACKER_PAYBACK_SECONDS = 2 * DAY_SECONDS

/** The single career. It finishes when it owns everything. */
export function simulatePace(profile: PlayProfile, options: PaceOptions = {}): PaceResult {
  const maxSeconds = (options.maxDays ?? 365) * DAY_SECONDS
  const cad = cadenceOf(profile)
  const paybackSeconds = options.paybackSeconds ?? STACKER_PAYBACK_SECONDS
  const s = freshSim(options.specialization ?? DEFAULT_PACE_SPEC, options.leadership ?? DEFAULT_PACE_LEAD)
  if (options.inspect) s.inspect = options.inspect
  const milestones: Partial<Record<PaceMilestone, number>> = {}
  let t = 0
  let ownedAt: number | null = null

  const note = () => {
    for (const id of PACE_MILESTONES) {
      if (milestones[id] === undefined && MILESTONE_TESTS[id](s)) milestones[id] = t / DAY_SECONDS
    }
    if (ownedAt === null && ownsEverything(s)) ownedAt = t
  }
  const finished = () => ownedAt !== null
  let longestWait = 0
  let wait = 0
  // A visit that bought a first copy ends the wait; one that did not extends it.
  const endVisit = (before: number) => {
    if (ownedAt !== null) return
    wait = firstCopies(s) > before ? 0 : wait + 1
    longestWait = Math.max(longestWait, wait)
  }
  const result = (complete: boolean): PaceResult => ({
    profile,
    complete,
    days: complete ? (ownedAt ?? 0) / DAY_SECONDS : t / DAY_SECONDS,
    ownedDays: ownedAt === null ? null : ownedAt / DAY_SECONDS,
    milestones,
    idleShare: cad.idleShare,
    clicksPerWallSecond: cad.clicksPerWallSecond,
    longestWaitVisits: longestWait,
  })

  for (let cycle = 0; cycle * cad.cycleSeconds < maxSeconds; cycle++) {
    t = cycle * cad.cycleSeconds
    if (cycle > 0) {
      // Coming back pays the time away, up to the cap, at the rates held when they left.
      const away = Math.min(cad.awaySeconds, OFFLINE_CAP_SECONDS)
      earn(s, idlePerSec(s) * s.mult * away, xpPerSec(s) * s.mult * away)
    }
    const before = firstCopies(s)
    shop(s, cad, paybackSeconds)
    note()
    if (finished()) {
      endVisit(before)
      return result(true)
    }

    for (let spent = 0; spent < cad.activeSeconds; ) {
      const step = Math.min(cad.activeSeconds - spent, Math.max(5, Math.min(900, t * 0.003)))
      const clickMoney = s.jobs.length > 0 ? clickPower(s) : 0
      earn(
        s,
        (idlePerSec(s) + profile.clicksPerSec * clickMoney) * s.mult * step,
        (xpPerSec(s) + profile.clicksPerSec * xpPerClick(s.skills)) * s.mult * step,
      )
      spent += step
      t += step
      shop(s, cad, paybackSeconds)
      note()
      if (finished()) {
        endVisit(before)
        return result(true)
      }
    }
    endVisit(before)
  }
  return result(false)
}

/** The Exit's capital row: the first career reaches it, and the table prints when. */
const EXIT_ROW = 6

/** One career in a multi-run result. */
export type ExitRun = {
  run: number
  /** Wall-clock day the career started, and the day it ended (the Exit, or the finish). */
  startDay: number
  endDay: number
  /** Days into the career when capital row 6 was bought, or null if it never was. */
  row6Days: number | null
  /** Days into the career when the Exit first opened (the first career: when it would pay a Prestige), or null if it never did. */
  exitOpenDays: number | null
  /** Days into the career when every row was owned (`ownsEverything`), or null. */
  ownedDays: number | null
  /** Days into the career when it had earned what the career before it earned in all, or null for career 1 and when it never did. */
  catchUpDays: number | null
  /** Prestige the Exit paid (0 for a career that finished instead). */
  prestigeEarned: number
  /** Lifetime Prestige and the multiplier after this Exit. */
  prestigeTotal: number
  mult: number
  /** Legacy perks held when the career started. */
  perks: number
  /** Dollars the career earned. */
  earned: number
  /** True when the career owned every row (`ownsEverything`), and the model stopped there. */
  finished: boolean
}

export type ExitsResult = {
  profile: PlayProfile
  /** True when some career owned everything before `maxDays`. */
  complete: boolean
  /** Wall-clock days until it did (or `maxDays`). */
  days: number
  /** The run that finished, or null. */
  finishRun: number | null
  runs: ExitRun[]
}

export type ExitsOptions = PaceOptions & {
  /** Stop after this many careers. */
  maxRuns?: number
  /**
   * When the player leaves. "worth" (default): as soon as the Exit would raise the Prestige bonus by `minGrowth` or more
   * (the multiplier after, over the multiplier now). "falling": when the average Prestige per hour of the career starts to
   * fall, the best moment in theory; the economy grows so fast that this only happens once the career is nearly finished.
   */
  exitRule?: "worth" | "falling"
  /** For "worth": the smallest bonus growth worth a reset. Default `EXIT_MIN_GROWTH`. */
  minGrowth?: number
}

/** A first Exit worth taking: the bonus grows by 15%. */
export const EXIT_MIN_GROWTH = 1.15

/** Prestige the Exit would pay if the ladder were smooth: the rungs climbed so far plus the fraction toward the next. */
function smoothPrestige(legacy: LegacyState, earned: number): number {
  return Math.cbrt((legacy.earnedAllRuns + earned) / PRESTIGE_EARN_SCALE) - legacy.prestigeTotal
}

/** A new career under the perks held: the grant merged into an empty one, the Prestige multiplier on. */
function newCareer(legacy: LegacyState, track: SpecId, lead: LeadId): Sim {
  const s = freshSim(track, lead)
  const start = mergeGrant(s, startingGrant(legacy.perks))
  Object.assign(s, { skills: start.skills, gigs: start.gigs, jobs: start.jobs, xp: start.xp, xpTotal: start.xpTotal, money: start.money, peakMoney: start.peakMoney })
  s.mult = prestigeMult(legacy.prestigeTotal)
  s.legacy = { perks: [...legacy.perks] }
  return s
}

/** After an Exit: the cheapest perk the Prestige covers, across the two tracks, over and over. Network first on ties. */
function buyPerks(legacy: LegacyState) {
  for (;;) {
    let pick: (typeof LEGACY_PERKS)[number] | null = null
    for (const perk of LEGACY_PERKS) if (canBuyPerk(legacy, perk.id) && (pick === null || perk.cost < pick.cost)) pick = perk
    if (!pick) return
    legacy.prestige -= pick.cost
    legacy.perks = [...legacy.perks, pick.id]
  }
}

/**
 * The same player over several careers. At the start of a visit they leave through the Exit when it would raise the
 * Prestige bonus by `minGrowth` (15%) or more, or, with the `falling` rule, when the Prestige per hour of this career
 * starts to fall. Then they spend the Prestige on the cheapest perk they can pay for, across the Network and Capital
 * tracks (Network first on ties), and play the next career, which starts under those perks. It stops when a career owns
 * everything.
 */
export function simulateExits(profile: PlayProfile, options: ExitsOptions = {}): ExitsResult {
  const maxSeconds = (options.maxDays ?? 365) * DAY_SECONDS
  const maxRuns = options.maxRuns ?? 30
  const paybackSeconds = options.paybackSeconds ?? STACKER_PAYBACK_SECONDS
  const legacy = freshLegacy()
  const runs: ExitRun[] = []
  let s = newCareer(legacy, options.specialization ?? DEFAULT_PACE_SPEC, options.leadership ?? DEFAULT_PACE_LEAD)
  let cad = cadenceOf(profile)
  let runStart = 0
  let row6At: number | null = null
  let openAt: number | null = null
  let prevRate = 0
  let perksAtStart = 0
  let t = 0
  // What the career before this one earned, and the day this one matched it.
  let target = Number.POSITIVE_INFINITY
  let catchUpAt: number | null = null
  let ownedAt: number | null = null

  const noteRow6 = () => {
    if (row6At === null && ownedCount(s.owned, EXIT_ROW) > 0) row6At = (t - runStart) / DAY_SECONDS
    if (catchUpAt === null && s.earned >= target) catchUpAt = (t - runStart) / DAY_SECONDS
    if (ownedAt === null && ownsEverything(s)) ownedAt = (t - runStart) / DAY_SECONDS
  }
  const finishedNow = () => ownsEverything(s)
  const record = (finished: boolean, prestigeEarned: number): ExitRun => ({
    run: legacy.runs,
    startDay: runStart / DAY_SECONDS,
    endDay: t / DAY_SECONDS,
    row6Days: row6At,
    exitOpenDays: openAt,
    catchUpDays: catchUpAt,
    ownedDays: ownedAt,
    prestigeEarned,
    prestigeTotal: legacy.prestigeTotal,
    mult: prestigeMult(legacy.prestigeTotal),
    perks: perksAtStart,
    earned: s.earned,
    finished,
  })
  const done = (complete: boolean): ExitsResult => ({
    profile,
    complete,
    days: t / DAY_SECONDS,
    finishRun: complete ? legacy.runs : null,
    runs,
  })

  for (let cycle = 0; cycle * cad.cycleSeconds < maxSeconds; cycle++) {
    t = cycle * cad.cycleSeconds
    // The cap carries Long weekend: the perks held now are the ones this career started under.
    const capSeconds = OFFLINE_CAP_SECONDS + perkEffects(legacy.perks).offlineHours * 3600
    if (cycle > 0) {
      // The visit is paid at the rates held when they left.
      const away = Math.min(cad.awaySeconds, capSeconds)
      earn(s, idlePerSec(s) * s.mult * away, xpPerSec(s) * s.mult * away)
    }
    shop(s, cad, paybackSeconds)
    noteRow6()
    if (finishedNow()) {
      runs.push(record(true, 0))
      return done(true)
    }

    // The Exit: only when it is open and pays a whole Prestige, and the player's rule says go.
    const hours = (t - runStart) / 3600
    const open = exitOpen(legacy, s.earned)
    if (open && openAt === null) openAt = (t - runStart) / DAY_SECONDS
    const gain = open ? earningsPrestige(legacy, s.earned) : 0
    const rate = open && hours > 0 ? Math.max(0, smoothPrestige(legacy, s.earned)) / hours : 0
    const growth = prestigeMult(legacy.prestigeTotal + gain) / prestigeMult(legacy.prestigeTotal)
    const leave = gain >= 1 && (options.exitRule === "falling" ? prevRate > 0 && rate < prevRate : growth >= (options.minGrowth ?? EXIT_MIN_GROWTH))
    prevRate = rate
    if (leave) {
      legacy.prestige += gain
      legacy.prestigeTotal += gain
      legacy.earnedAllRuns += s.earned
      runs.push(record(false, gain))
      target = s.earned
      catchUpAt = null
      ownedAt = null
      legacy.runs += 1
      buyPerks(legacy)
      perksAtStart = legacy.perks.length
      s = newCareer(legacy, options.specialization ?? DEFAULT_PACE_SPEC, options.leadership ?? DEFAULT_PACE_LEAD)
      cad = cadenceOf(profile, OFFLINE_CAP_SECONDS + perkEffects(legacy.perks).offlineHours * 3600)
      runStart = t
      row6At = null
      openAt = null
      prevRate = 0
      shop(s, cad, paybackSeconds)
      noteRow6()
      if (runs.length >= maxRuns) return done(false)
    }

    for (let spent = 0; spent < cad.activeSeconds; ) {
      const step = Math.min(cad.activeSeconds - spent, Math.max(5, Math.min(900, (t - runStart) * 0.003)))
      const clickMoney = s.jobs.length > 0 ? clickPower(s) : 0
      earn(
        s,
        (idlePerSec(s) + profile.clicksPerSec * clickMoney) * s.mult * step,
        (xpPerSec(s) + profile.clicksPerSec * xpPerClick(s.skills)) * s.mult * step,
      )
      spent += step
      t += step
      shop(s, cad, paybackSeconds)
      noteRow6()
      if (finishedNow()) {
        runs.push(record(true, 0))
        return done(true)
      }
    }
  }
  // Out of days: the career under way is part of the answer, unfinished.
  runs.push(record(false, 0))
  return done(false)
}
