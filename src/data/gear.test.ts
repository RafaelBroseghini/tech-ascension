import { describe, expect, it } from "vitest"
import { GEAR, GEAR_KINDS, gearSections, gearSidegrades } from "./gear.ts"
import { JOB_TIERS, jobBranches } from "./phases.ts"

const name = (id: number) => GEAR.find((row) => row.id === id)?.name

describe("gear sidegrades", () => {
  it("marks every row cheaper than the row before it in its section", () => {
    expect([...gearSidegrades(GEAR)].sort((a, b) => a - b)).toEqual([2, 5, 7, 10, 11, 13, 18, 21, 24, 27, 45, 74, 77, 79])
  })

  it("covers the cable kit under the keyboard and the KVM under the switch", () => {
    const found = gearSidegrades(GEAR)
    expect(name(2)).toBe("Cable management kit")
    expect(found.has(2)).toBe(true)
    expect(name(21)).toBe("Homelab KVM")
    expect(found.has(21)).toBe(true)
    expect(found.has(1)).toBe(false)
    expect(found.has(20)).toBe(false)
  })

  it("never looks across sections, so a new section's first row is a start, not a sidegrade", () => {
    const firstOfKind = GEAR_KINDS.map((kind) => GEAR.find((row) => row.kind === kind.id)?.id ?? 0)
    const found = gearSidegrades(GEAR)
    for (const id of firstOfKind) expect(found.has(id), String(id)).toBe(false)
  })

  it("leaves catalog order alone: sections are not sorted by price", () => {
    for (const section of gearSections(GEAR)) {
      expect(section.rows.map((row) => row.id)).toEqual(GEAR.filter((row) => row.kind === section.id).map((row) => row.id))
    }
  })
})

describe("job branches", () => {
  it("marks only QA rotation and the frontend specialist", () => {
    expect([...jobBranches(JOB_TIERS)]).toEqual([5, 11])
    expect(JOB_TIERS.find((job) => job.id === 5)?.name).toBe("QA rotation")
    expect(JOB_TIERS.find((job) => job.id === 11)?.name).toBe("Frontend specialist")
  })

  it("keeps their prices below the job above", () => {
    const cost = (id: number) => JOB_TIERS.find((job) => job.id === id)?.baseCost ?? 0
    expect(cost(5)).toBeLessThan(cost(4))
    expect(cost(11)).toBeLessThan(cost(10))
  })
})
