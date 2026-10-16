import { describe, expect, it } from "vitest"
import { companyOf } from "./company.ts"
import { BASE_RPS, capacityOf } from "./load.ts"
import { pastIncidents, statusOf } from "./status.ts"

const money = (n: number) => `$${n}`
const board = (users: number, equipment: Record<string, number> = {}, uptime = "") =>
  statusOf({
    company: companyOf({ users: users > 0 ? { "americas-east": users } : {}, resistance: 0, incidents: [], won: false, footprint: { regions: ["americas-east"], pops: ["ashburn"], off: [], dark: [] }, equipment }),
    retainers: { count: 0, perSec: 0 },
    uptime,
    money,
    lostPerSec: 0,
  })
const serving = (b: ReturnType<typeof board>) => b.components.find((c) => c.id === "serving")!

describe("the status board", () => {
  it("is all clear with no users: nothing asked, nothing down", () => {
    const b = board(0)
    expect(b.banner).toBe("All Systems Operational")
    expect(b.incident).toBeNull()
    expect(serving(b).health).toBe("operational")
  })

  it("stays operational while the base capacity keeps up", () => {
    const b = board(100)
    expect(serving(b).health).toBe("operational")
    expect(b.incident).toBeNull()
  })

  it("gets slow as demand nears capacity, then drops requests once it outgrows the gear", () => {
    const warm = board(250)
    expect(serving(warm).health).toBe("degraded")
    expect(warm.banner).toBe("Degraded Performance")
    expect(warm.incident?.title).toBe("Elevated latency on request serving")
    const busy = board(400)
    expect(serving(busy).health).toBe("partial")
    expect(busy.banner).toBe("Partial Outage")
    expect(busy.incident?.title).toBe("Requests failing on request serving")
    expect(busy.incident?.updates.map((u) => u.state)).toEqual(["Investigating", "Identified", "Monitoring"])
  })

  it("buying gear brings the board back to operational", () => {
    const busy = board(400)
    expect(serving(busy).health).toBe("partial")
    const fixed = board(400, { "44": 1 })
    expect(capacityOf({ "44": 1 })).toBeGreaterThan(BASE_RPS)
    expect(serving(fixed).health).toBe("operational")
    expect(fixed.incident).toBeNull()
  })

  it("reads retainers and regions", () => {
    const b = statusOf({
      company: companyOf({ users: { "americas-east": 1 }, resistance: 0, incidents: [], won: false, footprint: { regions: ["americas-east"], pops: ["ashburn"], off: [], dark: [] }, equipment: {} }),
      retainers: { count: 2, perSec: 14 },
      uptime: "",
      money,
      lostPerSec: 0,
    })
    expect(b.components.find((c) => c.id === "retainers")?.detail).toBe("2 on retainer, $14 a second")
    expect(b.components.find((c) => c.id === "regions")?.detail).toBe("1 point of presence in 1 region")
  })

  it("lists past incident runs of bars, newest first", () => {
    expect(pastIncidents("oooop")).toEqual([expect.objectContaining({ daysAgo: 0, health: "partial" })])
    expect(pastIncidents("ooo")).toEqual([])
  })
})
