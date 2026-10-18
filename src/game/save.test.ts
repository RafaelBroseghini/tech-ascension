import { describe, expect, it } from "vitest"
import { freshSave, hydrate, parseSave } from "./save.ts"
import { ceilingOf, WORLD_CEILING } from "./globe/world.ts"
import { REGIONS } from "../data/regions.ts"

describe("save: a block this build does not know", () => {
  it("still loads, and the unknown block is dropped", () => {
    const raw = { ...freshSave(1_000), retiredBlock: { "hello-server": { verdict: "hire", attempts: 1, design: { nodes: [], edges: [] } } } }
    const text = JSON.stringify(raw)
    expect(parseSave(JSON.parse(text))).not.toHaveProperty("retiredBlock")
    expect(hydrate(text, 1_000).save).not.toHaveProperty("retiredBlock")
  })
})

describe("save: the company's users", () => {
  const company = { users: { europe: 1200 }, resistance: 4, incidents: [], incidentSeq: 0, won: false, hiredUsers: 0, uptime: "oo", day: 3 }

  it("keeps the block, and drops one from before users and regions without wiping the career", () => {
    const kept = parseSave(JSON.parse(JSON.stringify({ ...freshSave(1_000), company })))
    expect(kept?.company).toEqual(company)
    const old = parseSave(JSON.parse(JSON.stringify({ ...freshSave(1_000), company: { popularity: 40, leads: 2, uptime: "oo", day: 3 } })))
    expect(old).not.toBeNull()
    expect(old).not.toHaveProperty("company")
  })

  it("grows the company while away and pays the win's multiplier once", () => {
    const near = Object.fromEntries(REGIONS.map((region) => [region.id, ceilingOf(region.id) * (7.999e9 / WORLD_CEILING)]))
    const saved = { ...freshSave(0), gigs: [1, 2, 3], company: { ...company, users: near, resistance: 100 }, equipment: { "110": 40, "109": 40 } }
    const first = hydrate(JSON.stringify(saved), 24 * 3_600_000)
    expect(first.save.company?.won).toBe(true)
    expect(first.save.foreverMult).toBeCloseTo(1.25)
    expect(first.toast?.split("\n")[0]).toContain("Eight billion users")
    const again = hydrate(JSON.stringify(first.save), 25 * 3_600_000)
    expect(again.save.foreverMult).toBeCloseTo(1.25)
    expect(again.toast ?? "").not.toContain("Eight billion users")
  })
})
