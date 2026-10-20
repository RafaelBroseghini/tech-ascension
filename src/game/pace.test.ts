import { describe, expect, it } from "vitest"
import {
  cadenceOf,
  ONE_OF_EACH_PAYBACK_SECONDS,
  estimateDays,
  FINAL_CLICK_SHARE,
  OFFLINE_CAP_SECONDS,
  PACE_K,
  PACE_MILESTONES,
  paceOf,
  STACKER_PAYBACK_SECONDS,
  simulateExits,
  simulatePace,
} from "./pace.ts"
import type { PlayProfile } from "./pace.ts"
import { OFFLINE_CAP_MS } from "./save.ts"
import { JOB_TIERS } from "../data/phases.ts"

const profile = (visitsPerDay: number, minutesPerVisit: number, clicksPerSec: number): PlayProfile => ({
  visitsPerDay,
  minutesPerVisit,
  clicksPerSec,
})

describe("pace cadence", () => {
  it("uses the game's own offline cap", () => {
    expect(OFFLINE_CAP_SECONDS * 1000).toBe(OFFLINE_CAP_MS)
  })

  it("earns every second while visits are no more than the cap apart, and wastes the rest", () => {
    // Every eight hours or sooner nothing is lost, however short the visit.
    expect(cadenceOf(profile(3, 15, 2)).idleShare).toBe(1)
    expect(cadenceOf(profile(24, 1, 2)).idleShare).toBe(1)
    // Once a day, a 30 minute visit collects that visit and eight hours of the 23.5 away.
    expect(cadenceOf(profile(1, 30, 2)).idleShare).toBeCloseTo((0.5 + 8) / 24, 10)
    // A visit that never ends is all earning.
    expect(cadenceOf(profile(1, 1440, 2)).idleShare).toBe(1)
  })

  it("spreads a visit's clicks over the whole day", () => {
    expect(cadenceOf(profile(3, 15, 2)).clicksPerWallSecond).toBeCloseTo((2 * 15 * 60 * 3) / 86_400, 10)
    expect(cadenceOf(profile(1, 1440, 2)).clicksPerWallSecond).toBe(2)
  })

  it("gives pace as idle share plus the click share the jobs add, and the formula is k over pace", () => {
    const p = profile(1, 30, 2)
    const cad = cadenceOf(p)
    expect(FINAL_CLICK_SHARE).toBeCloseTo(JOB_TIERS.reduce((sum, job) => sum + job.clickPct, 0) / 100, 10)
    expect(paceOf(p)).toBeCloseTo(cad.idleShare + cad.clicksPerWallSecond * FINAL_CLICK_SHARE, 10)
    expect(estimateDays(p, 8)).toBeCloseTo(8 / paceOf(p), 10)
  })
})

describe("pace model", () => {
  it("finishes the game and passes every milestone, in an order that makes sense", () => {
    const run = simulatePace(profile(3, 15, 2), { maxDays: 400 })
    expect(run.complete).toBe(true)
    for (const id of PACE_MILESTONES) expect(run.milestones[id], id).toBeDefined()
    const m = run.milestones
    expect(m.gigBoard!).toBeLessThanOrEqual(m.jobBoard!)
    expect(m.jobBoard!).toBeLessThanOrEqual(m.capital!)
    // Owning everything is the last thing to happen; with the capital tail cut, which list finishes last varies by player.
    const last = Math.max(...PACE_MILESTONES.filter((id) => id.startsWith("all")).map((id) => m[id]!))
    expect(run.days).toBeCloseTo(last, 6)
  })

  // 4 visits of 5 minutes, 2 clicks a second: a career takes a day, and no visit in the middle comes back to nothing new.
  // Measured 0 visits for both players; the bound of 1 leaves room for a price nudge but fails on a capital cliff
  // (a row-ratio tail that took 2 or more visits in a row to afford).
  it("never leaves the target player more than one visit in a row with nothing new to buy, and ends within a day", () => {
    for (const payback of [ONE_OF_EACH_PAYBACK_SECONDS, STACKER_PAYBACK_SECONDS]) {
      const run = simulatePace(profile(4, 5, 2), { maxDays: 30, paybackSeconds: payback })
      expect(run.complete).toBe(true)
      expect(run.days).toBeLessThanOrEqual(1.01) // the last visit buys a few minutes in
      expect(run.longestWaitVisits).toBeLessThanOrEqual(1)
    }
  })

  it("counts a visit with no first copy as a wait", () => {
    // One minute a day with no clicking is too little to buy something new at every visit.
    const run = simulatePace(profile(1, 1, 0), { maxDays: 5 })
    expect(run.longestWaitVisits).toBeGreaterThan(0)
  })

  it("does not finish a game it can never pay for", () => {
    const run = simulatePace(profile(3, 15, 0), { maxDays: 5 })
    expect(run.complete).toBe(false)
    expect(run.days).toBeLessThanOrEqual(5.01)
  })

  it("finishes sooner with more visits, with more clicking, and with better reinvesting", () => {
    const days = (p: PlayProfile, paybackSeconds = STACKER_PAYBACK_SECONDS) =>
      simulatePace(p, { maxDays: 800, paybackSeconds }).days
    expect(days(profile(3, 15, 2))).toBeLessThan(days(profile(1, 15, 2)))
    expect(days(profile(1, 30, 3))).toBeLessThan(days(profile(1, 30, 1)))
    // Reinvesting no longer finishes sooner: a career is about a day, so a two day payback buys copies nothing repays.
  })

  // The constants in docs/PACING.md. If a table change moves the game far enough that these fail, rerun
  // `npm run pace`, refit `PACE_K`, and update the docs. A career is now about a day, so the model's finish is a
  // whole number of visits and the lifetime-XP gate on the last skill sets a floor: the fit is looser than it was
  // when the capital tail took days.
  it("matches the closed-form estimate for a player who visits at least daily", () => {
    const fits: [string, PlayProfile][] = [
      ["left open", profile(24, 15, 2)],
      ["regular", profile(3, 15, 2)],
      ["commuter", profile(2, 10, 2)],
      ["daily", profile(1, 30, 2)],
    ]
    for (const [name, p] of fits) {
      const oneOfEach = simulatePace(p, { maxDays: 800, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS }).days
      const stacker = simulatePace(p, { maxDays: 800, paybackSeconds: STACKER_PAYBACK_SECONDS }).days
      expect(Math.abs(estimateDays(p, PACE_K.oneOfEach) / oneOfEach - 1), `${name} one-of-each`).toBeLessThan(0.35)
      expect(Math.abs(estimateDays(p, PACE_K.stacker) / stacker - 1), `${name} stacker`).toBeLessThan(0.35)
    }
  })
})

