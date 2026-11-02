import { describe, expect, it } from "vitest"
import { GEAR } from "./gear.ts"
import { JOB_TIERS } from "./phases.ts"

describe("catalog order", () => {
  it("keeps the cable kit right under the keyboard that opened it, though it costs less", () => {
    expect(GEAR.slice(0, 2).map((row) => row.name)).toEqual(["Thocky keyboard", "Cable management kit"])
  })

  it("keeps jobs in id order, with an XP price that follows the XP each one asks for", () => {
    expect(JOB_TIERS.map((job) => job.id)).toEqual([...JOB_TIERS.map((job) => job.id)].sort((a, b) => a - b))
    const cost = (id: number) => JOB_TIERS.find((job) => job.id === id)?.xpCost ?? 0
    expect(cost(1)).toBe(0)
    expect(cost(5)).toBeGreaterThan(cost(4))
    expect(cost(11)).toBeGreaterThanOrEqual(cost(10))
  })
})
