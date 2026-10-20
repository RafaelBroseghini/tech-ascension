import { describe, expect, it, vi } from "vitest"
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
    // No incidents while away: a block or a law rolled in those hours can hold the crowd under eight billion, and the win is what is under test.
    const calmRolls = vi.spyOn(Math, "random").mockReturnValue(0.999)
    const first = hydrate(JSON.stringify(saved), 24 * 3_600_000)
    calmRolls.mockRestore()
    expect(first.save.company?.won).toBe(true)
    expect(first.save.foreverMult).toBeCloseTo(1.25)
    expect(first.toast?.split("\n")[0]).toContain("Eight billion users")
    const again = hydrate(JSON.stringify(first.save), 25 * 3_600_000)
    expect(again.save.foreverMult).toBeCloseTo(1.25)
    expect(again.toast ?? "").not.toContain("Eight billion users")
  })
})

describe("save: from before the fork was removed", () => {
  const company = { users: { europe: 1200 }, resistance: 4, incidents: [], incidentSeq: 0, won: false, hiredUsers: 0, uptime: "oo", day: 3 }
  const founder = { track: "founder", offered: true, bridges: 2, equityCut: 0.2, requitAt: 4000, broke: true, hires: { outsourced: 4, ghost: 2 } }
  const old = () => ({ ...freshSave(0), money: 1_000_000, gigs: [1, 2, 3], company, founder })

  it("loads a founder-track save as a normal career, keeping the users and the hires", () => {
    const kept = parseSave(JSON.parse(JSON.stringify(old())))
    expect(kept).not.toBeNull()
    expect(kept).not.toHaveProperty("founder")
    expect(kept?.hires).toEqual({ outsourced: 4 })
    expect(kept?.company).toEqual(company)
  })

  it("walks the company while away with no burn and no run-out choice", () => {
    const calmRolls = vi.spyOn(Math, "random").mockReturnValue(0.999)
    const back = hydrate(JSON.stringify(old()), 600_000)
    calmRolls.mockRestore()
    expect(back.reset).toBe(false)
    expect(back.save).not.toHaveProperty("founder")
    expect(back.save.hires).toEqual({ outsourced: 4 })
    expect(back.save.company?.users["europe"]).toBeGreaterThan(0)
    expect(back.save.money).toBeGreaterThan(0)
  })

  it("reads a save that kept its hires at the top level as before", () => {
    expect(parseSave(JSON.parse(JSON.stringify({ ...freshSave(0), hires: { senior: 3 } })))?.hires).toEqual({ senior: 3 })
  })
})
