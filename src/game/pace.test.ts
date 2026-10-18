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
    // Owning everything is the last thing to happen, and the last capital row is what it waits on.
    expect(m.allCapital!).toBeGreaterThanOrEqual(Math.max(m.allSkills!, m.allGigs!, m.allJobs!, m.allGear!))
    expect(run.days).toBeCloseTo(m.allCapital!, 6)
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
    expect(days(profile(3, 15, 2))).toBeLessThan(days(profile(3, 15, 2), ONE_OF_EACH_PAYBACK_SECONDS))
  })

  // The constants in docs/PACING.md. If a table change moves the game far enough that these fail, rerun
  // `npm run pace`, refit `PACE_K`, and update the docs.
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
      expect(Math.abs(estimateDays(p, PACE_K.oneOfEach) / oneOfEach - 1), `${name} one-of-each`).toBeLessThan(0.12)
      expect(Math.abs(estimateDays(p, PACE_K.stacker) / stacker - 1), `${name} stacker`).toBeLessThan(0.2)
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
      // The first Exit is taken around day 1.5 to 2 for a few Prestige, and a bonus of about 15%.
      expect(first!.endDay).toBeGreaterThanOrEqual(1.5)
      expect(first!.endDay).toBeLessThanOrEqual(2.1)
      expect(first!.prestigeEarned).toBeGreaterThanOrEqual(3)
      expect(first!.prestigeEarned).toBeLessThanOrEqual(8)
      expect(first!.endingBonus).toBe(0)
      // The second career reaches capital row 6 in under half a day.
      expect(second!.row6Days).not.toBeNull()
      expect(second!.row6Days!).toBeLessThan(0.5)
      // It gets back to what the first one earned sooner, but not twice as fast: income grows exponentially, so a
      // head start of a day saves a fraction of a day (docs/PACING.md, "Over several careers").
      expect(second!.catchUpDays).not.toBeNull()
      expect(second!.catchUpDays! / first!.endDay).toBeLessThan(1.01)
      // Owning everything and winning the world is done by the sixth career, in about two weeks (the one-of-each player is slower).
      expect(result.finishRun).toBeGreaterThanOrEqual(4)
      expect(result.finishRun).toBeLessThanOrEqual(6)
      expect(result.days).toBeGreaterThan(8)
      expect(result.days).toBeLessThan(22)
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
    // 5 or 6 Prestige: Study group (1), then the 2-Prestige firsts of three tracks, Network before Founder before Capital.
    expect(first!.prestigeEarned).toBeGreaterThanOrEqual(5)
    expect(second!.perks).toBe(3)
    expect(result.endings.every((ending) => ending === "nightOwl")).toBe(true)
    expect(result.runs.every((run) => run.endingBonus === 0 || run.winDays !== null)).toBe(true)
  })

  it("the optimal rule (Prestige per hour starts to fall) waits until a career is nearly done", () => {
    const result = simulateExits(regular, { maxDays: 400, exitRule: "falling" })
    expect(result.runs[0]!.endDay).toBeGreaterThan(3)
  })
})
