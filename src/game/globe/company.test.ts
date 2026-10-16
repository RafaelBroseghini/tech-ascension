import { describe, expect, it } from "vitest"
import { CLIENT_CITIES } from "../../data/geo.ts"
import { companyOf } from "./company.ts"
import { BASE_RPS, capacityOf, demandOf, popularityLoad } from "./load.ts"
import { burstOf } from "./wave.ts"

const FRESH = { regions: ["americas-east"], pops: ["ashburn"], off: [], dark: [] }
const facts = (gigs: number[], over: Partial<Parameters<typeof companyOf>[0]> = {}) => ({ gigs, leads: 0, popularity: 0, footprint: FRESH, equipment: {}, ...over })

describe("your company on the globe", () => {
  it("has no clients until a gig is cleared, then signs one city per gig", () => {
    expect(companyOf(facts([]))).toMatchObject({ audience: [], clients: 0, demand: 0, pops: ["ashburn"], regions: ["americas-east"] })
    const three = companyOf(facts([1, 2, 3]))
    expect(three.audience.map((a) => a.city)).toEqual(CLIENT_CITIES.slice(0, 3))
    expect(three.audience.reduce((n, a) => n + a.share, 0)).toBeCloseTo(1)
    expect(three.demand).toBeCloseTo(demandOf(3, 0))
  })

  it("inbound leads add clients on top of the gigs", () => {
    expect(companyOf(facts([1], { leads: 4 })).clients).toBe(5)
  })

  it("popularity raises demand", () => {
    expect(companyOf(facts([1, 2], { popularity: 100 })).demand).toBeGreaterThan(companyOf(facts([1, 2])).demand)
  })

  it("the company serves from its deployed points of presence and regions", () => {
    const footprint = { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: [], dark: [] }
    expect(companyOf(facts([1], { footprint })).pops).toEqual(["ashburn", "frankfurt"])
    expect(companyOf(facts([1], { footprint })).regions).toHaveLength(2)
  })

  it("capacity is the base laptop plus the serving gear owned, and the share it cannot serve is dropped", () => {
    expect(capacityOf({})).toBe(BASE_RPS)
    expect(capacityOf({ "44": 2 })).toBe(BASE_RPS + 2 * 8 * 12)
    const short = companyOf(facts([1, 2, 3, 4], { popularity: 10 }))
    expect(short.dropShare).toBeGreaterThan(0)
    expect(companyOf(facts([1, 2, 3, 4], { popularity: 10, equipment: { "44": 1 } })).dropShare).toBe(0)
  })

  it("a burst sends in proportion to each client's share, and drops the share asked for", () => {
    const company = companyOf(facts([1, 2]))
    const burst = burstOf(company.audience, company.demand, 0.25)
    const units = burst.phases.flatMap((p) => p.units)
    const dropped = units.filter((u) => u.fate.kind === "dropped").length
    expect(dropped / units.length).toBeCloseTo(0.25, 1)
    const sent = (city: string) => units.filter((u) => u.city === city).length
    expect(sent(CLIENT_CITIES[0]!)).toBe(sent(CLIENT_CITIES[1]!))
  })

  it("a server switched off leaves the serving list and shows as idle", () => {
    const footprint = { regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: ["frankfurt"], dark: [] }
    const company = companyOf(facts([1], { footprint }))
    expect(company.pops).toEqual(["ashburn"])
    expect(company.idlePops).toEqual(["frankfurt"])
  })

  it("a fully popular app with a client in every city sends billions of requests a second, and a new one barely more than before", () => {
    expect(demandOf(CLIENT_CITIES.length, 100)).toBeGreaterThan(2e9)
    expect(demandOf(1, 0)).toBe(10)
    expect(demandOf(2, 10)).toBeLessThan(30)
    expect(popularityLoad(50)).toBeGreaterThan(popularityLoad(25) * 5)
  })
})
