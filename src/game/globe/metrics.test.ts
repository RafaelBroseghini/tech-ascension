import { describe, expect, it } from "vitest"
import { CLIENT_CITIES } from "../../data/geo.ts"
import { companyOf } from "./company.ts"
import { FRESH_FOOTPRINT } from "./footprint.ts"
import { popularityLoad } from "./load.ts"
import { appMetrics, popRows } from "./metrics.ts"
import { cityRows } from "./tip.ts"

const facts = { gigs: [1, 2, 3, 4, 5, 6], leads: 0, popularity: 0, footprint: FRESH_FOOTPRINT, equipment: {} }

describe("the app's metrics", () => {
  it("shows demand against capacity, and what it costs when the app cannot keep up", () => {
    const busy = companyOf({ ...facts, popularity: 100 })
    const m = appMetrics(busy, cityRows(busy.audience, busy.demand, busy.pops))
    expect(m.demand).toBe(6 * 10 * popularityLoad(100))
    expect(m.capacity).toBe(30)
    expect(m.dropped).toBeCloseTo(m.demand - 30)
    expect(m.servedShare).toBeCloseTo(30 / m.demand)
    expect(m.lostPerSec).toBeCloseTo(m.dropped * 0.02)
    expect(m.load).toBeCloseTo(m.demand / 30)
  })

  it("an idle app has no drops and a latency from its clients", () => {
    const c = companyOf({ ...facts, gigs: [1, 2, 3] })
    const m = appMetrics(c, cityRows(c.audience, c.demand, c.pops))
    expect(m.dropped).toBe(0)
    expect(m.servedShare).toBe(1)
    expect(m.clients).toBe(3)
    expect(m.cities).toBe(3)
    expect(m.avgMs).toBeGreaterThan(10)
    expect(m.p95Ms).toBeGreaterThanOrEqual(m.avgMs)
    expect(m.worst?.ms).toBe(Math.max(...cityRows(c.audience, c.demand, c.pops).map((r) => r.ms)))
  })

  it("a server nearer the clients lowers the latency", () => {
    const far = companyOf(facts)
    const near = companyOf({ ...facts, footprint: { regions: FRESH_FOOTPRINT.regions, pops: ["ashburn", "frankfurt", "tokyo", "sf"], off: [], dark: [] } })
    const slow = appMetrics(far, cityRows(far.audience, far.demand, far.pops))
    const fast = appMetrics(near, cityRows(near.audience, near.demand, near.pops))
    expect(fast.avgMs).toBeLessThan(slow.avgMs)
  })

  it("lists every server with the clients routed to it, even one nobody uses", () => {
    const pops = ["ashburn", "frankfurt", "tokyo"]
    const rows = cityRows(CLIENT_CITIES.slice(0, 12).map((city) => ({ city, share: 1 / 12 })), 120, pops)
    const list = popRows(rows, pops)
    expect(list.map((p) => p.id).sort()).toEqual([...pops].sort())
    expect(list.reduce((n, p) => n + p.cities, 0)).toBe(12)
    expect(list.reduce((n, p) => n + p.share, 0)).toBeCloseTo(1)
    expect(list[0]!.share).toBeGreaterThanOrEqual(list[1]!.share)
    expect(popRows([], ["ashburn"])[0]).toMatchObject({ id: "ashburn", cities: 0, share: 0, avgMs: 0 })
  })
})