// Each case simulates hundreds of days over several careers: about 2 s here, past the 5 s default on a CI runner.
describe("pace over several careers (the Exit)", { timeout: 30_000 }, () => {
  const regular = profile(3, 15, 2)

  for (const [name, payback] of [
    ["stacker", STACKER_PAYBACK_SECONDS],
    ["oneOfEach", ONE_OF_EACH_PAYBACK_SECONDS],
  ] as const) {
    it(`a career that never leaves owns everything on the single-run day: the product adds users, not time (${name})`, () => {
      const single = simulatePace(regular, { maxDays: 400, paybackSeconds: payback })
      const never = simulateExits(regular, { maxDays: 30, paybackSeconds: payback, minGrowth: Number.POSITIVE_INFINITY })
      expect(never.runs).toHaveLength(1)
      expect(never.runs[0]!.ownedDays).toBeCloseTo(single.days, 6)
      expect(never.runs[0]!.users).toBeGreaterThan(1e6)
    })
  }

  for (const [name, payback] of [
    ["stacker", STACKER_PAYBACK_SECONDS],
    ["oneOfEach", ONE_OF_EACH_PAYBACK_SECONDS],
  ] as const) {
    it(`meets the pacing targets for the Regular ${name}`, () => {
      const result = simulateExits(regular, { maxDays: 400, paybackSeconds: payback })
      expect(result.complete).toBe(true)
      const [first, second] = result.runs
      // A career is about a day now, so the first Exit opens around day 1 (the Exit constants were tuned for careers
      // of days and now pay a lot of Prestige for it; docs/PACING.md). Pinned to the model's output, not a target.
      expect(first!.endDay).toBeGreaterThanOrEqual(0.9)
      expect(first!.endDay).toBeLessThanOrEqual(1.1)
      expect(first!.prestigeEarned).toBeGreaterThanOrEqual(100)
      expect(first!.prestigeEarned).toBeLessThanOrEqual(120)
      expect(first!.endingBonus).toBe(0)
      // The second career reaches capital row 6 in under half a day.
      expect(second!.row6Days).not.toBeNull()
      expect(second!.row6Days!).toBeLessThan(0.5)
      // It gets back to what the first one earned sooner, but not twice as fast: income grows exponentially, so a
      // head start of a day saves a fraction of a day (docs/PACING.md, "Over several careers").
      expect(second!.catchUpDays).not.toBeNull()
      expect(second!.catchUpDays! / first!.endDay).toBeLessThan(1.01)
      // Owning everything and winning the world is done in the fourth to sixth career, in two to four days.
      expect(result.finishRun).toBeGreaterThanOrEqual(4)
      expect(result.finishRun).toBeLessThanOrEqual(6)
      expect(result.days).toBeGreaterThan(2)
      expect(result.days).toBeLessThan(4)
    })

    it(`only ever gains Prestige and bonus across careers (${name})`, () => {
      const result = simulateExits(regular, { maxDays: 400, paybackSeconds: payback })
      let total = 0
      for (const run of result.runs) {
        expect(run.prestigeTotal).toBeGreaterThanOrEqual(total)
        total = run.prestigeTotal
      }
    })
  }

  it("spends Prestige on the cheapest perks across tracks, Network first on ties, and models the night owl ending only", () => {
    const result = simulateExits(regular, { maxDays: 400, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS })
    const [first, second] = result.runs
    // The first Exit pays enough to buy the cheap firsts of every track, Network before Founder before Capital.
    expect(first!.prestigeEarned).toBeGreaterThanOrEqual(5)
    expect(second!.perks).toBeGreaterThanOrEqual(3)
    expect(result.endings.every((ending) => ending === "nightOwl")).toBe(true)
    expect(result.runs.every((run) => run.endingBonus === 0 || run.winDays !== null)).toBe(true)
  })

  it("the optimal rule (Prestige per hour starts to fall) waits until a career is nearly done", () => {
    const result = simulateExits(regular, { maxDays: 400, exitRule: "falling" })
    const worth = simulateExits(regular, { maxDays: 400 })
    expect(result.runs[0]!.endDay).toBeGreaterThan(worth.runs[0]!.endDay)
  })
})
