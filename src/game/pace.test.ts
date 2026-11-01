import { describe, expect, it } from "vitest"
import {
  cadenceOf,
  DEFAULT_PACE_LEAD,
  DEFAULT_PACE_SPEC,
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
import { visibleJobs } from "../data/phases.ts"
import type { LeadId } from "../data/leadership.ts"
import { SPECIALIZATIONS } from "../data/specializations.ts"
import type { SpecId } from "../data/specializations.ts"

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
    expect(FINAL_CLICK_SHARE).toBeCloseTo(visibleJobs(DEFAULT_PACE_SPEC, DEFAULT_PACE_LEAD).reduce((sum, job) => sum + job.clickPct, 0) / 100, 10)
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
    expect(m.jobBoard!).toBeLessThanOrEqual(m.midJob!)
    expect(m.midJob!).toBeLessThanOrEqual(m.seniorJob!)
    expect(m.jobBoard!).toBeLessThanOrEqual(m.capital!)
    // Owning everything is the finish, and the last thing in the shop; with the capital tail cut, which list finishes last varies by player.
    const last = Math.max(...PACE_MILESTONES.filter((id) => id.startsWith("all")).map((id) => m[id]!))
    expect(run.ownedDays!).toBeCloseTo(last, 6)
    expect(run.days).toBeCloseTo(last, 6)
  })

  // 4 visits of 5 minutes, 2 clicks a second: a career takes a day, and no visit in the middle comes back to nothing new.
  // Measured 0 visits for both players; the bound of 1 leaves room for a price nudge but fails on a capital cliff
  // (a row-ratio tail that took 2 or more visits in a row to afford).
  it("never leaves the target player more than one visit in a row with nothing new to buy, and owns everything within a day", () => {
    for (const payback of [ONE_OF_EACH_PAYBACK_SECONDS, STACKER_PAYBACK_SECONDS]) {
      const run = simulatePace(profile(4, 5, 2), { maxDays: 30, paybackSeconds: payback })
      expect(run.complete).toBe(true)
      expect(run.ownedDays!).toBeLessThanOrEqual(1.26)
      expect(run.longestWaitVisits).toBeLessThanOrEqual(1)
      expect(run.days).toBeCloseTo(run.ownedDays!, 6)
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
      const oneOfEach = simulatePace(p, { maxDays: 800, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS }).ownedDays!
      const stacker = simulatePace(p, { maxDays: 800, paybackSeconds: STACKER_PAYBACK_SECONDS }).ownedDays!
      // The formula is a closed form of a few visits and a floor from the lifetime-XP gate on the last skill, so it runs
      // loose for a player who is always there.
      expect(Math.abs(estimateDays(p, PACE_K.oneOfEach) / oneOfEach - 1), `${name} one-of-each`).toBeLessThan(name === "left open" ? 0.5 : 0.35)
      expect(Math.abs(estimateDays(p, PACE_K.stacker) / stacker - 1), `${name} stacker`).toBeLessThan(0.35)
    }
  }, 60_000)
})

// Each case simulates weeks over several careers: about 2 s here, past the 5 s default on a CI runner.
describe("pace over several careers (the Exit)", { timeout: 30_000 }, () => {
  // Weekly, 30 minutes, 2 clicks a second: slow enough that the Exit pays before the career owns everything. A player who
  // visits every few hours owns everything inside a day, before an Exit would raise the bonus by 15%, and never leaves.
  const weekly = profile(1 / 7, 30, 2)
  const regular = profile(3, 15, 2)

  for (const [name, payback] of [
    ["stacker", STACKER_PAYBACK_SECONDS],
    ["oneOfEach", ONE_OF_EACH_PAYBACK_SECONDS],
  ] as const) {
    it(`a career that never leaves finishes on the single run's day (${name})`, () => {
      const single = simulatePace(regular, { maxDays: 400, paybackSeconds: payback })
      const never = simulateExits(regular, { maxDays: 30, paybackSeconds: payback, minGrowth: Number.POSITIVE_INFINITY })
      expect(never.runs).toHaveLength(1)
      const first = never.runs[0]!
      expect(first.ownedDays!).toBeCloseTo(single.ownedDays!, 6)
      expect(first.endDay).toBeCloseTo(single.days, 6)
      expect(first.finished).toBe(true)
    })

    it(`only ever gains Prestige across careers (${name})`, () => {
      const result = simulateExits(weekly, { maxDays: 400, paybackSeconds: payback })
      let total = 0
      for (const run of result.runs) {
        expect(run.prestigeTotal).toBeGreaterThanOrEqual(total)
        total = run.prestigeTotal
      }
    })
  }

  it("leaves through the Exit before owning everything, and the next career starts far ahead", () => {
    const result = simulateExits(weekly, { maxDays: 400, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS })
    expect(result.complete).toBe(true)
    const [first, second] = result.runs
    expect(first!.finished).toBe(false)
    expect(first!.exitOpenDays).not.toBeNull()
    expect(first!.prestigeEarned).toBeGreaterThanOrEqual(5)
    // The second career reaches capital row 6 almost at once, and gets back to what the first one earned in under half its time.
    expect(second!.row6Days!).toBeLessThan(first!.row6Days! / 10)
    expect(second!.catchUpDays).not.toBeNull()
    expect(second!.catchUpDays!).toBeLessThan(first!.endDay / 2)
    expect(result.finishRun).toBe(result.runs.length)
  })

  it("spends Prestige on the cheapest perks across both tracks, Network first on ties", () => {
    const result = simulateExits(weekly, { maxDays: 400, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS })
    const [first, second] = result.runs
    expect(first!.prestigeEarned).toBeGreaterThanOrEqual(5)
    expect(first!.perks).toBe(0)
    expect(second!.perks).toBeGreaterThanOrEqual(3)
  })

  it("the optimal rule (Prestige per hour starts to fall) waits longer than the 15% rule", () => {
    const falling = simulateExits(weekly, { maxDays: 400, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS, exitRule: "falling" })
    const worth = simulateExits(weekly, { maxDays: 400, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS })
    expect(falling.runs[0]!.endDay).toBeGreaterThan(worth.runs[0]!.endDay)
  })
})

describe("pace by build", () => {
  const leftOpen = profile(24, 15, 2)
  const run = (specialization: SpecId, leadership: LeadId, paybackSeconds = STACKER_PAYBACK_SECONDS) => simulatePace(leftOpen, { maxDays: 30, paybackSeconds, specialization, leadership })

  it("finishes on either leadership line", () => {
    const ic = run("backend", "ic")
    const manager = run("backend", "manager")
    expect(ic.complete).toBe(true)
    expect(manager.complete).toBe(true)
    expect(manager.days).toBeGreaterThan(0)
  })

  it("keeps a Manager within 10% of the IC for every specialization, so neither line is a dead end", () => {
    for (const spec of SPECIALIZATIONS) {
      const ic = run(spec.id, "ic")
      const manager = run(spec.id, "manager")
      expect(Math.abs(manager.days / ic.days - 1), spec.id).toBeLessThan(0.1)
    }
  }, 60_000)
})
