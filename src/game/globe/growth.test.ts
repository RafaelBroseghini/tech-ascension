import { describe, expect, it } from "vitest"
import { CLIENT_CITIES } from "../../data/geo.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts, parseCompany, POP_MAX, STATUS_DAY_MS, stepCompany, uptimePercent } from "./growth.ts"
import type { CompanyState } from "./growth.ts"

const never = () => 0.999
const served = { "44": 10 }
const facts = (gigs: number, equipment: Record<string, number> = {}) => growthFacts(Array.from({ length: gigs }, (_, i) => i + 1), equipment)
const state = (over: Partial<CompanyState> = {}): CompanyState => ({ ...FRESH_COMPANY, day: 0, uptime: "o", ...over })

describe("popularity", () => {
  it("grows while the app serves its clients well", () => {
    const step = stepCompany(state({ popularity: 20 }), facts(3, served), 60_000, 60_000, never)
    expect(step.state.popularity).toBeGreaterThan(20)
    expect(step.lost).toBe(0)
  })

  it("falls when most of the demand is dropped, and the drops cost money", () => {
    const step = stepCompany(state({ popularity: 40 }), facts(8), 60_000, 60_000, never)
    expect(step.state.popularity).toBeLessThan(40)
    expect(step.lost).toBeGreaterThan(0)
  })

  it("stays inside 0 to 100", () => {
    const high = stepCompany(state({ popularity: POP_MAX }), facts(3, served), 3_600_000, 3_600_000, never)
    expect(high.state.popularity).toBeLessThanOrEqual(POP_MAX)
    const low = stepCompany(state({ popularity: 0 }), facts(0), 3_600_000, 3_600_000, never)
    expect(low.state.popularity).toBe(0)
  })

  it("a viral roll adds a spike and journals it", () => {
    const step = stepCompany(state({ popularity: 10 }), facts(3, served), 60_000, 60_000, () => 0)
    expect(step.notes.map((n) => n.type)).toContain("buzz")
    expect(step.state.popularity).toBeGreaterThan(20)
  })
})

describe("inbound leads", () => {
  it("land automatically once popularity clears the bar, one city at a time", () => {
    const step = stepCompany(state({ popularity: 10 }), facts(2, served), 1_000, 1_000, never)
    const leads = step.notes.filter((n) => n.type === "lead")
    expect(leads.length).toBeGreaterThan(0)
    expect(leads[0]!.ref).toBe(`lead:${CLIENT_CITIES[2]}`)
    expect(step.state.leads).toBe(leads.length)
  })

  it("never signs more clients than there are cities", () => {
    const step = stepCompany(state({ popularity: 100, leads: CLIENT_CITIES.length }), facts(0, served), 1_000, 1_000, never)
    expect(step.notes.filter((n) => n.type === "lead")).toHaveLength(0)
    expect(step.state.leads).toBe(CLIENT_CITIES.length)
  })

  it("has at least 50 cities to sign", () => {
    expect(CLIENT_CITIES.length).toBeGreaterThanOrEqual(50)
  })
})

describe("the uptime bars", () => {
  it("records a day's worst state and opens a new bar each day", () => {
    const first = stepCompany({ ...FRESH_COMPANY }, facts(3), 1_000, 1_000, never)
    expect(first.state.uptime).toBe("p")
    const later = stepCompany(first.state, facts(3), 1_000, 2 * STATUS_DAY_MS + 1_000, never)
    expect(later.state.uptime).toHaveLength(3)
    expect(later.state.uptime.slice(0, 1)).toBe("p")
    expect(later.state.uptime.slice(-1)).toBe("p")
  })

  it("keeps the worst state of a day", () => {
    const bad = stepCompany({ ...FRESH_COMPANY }, facts(3), 1_000, 1_000, never)
    const good = stepCompany(bad.state, facts(0), 1_000, 2_000, never)
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
    expect(walked.lost).toBeGreaterThan(0)
    expect(walked.state.uptime.length).toBeGreaterThanOrEqual(1)
  })
})

describe("saved company", () => {
  it("accepts a good block and drops a malformed one", () => {
    expect(parseCompany({ popularity: 42, leads: 3, uptime: "oop", day: 4 })).toEqual({ popularity: 42, leads: 3, uptime: "oop", day: 4 })
    expect(parseCompany({ popularity: 42, leads: 1.5, uptime: "oop", day: 4 })).toBeUndefined()
    expect(parseCompany({ popularity: 42, leads: 1, uptime: "oxp", day: 4 })).toBeUndefined()
    expect(parseCompany(null)).toBeUndefined()
  })
})
