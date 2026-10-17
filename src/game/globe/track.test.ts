import { describe, expect, it } from "vitest"
import { idlePerSec, xpPerSec } from "../economy.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts, settleGrowth } from "./growth.ts"
import {
  AWAY_FLOOR_MINUTES,
  BRIDGE_CUT,
  BRIDGE_MINUTES,
  burnOf,
  canGoFullTime,
  forkOffer,
  forkOpen,
  FORK_USERS,
  FRESH_FOUNDER,
  goFullTime,
  MAX_BRIDGES,
  parseFounder,
  productRevenueOf,
  raiseBridge,
  returnToLadder,
  revenueMultOf,
  runwayOf,
  settleBurn,
  trackFactsOf,
  usersNeeded,
  winMultOf,
} from "./track.ts"
import type { FounderState } from "./track.ts"
import { totalUsers } from "./world.ts"

const founder = (over: Partial<FounderState> = {}): FounderState => ({ ...FRESH_FOUNDER, track: "founder", offered: true, ...over })
const roomy = { "54": 5 }
const never = () => 0.999
const step = (f: FounderState) => advanceCompany({ ...FRESH_COMPANY, users: { "americas-east": 1000 } }, growthFacts([1, 2, 3], roomy, undefined, trackFactsOf(f)), 0, 60_000, never)

describe("the fork's gate", () => {
  it("opens at 1,000 users with a job held, and not before", () => {
    expect(forkOpen(FORK_USERS - 1, [1])).toBe(false)
    expect(forkOpen(FORK_USERS, [])).toBe(false)
    expect(forkOpen(FORK_USERS, [1])).toBe(true)
  })

  it("lets a ladder career quit, and nobody who already did", () => {
    expect(canGoFullTime(FRESH_FOUNDER, 5_000, [1])).toBe(true)
    expect(canGoFullTime(FRESH_FOUNDER, 500, [1])).toBe(false)
    expect(canGoFullTime(founder(), 5_000, [1])).toBe(false)
  })

  it("waits for the users a return asked for, and says how many", () => {
    const back = { ...FRESH_FOUNDER, offered: true, requitAt: 8_000 }
    expect(canGoFullTime(back, 7_999, [1])).toBe(false)
    expect(usersNeeded(back, 7_999)).toBe(8_000)
    expect(canGoFullTime(back, 8_000, [1])).toBe(true)
    expect(usersNeeded(back, 8_000)).toBeNull()
  })

  it("starts the founder track, clears the wait, and keeps the offer latched", () => {
    const next = goFullTime({ ...FRESH_FOUNDER, requitAt: 100 })
    expect(next).toMatchObject({ track: "founder", offered: true, requitAt: null, broke: false })
  })
})

describe("growth and revenue by track", () => {
  it("grows the ladder slowly and the founder fast, with the same users to start", () => {
    const ladder = totalUsers(step(FRESH_FOUNDER).state.users)
    const full = totalUsers(step(founder()).state.users)
    expect(ladder).toBeGreaterThan(1000)
    expect(full - 1000).toBeGreaterThan((ladder - 1000) * 4)
  })

  it("pays a founder three times what the same served users pay a ladder career", () => {
    expect(step(founder()).earned).toBeCloseTo(step(FRESH_FOUNDER).earned * 3, 6)
  })

  it("takes the equity given up off the revenue on either track", () => {
    const cut = founder({ bridges: 2, equityCut: 0.2 })
    expect(revenueMultOf(cut)).toBeCloseTo(2.4)
    expect(revenueMultOf({ track: "ladder", equityCut: 0.2 })).toBeCloseTo(0.8)
    expect(productRevenueOf(100, cut)).toBeCloseTo(240)
  })

  it("pays more for the win when it was built full-time", () => {
    expect(winMultOf("founder")).toBeGreaterThan(winMultOf("ladder"))
    const won = { state: { ...FRESH_COMPANY, won: true }, earned: 0, lost: 0, burned: 0, burnPerSec: 0, notes: [] }
    expect(settleGrowth(0, 1, false, won, { track: "founder", broke: false, away: false }).foreverMult).toBe(1.5)
    expect(settleGrowth(0, 1, false, won).foreverMult).toBe(1.25)
  })
})

