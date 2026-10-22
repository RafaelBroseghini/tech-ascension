import { describe, expect, it } from "vitest"
import { REGIONS } from "../../data/regions.ts"
import { audienceOf, companyOf, visibleCities } from "./company.ts"
import { BASE_RPS, capacityOf, demandOf, RPS_PER_USER } from "./load.ts"
import { burstOf } from "./wave.ts"
import { makeIncident, WORLD_TARGET } from "./world.ts"

const FRESH = { regions: ["americas-east"], pops: ["ashburn"], off: [], dark: [] }
const facts = (users: Record<string, number>, over: Partial<Parameters<typeof companyOf>[0]> = {}) => ({ users, resistance: 0, incidents: [], won: false, footprint: FRESH, equipment: {}, ...over })

describe("your company on the globe", () => {
  it("has no audience until it has users, then shows cities for the regions they are in", () => {
    expect(companyOf(facts({}))).toMatchObject({ audience: [], users: 0, demand: 0, pops: ["ashburn"], regions: ["americas-east"] })
    const two = companyOf(facts({ "americas-east": 1000, europe: 100 }))
    expect(two.users).toBe(1100)
    expect(two.audience.reduce((n, a) => n + a.share, 0)).toBeCloseTo(1)
    const cities = new Set(two.audience.map((a) => a.city))
    expect(cities.has("nyc")).toBe(true)
    expect(cities.has("london")).toBe(true)
    expect(cities.has("tokyo")).toBe(false)
  })

  it("shows more cities as a region fills, up to all of them", () => {
    expect(visibleCities(0, 20)).toBe(0)
    expect(visibleCities(1, 20)).toBe(1)
    expect(visibleCities(1000, 20)).toBeGreaterThan(visibleCities(10, 20))
    expect(visibleCities(1e12, 20)).toBe(20)
    const everyone = audienceOf(Object.fromEntries(REGIONS.map((r) => [r.id, 1e9])))
    expect(new Set(everyone.map((a) => a.city)).size).toBeGreaterThan(60)
  })

  it("a region's users sit in its biggest cities first", () => {
    expect(audienceOf({ asia: 10 }).map((a) => a.city)).toEqual(expect.arrayContaining(["tokyo"]))
  })

  it("users are the share of the target", () => {
    expect(companyOf(facts({ asia: WORLD_TARGET / 2 })).share).toBeCloseTo(0.5)
  })

  it("the company serves from its deployed points of presence and regions", () => {
    const footprint = { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: [], dark: [] }
    expect(companyOf(facts({ europe: 10 }, { footprint })).pops).toEqual(["ashburn", "frankfurt"])
    expect(companyOf(facts({ europe: 10 }, { footprint })).regions).toHaveLength(2)
  })

  it("capacity is the base laptop plus the serving gear owned, and the share it cannot serve is dropped", () => {
    expect(capacityOf({})).toBe(BASE_RPS)
    expect(capacityOf({ "44": 2 })).toBe(BASE_RPS + 2 * 8 * 12)
    const short = companyOf(facts({ "americas-east": 1000 }))
    expect(short.demand).toBeCloseTo(1000 * RPS_PER_USER)
    expect(short.dropShare).toBeGreaterThan(0)
    expect(companyOf(facts({ "americas-east": 1000 }, { equipment: { "44": 1 } })).dropShare).toBe(0)
  })

  it("a DDoS surge raises demand", () => {
    const calm = companyOf(facts({ "americas-east": 100 }))
    const hit = companyOf(facts({ "americas-east": 100 }, { incidents: [makeIncident("ddos", "americas-east", 0, 1, 0)] }))
    expect(hit.demand).toBeCloseTo(calm.demand * 2)
  })

  it("a burst sends in proportion to each city's share, and drops the share asked for", () => {
    const company = companyOf(facts({ "americas-east": 500 }))
    const burst = burstOf(company.audience, company.demand, 0.25)
    const units = burst.phases.flatMap((p) => p.units)
    const dropped = units.filter((u) => u.fate.kind === "dropped").length
    expect(dropped / units.length).toBeCloseTo(0.25, 1)
  })

  it("a server switched off leaves the serving list and shows as idle", () => {
    const footprint = { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: ["frankfurt"], dark: [] }
    const company = companyOf(facts({ europe: 10 }, { footprint }))
    expect(company.pops).toEqual(["ashburn"])
    expect(company.idlePops).toEqual(["frankfurt"])
  })

  it("eight billion users send eight hundred million requests a second", () => {
    expect(demandOf(WORLD_TARGET)).toBeCloseTo(8e8)
  })

  it("shows the revenue and the drop cost the build pays", () => {
    const base = companyOf(facts({ "americas-east": 1000 }))
    const shown = companyOf(facts({ "americas-east": 1000 }, { revenueMult: 1.3, dropsMult: 0.5 }))
    expect(shown.revenuePerSec).toBeCloseTo(base.revenuePerSec * 1.3, 9)
    expect(shown.lostPerSec).toBeCloseTo(base.lostPerSec * 0.5, 9)
  })
})
