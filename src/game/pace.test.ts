import { describe, expect, it } from "vitest"
import {
  cadenceOf,
  COLLECTOR_PAYBACK_SECONDS,
  estimateDays,
  FINAL_CLICK_SHARE,
  OFFLINE_CAP_SECONDS,
  PACE_K,
  PACE_MILESTONES,
  paceOf,
  REINVESTOR_PAYBACK_SECONDS,
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
    const days = (p: PlayProfile, paybackSeconds = REINVESTOR_PAYBACK_SECONDS) =>
      simulatePace(p, { maxDays: 800, paybackSeconds }).days
    expect(days(profile(3, 15, 2))).toBeLessThan(days(profile(1, 15, 2)))
    expect(days(profile(1, 30, 3))).toBeLessThan(days(profile(1, 30, 1)))
    expect(days(profile(3, 15, 2))).toBeLessThan(days(profile(3, 15, 2), COLLECTOR_PAYBACK_SECONDS))
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
      const collector = simulatePace(p, { maxDays: 800, paybackSeconds: COLLECTOR_PAYBACK_SECONDS }).days
      const reinvestor = simulatePace(p, { maxDays: 800, paybackSeconds: REINVESTOR_PAYBACK_SECONDS }).days
      expect(Math.abs(estimateDays(p, PACE_K.collector) / collector - 1), `${name} collector`).toBeLessThan(0.12)
      expect(Math.abs(estimateDays(p, PACE_K.reinvestor) / reinvestor - 1), `${name} reinvestor`).toBeLessThan(0.2)
    }
  })
})
