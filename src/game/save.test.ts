import { describe, expect, it } from "vitest"
import { freshSave, hydrate, parseSave, SAVE_VERSION } from "./save.ts"

describe("save: a block this build does not know", () => {
  it("still loads, and the unknown block is dropped", () => {
    const raw = { ...freshSave(1_000), retiredBlock: { "hello-server": { verdict: "hire", attempts: 1, design: { nodes: [], edges: [] } } } }
    const text = JSON.stringify(raw)
    expect(parseSave(JSON.parse(text))).not.toHaveProperty("retiredBlock")
    expect(hydrate(text, 1_000).save).not.toHaveProperty("retiredBlock")
  })

  it("drops the blocks of a company that is gone, without wiping the career", () => {
    const raw = {
      ...freshSave(1_000),
      money: 50,
      company: { users: { europe: 1200 }, resistance: 4, incidents: [], incidentSeq: 0, won: false, hiredUsers: 0, uptime: "oo", day: 3 },
      footprint: { regions: ["europe"], pops: [] },
      hires: { outsourced: 4 },
    }
    const loaded = parseSave(JSON.parse(JSON.stringify(raw)))
    expect(loaded?.money).toBe(50)
    for (const key of ["company", "footprint", "hires"]) expect(loaded, key).not.toHaveProperty(key)
  })
})

describe("save: the version", () => {
  it("wipes a save from another version, with no migration", () => {
    const old = JSON.stringify({ ...freshSave(1_000), version: SAVE_VERSION - 1, money: 99 })
    expect(parseSave(JSON.parse(old))).toBeNull()
    const back = hydrate(old, 2_000)
    expect(back.reset).toBe(true)
    expect(back.save.money).toBe(0)
  })

  it("keeps the handle but no product name on a fresh save", () => {
    const save = freshSave(0)
    expect(save.profile).toEqual({ handle: expect.any(String), chosen: false })
  })
})

describe("save: time away", () => {
  it("credits the idle income once, up to the cap, and nothing past the savedAt", () => {
    const saved = { ...freshSave(0), jobs: [1], gigs: [1, 2, 3, 4, 5, 6] }
    const back = hydrate(JSON.stringify(saved), 3_600_000)
    expect(back.save.money).toBeGreaterThan(0)
    expect(back.save.savedAt).toBe(3_600_000)
    expect(hydrate(JSON.stringify(saved), 0).save.money).toBe(0)
  })
})
