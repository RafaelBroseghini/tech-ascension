import { describe, expect, it } from "vitest"
import { advanceCompany, FRESH_COMPANY, grownUsers, settleGrowth, growthFacts, parseCompany, STATUS_DAY_MS, stepCompany, uptimePercent } from "./growth.ts"
import type { CompanyState } from "./growth.ts"
import { arpuOf, BASE_RPS, RPS_PER_USER, SERVING_KINDS, servingOf } from "./load.ts"
import { ceilingOf, INCIDENT_MIN_USERS, MAX_INCIDENTS, totalUsers, WORLD_CEILING, WORLD_TARGET } from "./world.ts"
import type { Incident } from "./world.ts"
import { GEAR } from "../../data/gear.ts"
import { REGIONS } from "../../data/regions.ts"

const never = () => 0.999
const always = () => 0
const gigs = (n: number) => Array.from({ length: n }, (_, i) => i + 1)
const facts = (n: number, equipment: Record<string, number> = {}) => growthFacts(gigs(n), equipment)
const state = (over: Partial<CompanyState> = {}): CompanyState => ({ ...FRESH_COMPANY, day: 0, uptime: "o", ...over })
const roomy = { "54": 5 }
const fiveOfEach = Object.fromEntries(GEAR.filter((item) => SERVING_KINDS.includes(item.kind)).map((item) => [String(item.id), 5]))
const ddos = (over: Partial<Incident> = {}): Incident => ({ id: 1, kind: "ddos", region: "americas-east", until: 10 * 60_000, strength: 3, ...over })

