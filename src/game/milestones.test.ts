import { describe, expect, it } from "vitest"
import { firstNewMilestone } from "./milestones.ts"

describe("balance milestones", () => {
  it("fires once per threshold", () => {
    const seen = new Set<string>()
    const hit = firstNewMilestone({ money: 1000, xpTotal: 0 }, { money: 1400, xpTotal: 0 }, seen)
    expect(hit?.id).toBe("money-1337")
    seen.add(hit!.id)
    expect(firstNewMilestone({ money: 1400, xpTotal: 0 }, { money: 2000, xpTotal: 0 }, seen)).toBeNull()
  })

  it("tracks lifetime XP separately from money", () => {
    const hit = firstNewMilestone({ money: 0, xpTotal: 60_000 }, { money: 0, xpTotal: 70_000 }, new Set())
    expect(hit?.id).toBe("xp-69420")
  })
})
