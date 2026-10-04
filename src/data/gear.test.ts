import { describe, expect, it } from "vitest"
import { GEAR, gearSections } from "./gear.ts"
import { JOB_TIERS } from "./phases.ts"

describe("catalog order", () => {
  it("keeps gear in catalog order inside each section, never sorted by price", () => {
    for (const section of gearSections(GEAR)) {
      expect(section.rows.map((row) => row.id)).toEqual(GEAR.filter((row) => row.kind === section.id).map((row) => row.id))
    }
    // the cable kit stays right under the keyboard that opened it, though it costs less
    const desk = gearSections(GEAR).find((section) => section.id === "desk")?.rows.map((row) => row.name)
    expect(desk?.slice(0, 2)).toEqual(["Thocky keyboard", "Cable management kit"])
  })

  it("keeps jobs in id order with their prices as they are", () => {
    expect(JOB_TIERS.map((job) => job.id)).toEqual([...JOB_TIERS.map((job) => job.id)].sort((a, b) => a - b))
    const cost = (id: number) => JOB_TIERS.find((job) => job.id === id)?.baseCost ?? 0
    expect(cost(5)).toBeLessThan(cost(4))
    expect(cost(11)).toBeLessThan(cost(10))
  })
})