describe("users", () => {
  it("are none without a client: nobody signs up by themselves", () => {
    const step = advanceCompany(state(), facts(0, roomy), 0, 10 * 60_000, never)
    expect(totalUsers(step.state.users)).toBe(0)
  })

  it("start from the clients the gigs signed and grow while the gear serves them", () => {
    const step = advanceCompany(state(), facts(3, roomy), 0, 20 * 60_000, never)
    expect(totalUsers(step.state.users)).toBeGreaterThan(3 * 40)
    expect(step.lost).toBe(0)
  })

  it("stay inside what each region can hold, and spread to regions with no client", () => {
    const step = advanceCompany(state(), facts(3, roomy), 0, 6 * 3_600_000, never)
    for (const region of REGIONS) expect(step.state.users[region.id] ?? 0).toBeLessThanOrEqual(ceilingOf(region.id))
    expect(Object.keys(step.state.users).length).toBeGreaterThan(1)
  })

  it("grow at the live tick, and a tenth of a second at a time lands where minute steps do", () => {
    const tick = (ms: number) => {
      let current = state()
      for (let at = 0; at < 3_600_000; at += ms) current = advanceCompany(current, facts(3, roomy), at, at + ms, never).state
      return totalUsers(current.users)
    }
    const live = tick(100)
    const away = tick(60_000)
    expect(live).toBeGreaterThan(3 * 40)
    expect(Math.abs(live - away) / away).toBeLessThan(0.1)
  })

  it("are held back by the gear: a laptop alone settles near what it serves", () => {
    const step = advanceCompany(state(), facts(3), 0, 4 * 3_600_000, never)
    expect(totalUsers(step.state.users)).toBeLessThan((BASE_RPS / RPS_PER_USER) * 2.2)
    const more = advanceCompany(state(), facts(3, roomy), 0, 4 * 3_600_000, never)
    expect(totalUsers(more.state.users)).toBeGreaterThan(totalUsers(step.state.users) * 100)
  })

  it("drop out and cost money when the gear cannot keep up", () => {
    const crowd = state({ users: { "americas-east": 5000 } })
    const step = stepCompany(crowd, facts(3), 60_000, 60_000, never)
    expect(step.state.users["americas-east"]).toBeLessThan(5000 * 1.01)
    expect(step.lost).toBeGreaterThan(0)
  })

  it("reaching a region the company owns is easier than one it does not", () => {
    const own = growthFacts([1], roomy, { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt", "london", "paris"], off: [], dark: [] })
    const none = growthFacts([1], roomy)
    expect(own.reach["europe"]!).toBeGreaterThan(none.reach["europe"]! * 3)
  })
})

describe("the growth curve", () => {
  const walk = (users: number, seed: number, ceiling: number, rate: number, sec: number, pieces: number) => {
    let here = users
    for (let i = 0; i < pieces; i++) here = grownUsers(here, seed, ceiling, rate, sec / pieces)
    return here
  }

  it("does not depend on the step: one long step lands where many short ones do, at a pace that would blow up explicit steps", () => {
    // 0.0125 a second over a minute is a factor of 0.75 per step.
    for (const [users, seed] of [[1000, 0], [5, 40], [0, 40], [3e6, 100]] as const) {
      const once = walk(users, seed, 1e9, 0.0125, 3600, 1)
      const many = walk(users, seed, 1e9, 0.0125, 3600, 3600)
      expect(Math.abs(once - many) / many, `${users} from ${seed}`).toBeLessThan(1e-9)
    }
  })

  it("starts at the seed, never passes the ceiling, and leaves an empty region with no seed empty", () => {
    expect(grownUsers(0, 40, 1e6, 0.01, 1)).toBeGreaterThan(0)
    expect(grownUsers(0, 0, 1e6, 0.01, 1e6)).toBe(0)
    expect(grownUsers(1000, 0, 1e6, 0.5, 1e6)).toBeLessThanOrEqual(1e6)
    expect(grownUsers(1000, 0, 1e6, 0.5, 1e6)).toBeGreaterThan(1e6 * 0.999)
    expect(grownUsers(2e6, 0, 1e6, 0.5, 10)).toBe(2e6)
    expect(grownUsers(1000, 0, 1e6, 0, 10)).toBe(1000)
  })

  it("matches the differential equation for a short step", () => {
    const users = 1e5
    const rate = 0.0125
    expect(grownUsers(users, 0, 1e9, rate, 0.1)).toBeCloseTo(users + rate * users * (1 - users / 1e9) * 0.1, 0)
  })
})

describe("the world pushing back", () => {
  it("resistance climbs as the company grows", () => {
    // Both crowds are served: a crowd the gear drops melts away within the step, and resistance follows the crowd that is left.
    const served = facts(3, fiveOfEach)
    const small = stepCompany(state({ users: { "americas-east": 1e6 } }), served, 600_000, 600_000, never)
    const huge = stepCompany(state({ users: { asia: 2e9, europe: 6e8 } }), served, 600_000, 600_000, never)
    expect(huge.state.resistance).toBeGreaterThan(small.state.resistance)
    expect(huge.state.resistance).toBeGreaterThan(1)
  })

  it("resistance slows growth", () => {
    const calm = stepCompany(state({ users: { "americas-east": 1e5 } }), facts(3, roomy), 60_000, 60_000, never)
    const hot = stepCompany(state({ users: { "americas-east": 1e5 }, resistance: 100 }), facts(3, roomy), 60_000, 60_000, never)
    expect(hot.state.users["americas-east"]!).toBeLessThan(calm.state.users["americas-east"]!)
  })

  it("leaves a company too small to notice alone", () => {
    const step = stepCompany(state({ users: { "americas-east": INCIDENT_MIN_USERS - 500 } }), facts(1, roomy), 1_000, 1_000, always)
    expect(step.state.incidents).toHaveLength(0)
  })

  it("throws an incident once there are users to hit, and journals it", () => {
    const step = stepCompany(state({ users: { "americas-east": 50_000 } }), facts(3, roomy), 1_000, 1_000, always)
    expect(step.state.incidents).toHaveLength(1)
    expect(step.state.incidents[0]).toMatchObject({ kind: "ddos", region: "americas-east", id: 1 })
    expect(step.state.incidentSeq).toBe(1)
    expect(step.notes).toEqual([{ type: "incident", ref: "incident:ddos", data: { region: "americas-east", id: 1 } }])
  })

  it("never has more than the cap at once", () => {
    const many = Array.from({ length: MAX_INCIDENTS }, (_, i) => ddos({ id: i + 1, strength: 1 }))
    const step = stepCompany(state({ users: { "americas-east": 50_000 }, incidents: many, incidentSeq: MAX_INCIDENTS }), facts(3, roomy), 1_000, 1_000, always)
    expect(step.state.incidents).toHaveLength(MAX_INCIDENTS)
    expect(step.state.incidentSeq).toBe(MAX_INCIDENTS)
  })

  it("ends an incident on its own when its time is up", () => {
    const step = stepCompany(state({ users: { "americas-east": 5000 }, incidents: [ddos({ until: 500 })] }), facts(3, roomy), 1_000, 1_000, never)
    expect(step.state.incidents).toHaveLength(0)
  })

  it("a DDoS surge multiplies the traffic in its region, so it can drop requests the gear would have served", () => {
    const users = { "americas-east": 20_000 }
    expect(servingOf(users, [ddos()], {}).demand).toBeCloseTo(20_000 * RPS_PER_USER * 3)
    const calm = stepCompany(state({ users }), facts(3, { "54": 1 }), 60_000, 60_000, never)
    const hit = stepCompany(state({ users, incidents: [ddos({ strength: 8 })] }), facts(3, { "54": 1 }), 60_000, 60_000, never)
    expect(calm.lost).toBe(0)
    expect(hit.lost).toBeGreaterThan(0)
  })

  it("a block stalls the region and bleeds its users; a server there halves the bleed", () => {
    const block: Incident = { id: 1, kind: "block", region: "europe", until: 10 * 60_000, strength: 1 }
    const base = state({ users: { europe: 100_000 }, incidents: [block] })
    const bare = stepCompany(base, growthFacts([1], roomy), 60_000, 60_000, never)
    const hosted = stepCompany(base, growthFacts([1], roomy, { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: [], dark: [] }), 60_000, 60_000, never)
    expect(bare.state.users["europe"]!).toBeLessThan(100_000)
    expect(hosted.state.users["europe"]!).toBeGreaterThan(bare.state.users["europe"]!)
    expect(hosted.state.users["europe"]!).toBeLessThan(100_000)
  })

  it("a law only bites a region with no server of its own", () => {
    const law: Incident = { id: 1, kind: "law", region: "europe", until: 10 * 60_000, strength: 1 }
    const base = state({ users: { europe: 100_000 }, incidents: [law] })
    const bare = stepCompany(base, growthFacts([1], roomy), 60_000, 60_000, never)
    const hosted = stepCompany(base, growthFacts([1], roomy, { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: [], dark: [] }), 60_000, 60_000, never)
    expect(bare.state.users["europe"]!).toBeLessThan(100_000)
    expect(hosted.state.users["europe"]!).toBeGreaterThan(100_000)
  })

  it("a law beside a block bleeds nothing more from a region with its own server", () => {
    const block: Incident = { id: 1, kind: "block", region: "europe", until: 10 * 60_000, strength: 1 }
    const law: Incident = { id: 2, kind: "law", region: "europe", until: 10 * 60_000, strength: 1 }
    const hosted = growthFacts([1], roomy, { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: [], dark: [] })
    const alone = stepCompany(state({ users: { europe: 100_000 }, incidents: [block] }), hosted, 60_000, 60_000, never)
    const both = stepCompany(state({ users: { europe: 100_000 }, incidents: [block, law] }), hosted, 60_000, 60_000, never)
    expect(both.state.users["europe"]).toBeCloseTo(alone.state.users["europe"]!, 6)
  })

  it("a rival halves the growth in its region", () => {
    const rival: Incident = { id: 1, kind: "rival", region: "americas-east", until: 10 * 60_000, strength: 0.5 }
    const users = { "americas-east": 100_000 }
    // A short step, where the gain is still in proportion to the pace; over a minute the crowd compounds.
    const free = stepCompany(state({ users }), facts(3, roomy), 100, 100, never)
    const rivalled = stepCompany(state({ users, incidents: [rival] }), facts(3, roomy), 100, 100, never)
    const gain = (s: typeof free) => s.state.users["americas-east"]! - 100_000
    expect(gain(rivalled)).toBeCloseTo(gain(free) * 0.5, 0)
  })
})

describe("milestones and the win", () => {
  it("journals each milestone once, as users cross it", () => {
    const step = stepCompany(state({ users: { "americas-east": 999_000 } }), facts(3, { "110": 1 }), 60_000, 60_000, never)
    expect(step.notes.map((n) => n.ref)).toEqual(["world:1m"])
    expect(stepCompany(step.state, facts(3, { "110": 1 }), 60_000, 120_000, never).notes).toEqual([])
  })

  it("latches the win at eight billion and keeps the company running", () => {
    const near = Object.fromEntries(REGIONS.map((r) => [r.id, ceilingOf(r.id) * (7.999e9 / WORLD_CEILING)]))
    const full = growthFacts(gigs(8), { "110": 20 }, { regions: REGIONS.map((r) => r.id), pops: ["ashburn", "frankfurt", "tokyo", "saopaulo", "lagos", "sydney", "sf"], off: [], dark: [] })
    const step = stepCompany(state({ users: near }), full, 60_000, 60_000, never)
    expect(totalUsers(step.state.users)).toBeGreaterThanOrEqual(WORLD_TARGET)
    expect(step.state.won).toBe(true)
    expect(step.notes.map((n) => n.ref)).toContain("world:won")
    const after = stepCompany(step.state, full, 60_000, 120_000, never)
    expect(after.state.won).toBe(true)
    expect(after.notes.map((n) => n.ref)).not.toContain("world:won")
  })
})

describe("the uptime bars", () => {
  it("records a day's worst state and opens a new bar each day", () => {
    const crowd = { users: { "americas-east": 133 } }
    const first = stepCompany({ ...FRESH_COMPANY, ...crowd }, facts(1), 1_000, 1_000, never)
    expect(first.state.uptime).toBe("p")
    const later = stepCompany(first.state, facts(1), 1_000, 2 * STATUS_DAY_MS + 1_000, never)
    expect(later.state.uptime).toHaveLength(3)
    expect(later.state.uptime.slice(0, 1)).toBe("p")
  })

  it("keeps the worst state of a day", () => {
    const bad = stepCompany({ ...FRESH_COMPANY, users: { "americas-east": 133 } }, facts(1), 1_000, 1_000, never)
    const good = stepCompany({ ...bad.state, users: {} }, facts(0), 1_000, 2_000, never)
    expect(good.state.uptime).toBe("p")
  })

  it("computes an uptime percentage from the bars", () => {
    expect(uptimePercent("")).toBe(100)
    expect(uptimePercent("oooop")).toBe(80)
  })
})

describe("offline time", () => {
  it("walks the company over a long away and sums what drops cost", () => {
    const walked = advanceCompany({ ...FRESH_COMPANY }, facts(8), 0, 30 * 60_000, never)
    expect(walked.state.uptime.length).toBeGreaterThanOrEqual(1)
    const crowded = advanceCompany(state({ users: { "americas-east": 20_000 } }), facts(8), 0, 30 * 60_000, never)
    expect(crowded.lost).toBeGreaterThan(0)
  })
})

describe("saved company", () => {
  const good = { users: { europe: 120 }, resistance: 12, incidents: [{ id: 2, kind: "block", region: "europe", until: 9, strength: 1.5 }], incidentSeq: 2, won: false, hiredUsers: 0, uptime: "oop", day: 4 }

  it("accepts a good block and drops a malformed one", () => {
    expect(parseCompany(good)).toEqual(good)
    expect(parseCompany({ ...good, incidentSeq: 1.5 })).toBeUndefined()
    expect(parseCompany({ ...good, uptime: "oxp" })).toBeUndefined()
    expect(parseCompany(null)).toBeUndefined()
  })

  it("drops a block from before users and regions, and the bad parts of a good one", () => {
    expect(parseCompany({ popularity: 42, leads: 3, uptime: "oop", day: 4 })).toBeUndefined()
    const cleaned = parseCompany({ ...good, users: { europe: 120, mars: 5, asia: -1, africa: 1e30 }, incidents: [good.incidents[0], { id: 3, kind: "meteor", region: "europe", until: 1, strength: 1 }] })!
    expect(cleaned.users).toEqual({ europe: 120, africa: ceilingOf("africa") })
    expect(cleaned.incidents).toHaveLength(1)
  })
})

describe("settleGrowth", () => {
  const grown = (won: boolean, lost: number, earned = 0) => ({ state: { ...FRESH_COMPANY, won }, earned, lost, payroll: 0, notes: [] })

  it("charges the drops, never below zero", () => {
    expect(settleGrowth(100, 1, false, grown(false, 30)).money).toBe(70)
    expect(settleGrowth(100, 1, false, grown(false, 500)).money).toBe(0)
  })

  it("adds what the users paid before the drops are charged", () => {
    expect(settleGrowth(100, 1, false, grown(false, 30, 50)).money).toBe(120)
    expect(settleGrowth(0, 1, false, grown(false, 30, 50)).money).toBe(20)
    expect(settleGrowth(0, 1, false, grown(false, 80, 50)).money).toBe(0)
  })

  it("multiplies everything earned once, on the step that wins", () => {
    expect(settleGrowth(0, 2, false, grown(true, 0))).toMatchObject({ foreverMult: 2.5, wonNow: true })
    expect(settleGrowth(0, 2.5, true, grown(true, 0))).toMatchObject({ foreverMult: 2.5, wonNow: false })
  })
})

describe("product revenue", () => {
  const crowd = { "americas-east": 40_000 }

  it("pays for served users only", () => {
    const serving = servingOf(crowd, [], roomy)
    expect(serving.dropShare).toBe(0)
    expect(serving.revenuePerSec).toBeCloseTo(40_000 * arpuOf(40_000))
    expect(servingOf({}, [], roomy).revenuePerSec).toBe(0)
  })

  it("pays nothing for the dropped share", () => {
    const serving = servingOf({ "americas-east": 1e9 }, [], {})
    expect(serving.dropShare).toBeGreaterThan(0.999)
    // Only the users the base laptop can answer pay.
    expect(serving.revenuePerSec).toBeCloseTo((BASE_RPS / RPS_PER_USER) * arpuOf(1e9))
    expect(serving.revenuePerSec).toBeLessThan(1e9 * arpuOf(1e9) * 1e-5)
  })

  it("is paid a step at a time", () => {
    // A step of at most five seconds (SUBSTEP_S) is one piece, paid at the crowd it started with.
    const step = stepCompany(state({ users: crowd }), facts(3, roomy), 5_000, 5_000, never)
    expect(step.earned).toBeCloseTo(servingOf(crowd, [], roomy).revenuePerSec * 5)
    const walked = advanceCompany(state({ users: crowd }), facts(3, roomy), 0, 3 * 60_000, never)
    expect(walked.earned).toBeGreaterThan(step.earned * 36)
    expect(stepCompany(state(), facts(3, roomy), 5_000, 5_000, never).earned).toBe(0)
  })

  it("falls per user as the crowd grows, while the total keeps rising", () => {
    expect(arpuOf(1e6)).toBeLessThan(arpuOf(1e3))
    expect(1e9 * arpuOf(1e9)).toBeGreaterThan(1e6 * arpuOf(1e6))
  })
})
