import { describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { MILESTONE_FACTOR, OUTPUT_MILESTONES } from "../data/outputMilestones.ts"
import { EQUIPMENT } from "../data/phases.ts"
import { capitalIdlePerSec, clickFlat, idlePerSec, nextCost, ownedSources } from "./economy.ts"
import { milestoneTarget, nearestMilestones } from "./milestoneTargets.ts"
import { effectiveCopies, lastMilestone, milestonesCrossed, milestonesPassed, nextMilestone, outputMult } from "./outputMilestones.ts"

const none = { skills: {}, equipment: {}, owned: {}, jobs: [] as number[], gigs: [] as number[] }
const cable = EQUIPMENT.find((row) => row.id === 2)!
const keyboard = EQUIPMENT.find((row) => row.id === 1)!
const angel = CAPITAL.find((row) => row.id === 1)!

describe("the milestone table", () => {
  it("doubles at 10, 25, 50 and 100 copies", () => {
    expect(OUTPUT_MILESTONES).toEqual([10, 25, 50, 100])
    expect(MILESTONE_FACTOR).toBe(2)
  })

  it("counts the milestones a row has passed and what they multiply it by", () => {
    expect([0, 9, 10, 24, 25, 49, 50, 99, 100, 400].map(milestonesPassed)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4])
    expect([1, 10, 25, 50, 100].map(outputMult)).toEqual([1, 2, 4, 8, 16])
  })

  it("turns copies into single copies' worth of output", () => {
    expect([0, 1, 9, 10, 25, 100].map(effectiveCopies)).toEqual([0, 1, 9, 20, 100, 1600])
  })

  it("names the next and the last milestone", () => {
    expect([0, 9, 10, 99, 100].map(nextMilestone)).toEqual([10, 10, 25, 100, null])
    expect([0, 9, 10, 99, 100].map(lastMilestone)).toEqual([0, 0, 10, 50, 100])
  })

  it("lists every milestone a purchase crosses, once", () => {
    expect(milestonesCrossed(9, 10)).toEqual([10])
    expect(milestonesCrossed(10, 11)).toEqual([])
    expect(milestonesCrossed(0, 60)).toEqual([10, 25, 50])
    expect(milestonesCrossed(60, 0)).toEqual([])
  })
})

describe("milestones in the economy", () => {
  it("doubles a gear row's idle $/s at its tenth copy", () => {
    const nine = idlePerSec({ ...none, equipment: { "2": 9 } })
    const ten = idlePerSec({ ...none, equipment: { "2": 10 } })
    expect(nine).toBeCloseTo(9 * cable.cps)
    expect(ten).toBeCloseTo(20 * cable.cps)
  })

  it("doubles a gear row's click bonus too", () => {
    const base = clickFlat(none)
    expect(clickFlat({ ...none, equipment: { "1": 10 } }) - base).toBe(20 * keyboard.clickBonus)
  })

  it("doubles capital the same way, in the totals and in the sources list", () => {
    expect(capitalIdlePerSec(angel, { "1": 25 })).toBe(100 * angel.cps)
    const source = ownedSources({ ...none, owned: { "1": 25 } }).find((row) => row.key === "capital:1")
    expect(source).toMatchObject({ count: 25, idle: 100 * angel.cps })
    expect(idlePerSec({ ...none, owned: { "1": 25 } })).toBe(100 * angel.cps)
  })
})

describe("milestone targets", () => {
  it("says what the copies up to the next milestone cost, and how far along the row is", () => {
    const target = milestoneTarget("gear", cable, 8)!
    expect(target).toMatchObject({ key: "gear:2", owned: 8, at: 10, left: 2, mult: 2, fill: 0.8 })
    expect(target.cost).toBe(nextCost(cable.baseCost, 8) + nextCost(cable.baseCost, 9))
    expect(milestoneTarget("gear", cable, 12)).toMatchObject({ at: 25, mult: 4, fill: 2 / 15 })
  })

  it("has no target before the first copy or past the last milestone", () => {
    expect(milestoneTarget("gear", cable, 0)).toBeNull()
    expect(milestoneTarget("capital", angel, 100)).toBeNull()
  })

  it("puts the cheapest milestone first, and scopes to gear or capital", () => {
    const holdings = { equipment: { "2": 8, "9": 1 }, owned: { "1": 9 } }
    const all = nearestMilestones(holdings)
    expect(all.map((target) => target.key)).toEqual(["gear:2", "gear:9", "capital:1"])
    expect(all.map((target) => target.cost)).toEqual([...all.map((target) => target.cost)].sort((a, b) => a - b))
    expect(nearestMilestones(holdings, "capital").map((target) => target.key)).toEqual(["capital:1"])
    expect(nearestMilestones(holdings, "gear", 1).map((target) => target.key)).toEqual(["gear:2"])
    expect(nearestMilestones({ equipment: {}, owned: {} })).toEqual([])
  })
})
