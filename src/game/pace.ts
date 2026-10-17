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
import { GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import {
  canAfford,
  clickPower,
  clickShare,
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
import { exitOpen, freshLegacy, mergeGrant, prestigeOnExit, startingGrant } from "./legacy.ts"
import type { LegacyState } from "./legacy.ts"
import { prestigeMult } from "./mods.ts"
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

export function cadenceOf(profile: PlayProfile): Cadence {
  const cycleSeconds = DAY_SECONDS / profile.visitsPerDay
  const activeSeconds = Math.min(cycleSeconds, profile.minutesPerVisit * 60)
  const awaySeconds = cycleSeconds - activeSeconds
  const earningSeconds = activeSeconds + Math.min(awaySeconds, OFFLINE_CAP_SECONDS)
  return {
    cycleSeconds,
    activeSeconds,
    awaySeconds,
    idleShare: earningSeconds / cycleSeconds,
    clicksPerWallSecond: (profile.clicksPerSec * activeSeconds) / cycleSeconds,
  }
}

/** Share of idle income each click adds once every job is held: the sum of the jobs' `clickPct`, as a fraction. */
export const FINAL_CLICK_SHARE = clickShare({ jobs: JOB_TIERS.map((job) => job.id) })

/**
 * The fitted constant of the formula, in days. The model's finish time is close to `k / pace`, where `pace` is
 * how much of a full day of income the player really collects (`paceOf`). A smaller `k` is a player who
 * reinvests better. Both were fitted to `simulatePace` over visits of 10 to 60 minutes, once to many times a
 * day, and `pace.test.ts` fails if the tables drift far enough to make them wrong. The stacker constant
 * only holds for a player who visits at least daily; further apart, use the one-of-each player's.
 */
export const PACE_K = { oneOfEach: 9, stacker: 4 } as const

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
  "seniorJob",
  "capital",
  "allSkills",
  "allGigs",
  "allJobs",
  "allGear",
  "allCapital",
] as const

export type PaceMilestone = (typeof PACE_MILESTONES)[number]

export type PaceResult = {
  profile: PlayProfile
  /** True when everything was owned before `maxDays`. */
  complete: boolean
  /** Wall-clock days until everything was owned (or `maxDays` when it never was). */
  days: number
  /** The day each milestone first held, for the ones that did. */
  milestones: Partial<Record<PaceMilestone, number>>
  /** The profile's earning share of the day and clicks per wall-clock second, the two terms of the formula. */
  idleShare: number
  clicksPerWallSecond: number
}

type Sim = Omit<Progress, "jobs" | "gigs"> & {
  jobs: number[]
  gigs: number[]
  /** The Prestige multiplier on every income and XP rate. 1 in a single run. */
  mult: number
  /** Dollars credited this career (gig lumps, idle and click income); the seed money is not. */
  earned: number
}

function freshSim(): Sim {
  return {
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
  seniorJob: (s) => s.jobs.includes(14),
  capital: capitalUnlocked,
  allSkills: (s) => SKILL_TIERS.every((row) => ownedCount(s.skills, row.id) > 0),
  allGigs: (s) => GIGS.every((gig) => s.gigs.includes(gig.id)),
  allJobs: (s) => JOB_TIERS.every((job) => s.jobs.includes(job.id)),
  allGear: (s) => GEAR.every((row) => ownedCount(s.equipment, row.id) > 0),
  allCapital: (s) => CAPITAL.every((row) => ownedCount(s.owned, row.id) > 0),
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

/** A job pays salary and, for the teaching ones, XP, so it is taken the moment it can be afforded. */
function takeJobs(s: Sim): boolean {
  let any = false
  for (const job of JOB_TIERS) {
    if (!canBuyJob(s, job)) continue
    s.xp -= job.xpCost
    s.jobs.push(job.id)
    s.jobs.sort((a, b) => a - b)
    earn(s, 0, job.xpLump)
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

    let best: { payback: number; cost: number; buy: () => void } | null = null
    const consider = (cost: number, first: boolean, gain: number, buy: () => void) => {
      if (!canAfford(s.money, cost)) return
      const payback = gain > 0 ? cost / gain : Number.POSITIVE_INFINITY
      if (!first && payback > paybackSeconds) return
      if (!best || payback < best.payback || (payback === best.payback && cost < best.cost)) best = { payback, cost, buy }
    }

    for (const row of GEAR) {
      const have = ownedCount(s.equipment, row.id)
      if (!equipmentOpen(s) || !isGearRevealed(row, s.equipment, s.peakMoney, s.jobs)) continue
      consider(nextCost(row.baseCost, have), have === 0, (row.cps * perIdleSecond + row.clickBonus * perClick) * s.mult, () => (s.equipment[String(row.id)] = have + 1))
    }
    if (capitalUnlocked(s)) {
      for (const row of CAPITAL) {
        const have = ownedCount(s.owned, row.id)
        if (!isRevealed(row, s.owned, s.peakMoney)) continue
        consider(nextCost(row.baseCost, have), have === 0, (row.cps * perIdleSecond + row.clickBonus * perClick) * s.mult, () => (s.owned[String(row.id)] = have + 1))
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
}

/**
 * Two players the docs quote. The one-of-each player takes what the shop lists and re-buys only what pays for itself
 * within the hour, which in practice is almost nothing. The stacker re-buys anything that pays for itself
 * within two days, which is where the finish stops getting faster and starts to waste money.
 */
export const ONE_OF_EACH_PAYBACK_SECONDS = 60 * 60
export const STACKER_PAYBACK_SECONDS = 2 * DAY_SECONDS

export function simulatePace(profile: PlayProfile, options: PaceOptions = {}): PaceResult {
  const maxSeconds = (options.maxDays ?? 365) * DAY_SECONDS
  const cad = cadenceOf(profile)
  const paybackSeconds = options.paybackSeconds ?? STACKER_PAYBACK_SECONDS
  const s = freshSim()
  const milestones: Partial<Record<PaceMilestone, number>> = {}
  let t = 0

  const note = () => {
    for (const id of PACE_MILESTONES) if (milestones[id] === undefined && MILESTONE_TESTS[id](s)) milestones[id] = t / DAY_SECONDS
  }
  const result = (complete: boolean): PaceResult => ({
    profile,
    complete,
    days: t / DAY_SECONDS,
    milestones,
    idleShare: cad.idleShare,
    clicksPerWallSecond: cad.clicksPerWallSecond,
  })

  for (let cycle = 0; cycle * cad.cycleSeconds < maxSeconds; cycle++) {
    t = cycle * cad.cycleSeconds
    if (cycle > 0) {
      // Coming back pays the time away, up to the cap, at the rates held when they left.
      const away = Math.min(cad.awaySeconds, OFFLINE_CAP_SECONDS)
      earn(s, idlePerSec(s) * s.mult * away, xpPerSec(s) * s.mult * away)
    }
    shop(s, cad, paybackSeconds)
    note()
    if (ownsEverything(s)) return result(true)

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
      if (ownsEverything(s)) return result(true)
    }
  }
  return result(false)
}

/** The Exit's capital row: the career has its first Exit when this is owned. */
const EXIT_ROW = 6

/** One career in a multi-run result. */
export type ExitRun = {
  run: number
  /** Wall-clock day the career started, and the day it ended (the Exit, or the finish). */
  startDay: number
  endDay: number
  /** Days into the career when capital row 6 was bought, or null if it never was. */
  row6Days: number | null
  /** Prestige the Exit paid (0 for a career that finished instead). */
  prestigeEarned: number
  /** Lifetime Prestige and the multiplier after this Exit. */
  prestigeTotal: number
  mult: number
  /** Legacy perks held when the career started. */
  perks: number
  /** Dollars the career earned. */
  earned: number
  /** True when the career owned every row (`ownsEverything`) and the model stopped there. */
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

/** A first Exit worth taking: the bonus grows by 15%, which is 3 Prestige at 0.05 per Prestige. */
export const EXIT_MIN_GROWTH = 1.15

/** Prestige the Exit would pay if the ladder were smooth: the rungs climbed so far plus the fraction toward the next. */
function smoothPrestige(legacy: LegacyState, earned: number): number {
  return Math.cbrt((legacy.earnedAllRuns + earned) / PRESTIGE_EARN_SCALE) - legacy.prestigeTotal
}

/** A new career under the Network perks held: the grant merged into an empty one, the Prestige multiplier on, passes kept. */
function newCareer(legacy: LegacyState): Sim {
  const s = freshSim()
  const start = mergeGrant(s, startingGrant(legacy.perks))
  Object.assign(s, { skills: start.skills, gigs: start.gigs, jobs: start.jobs, xp: start.xp, xpTotal: start.xpTotal, money: start.money, peakMoney: start.peakMoney })
  s.mult = prestigeMult(legacy.prestigeTotal)
  return s
}

/**
 * The same player over several careers. At the start of a visit they leave through the Exit when the Prestige per hour
 * of this career starts to fall (the best moment in theory: the next hour pays less than the average hour so far)
 * and at least one whole Prestige is on offer; the first career also waits for capital row 6. Then they buy the Network
 * perks in order while Prestige covers them, and play the next career. It stops when
 * a career owns everything. The single-run model above is untouched.
 */
export function simulateExits(profile: PlayProfile, options: ExitsOptions = {}): ExitsResult {
  const maxSeconds = (options.maxDays ?? 365) * DAY_SECONDS
  const maxRuns = options.maxRuns ?? 30
  const cad = cadenceOf(profile)
  const paybackSeconds = options.paybackSeconds ?? STACKER_PAYBACK_SECONDS
  const legacy = freshLegacy()
  const runs: ExitRun[] = []
  let s = newCareer(legacy)
  let runStart = 0
  let row6At: number | null = null
  let prevRate = 0
  let t = 0

  const noteRow6 = () => {
    if (row6At === null && ownedCount(s.owned, EXIT_ROW) > 0) row6At = (t - runStart) / DAY_SECONDS
  }
  const record = (finished: boolean, prestigeEarned: number): ExitRun => ({
    run: legacy.runs,
    startDay: runStart / DAY_SECONDS,
    endDay: t / DAY_SECONDS,
    row6Days: row6At,
    prestigeEarned,
    prestigeTotal: legacy.prestigeTotal,
    mult: prestigeMult(legacy.prestigeTotal),
    perks: perksAtStart,
    earned: s.earned,
    finished,
  })
  let perksAtStart = 0
  const done = (complete: boolean): ExitsResult => ({
    profile,
    complete,
    days: t / DAY_SECONDS,
    finishRun: complete ? legacy.runs : null,
    runs,
  })

  for (let cycle = 0; cycle * cad.cycleSeconds < maxSeconds; cycle++) {
    t = cycle * cad.cycleSeconds
    if (cycle > 0) {
      const away = Math.min(cad.awaySeconds, OFFLINE_CAP_SECONDS)
      earn(s, idlePerSec(s) * s.mult * away, xpPerSec(s) * s.mult * away)
    }
    shop(s, cad, paybackSeconds)
    noteRow6()
    if (ownsEverything(s)) {
      runs.push(record(true, 0))
      return done(true)
    }

    // The Exit: only when it is open and pays a whole Prestige, and the player's rule says go.
    const hours = (t - runStart) / 3600
    const open = exitOpen(legacy, s.earned)
    const rate = open && hours > 0 ? Math.max(0, smoothPrestige(legacy, s.earned)) / hours : 0
    const gain = open ? prestigeOnExit(legacy, s.earned) : 0
    const growth = prestigeMult(legacy.prestigeTotal + gain) / prestigeMult(legacy.prestigeTotal)
    const leave =
      gain > 0 && (options.exitRule === "falling" ? prevRate > 0 && rate < prevRate : growth >= (options.minGrowth ?? EXIT_MIN_GROWTH))
    prevRate = rate
    if (leave) {
      const gained = prestigeOnExit(legacy, s.earned)
      legacy.prestige += gained
      legacy.prestigeTotal += gained
      legacy.earnedAllRuns += s.earned
      runs.push(record(false, gained))
      legacy.runs += 1
      for (const perk of LEGACY_PERKS) {
        if (legacy.perks.includes(perk.id)) continue
        if (legacy.prestige < perk.cost) break
        legacy.prestige -= perk.cost
        legacy.perks.push(perk.id)
      }
      perksAtStart = legacy.perks.length
      s = newCareer(legacy)
      runStart = t
      row6At = null
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
      if (ownsEverything(s)) {
        runs.push(record(true, 0))
        return done(true)
      }
    }
  }
  return done(false)
}