describe("burn and runway", () => {
  it("rises with the users, slower than the crowd", () => {
    expect(burnOf(0)).toBeGreaterThan(0)
    expect(burnOf(10_000)).toBeGreaterThan(burnOf(1_000))
    expect(burnOf(1_000_000) / burnOf(1_000)).toBeLessThan(1_000)
  })

  it("runs only for a founder who has not run out", () => {
    expect(step(FRESH_FOUNDER).burned).toBe(0)
    expect(step(founder({ broke: true })).burned).toBe(0)
    expect(step(founder()).burned).toBeCloseTo(burnOf(1000) * 60, 6)
  })

  it("reads the runway as money over a negative net, and none when the money does not run down", () => {
    expect(runwayOf(6_000, -10)).toBe(600)
    expect(runwayOf(6_000, 0)).toBeNull()
    expect(runwayOf(6_000, 5)).toBeNull()
  })

  it("prices the quit at the moment: salary gone, revenue tripled, burn on", () => {
    const offer = forkOffer({ idle: 150, salary: 100, revenue: 10, lostPerSec: 0, users: 1000, money: 10_000, founder: FRESH_FOUNDER })
    expect(offer.salary).toBe(100)
    expect(offer.revenueNow).toBe(10)
    expect(offer.revenueFounder).toBe(30)
    expect(offer.burn).toBeCloseTo(burnOf(1000))
    expect(offer.net).toBeCloseTo(50 + 30 - burnOf(1000))
    expect(offer.runwaySec).toBeCloseTo(10_000 / -offer.net)
    expect(forkOffer({ idle: 5000, salary: 0, revenue: 100, lostPerSec: 0, users: 1000, money: 10, founder: FRESH_FOUNDER }).runwaySec).toBeNull()
  })

  it("runs a founder at a loss at the fork on the gear it brings, and into profit once the gear scales", () => {
    // 1,000 users on a laptop's worth of gear: $13/s of gear, $25/s of revenue, against the burn.
    expect(forkOffer({ idle: 13, salary: 0, revenue: 8.2, lostPerSec: 0, users: 1_000, money: 50_000, founder: FRESH_FOUNDER }).net).toBeLessThan(0)
    // 1M users on the $1.8M of gear that serves them: $8.6k/s of gear.
    expect(forkOffer({ idle: 8_640, salary: 0, revenue: 216, lostPerSec: 0, users: 1_000_000, money: 0, founder: FRESH_FOUNDER }).net).toBeGreaterThan(0)
  })
})

describe("settling the burn", () => {
  it("stops a live balance at zero and calls it broke", () => {
    expect(settleBurn(100, -50, 10, false)).toEqual({ money: 0, broke: true })
    expect(settleBurn(100, 40, 10, false)).toEqual({ money: 40, broke: false })
  })

  it("floors a balance away at a minute of burn, and calls it broke when the stretch ran out", () => {
    expect(settleBurn(10_000, -5_000, 10, true)).toEqual({ money: 10 * AWAY_FLOOR_MINUTES * 60, broke: true })
  })

  it("never lifts a balance that left below the floor", () => {
    expect(settleBurn(200, -5_000, 10, true).money).toBe(200)
    expect(settleBurn(0, -5_000, 10, true)).toEqual({ money: 0, broke: true })
  })

  it("goes through settleGrowth the same way live and away", () => {
    const ran = { state: FRESH_COMPANY, earned: 0, lost: 0, burned: 5_000, burnPerSec: 10, notes: [] }
    const where = { track: "founder" as const, broke: false }
    expect(settleGrowth(1_000, 1, false, ran, { ...where, away: false })).toMatchObject({ money: 0, broke: true })
    expect(settleGrowth(1_000, 1, false, ran, { ...where, away: true })).toMatchObject({ money: 600, broke: true })
  })

  it("does not burn a founder who is already out, and does not call a ladder career broke", () => {
    const ran = { state: FRESH_COMPANY, earned: 0, lost: 0, burned: 5_000, burnPerSec: 10, notes: [] }
    expect(settleGrowth(1_000, 1, false, ran, { track: "ladder", broke: false, away: false }).broke).toBe(false)
    expect(settleGrowth(1_000, 1, false, { ...ran, burned: 0 }, { track: "founder", broke: true, away: false })).toMatchObject({ money: 1_000, broke: true })
  })
})

describe("bridges", () => {
  const out = founder({ broke: true })

  it("pay thirty minutes of burn, give up a tenth of the revenue, and reopen the road", () => {
    const raised = raiseBridge(out, 4_000)!
    expect(raised.cash).toBeCloseTo(burnOf(4_000) * BRIDGE_MINUTES * 60)
    expect(raised.founder).toMatchObject({ bridges: 1, broke: false, track: "founder" })
    expect(raised.founder.equityCut).toBeCloseTo(BRIDGE_CUT)
  })

  it("stack the equity cut to three and then refuse", () => {
    let current = out
    for (let i = 1; i <= MAX_BRIDGES; i++) {
      const raised = raiseBridge({ ...current, broke: true }, 4_000)!
      expect(raised.founder.equityCut).toBeCloseTo(BRIDGE_CUT * i)
      current = raised.founder
    }
    expect(raiseBridge({ ...current, broke: true }, 4_000)).toBeNull()
  })

  it("are refused while the money has not run out, and on the ladder", () => {
    expect(raiseBridge(founder(), 4_000)).toBeNull()
    expect(raiseBridge({ ...FRESH_FOUNDER, broke: true }, 4_000)).toBeNull()
  })
})

describe("going back to a job", () => {
  it("drops the highest job one rung, keeps the rest, and asks for twice the users before quitting again", () => {
    const back = returnToLadder(founder({ broke: true }), 3_000, [1, 2, 3], true)!
    expect(back.jobs).toEqual([1, 2])
    expect(back.founder).toMatchObject({ track: "ladder", requitAt: 6_000, broke: false })
  })

  it("keeps every job when the player chose to go back, and a lone first job when there is nothing under it", () => {
    expect(returnToLadder(founder(), 3_000, [1, 2, 3], false)!.jobs).toEqual([1, 2, 3])
    expect(returnToLadder(founder({ broke: true }), 3_000, [1], true)!.jobs).toEqual([1])
  })

  it("keeps the bridges and the equity given up", () => {
    const back = returnToLadder(founder({ broke: true, bridges: 2, equityCut: 0.2 }), 3_000, [1, 2], true)!
    expect(back.founder).toMatchObject({ bridges: 2, equityCut: 0.2 })
  })

  it("is refused on the ladder", () => {
    expect(returnToLadder(FRESH_FOUNDER, 3_000, [1], true)).toBeNull()
  })
})

describe("a founder's salary", () => {
  const owned = { skills: { "2": 1 }, equipment: {}, owned: {}, jobs: [1, 2, 4], gigs: [] }

  it("stops, along with the XP the jobs teach, while the jobs stay held", () => {
    expect(idlePerSec(owned)).toBeGreaterThan(0)
    expect(idlePerSec({ ...owned, founder: { track: "founder" } })).toBe(0)
    const learning = { ...owned, jobs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
    expect(xpPerSec(learning)).toBeGreaterThan(xpPerSec({ ...learning, founder: { track: "founder" } }))
    expect(owned.jobs).toHaveLength(3)
  })

  it("keeps the retainers, the gear and the capital paying", () => {
    const paying = { ...owned, gigs: [8], equipment: { "46": 1 }, founder: { track: "founder" as const } }
    expect(idlePerSec(paying)).toBeGreaterThan(0)
  })
})

describe("the saved block", () => {
  it("round-trips, and drops what is malformed", () => {
    const good = { track: "founder", offered: true, bridges: 2, equityCut: 0.2, requitAt: null, broke: true }
    expect(parseFounder(good)).toEqual(good)
    expect(parseFounder(null)).toBeUndefined()
    expect(parseFounder({ ...good, track: "ceo" })).toBeUndefined()
  })

  it("caps the bridges and the equity, and keeps run-out and the wait to the track they belong to", () => {
    const cleaned = parseFounder({ track: "ladder", offered: true, bridges: 9, equityCut: 5, requitAt: 4_000, broke: true })!
    expect(cleaned).toMatchObject({ bridges: MAX_BRIDGES, requitAt: 4_000, broke: false })
    expect(cleaned.equityCut).toBeCloseTo(BRIDGE_CUT * MAX_BRIDGES)
    expect(parseFounder({ track: "founder", offered: false, requitAt: 4_000 })).toMatchObject({ offered: true, requitAt: null })
  })
})
