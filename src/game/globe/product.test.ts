import { describe, expect, it } from "vitest"
import { PERK } from "../../data/legacy.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts, settleGrowth } from "./growth.ts"
import { GROWTH_BASE, productFactsOf, productRevenueOf } from "./product.ts"
import { WIN_MULT } from "./world.ts"

const roomy = { "54": 5 }
const never = () => 0.999
const step = (hires = {}) => advanceCompany({ ...FRESH_COMPANY, users: { "americas-east": 1000 } }, growthFacts([1, 2, 3], roomy, undefined, productFactsOf(hires)), 0, 60_000, never)

describe("the product's facts", () => {
  it("grows at the base pace with nobody hired, and the hires add on top", () => {
    expect(productFactsOf({})).toMatchObject({ growthMult: GROWTH_BASE, hireBonus: 0, revenueMult: 1, payroll: 0 })
    const team = productFactsOf({ outsourced: 10 })
    expect(team.hireBonus).toBeGreaterThan(0)
    expect(team.growthMult).toBeCloseTo(GROWTH_BASE + team.hireBonus)
    expect(team.payroll).toBeGreaterThan(0)
  })

  it("scales the base and the hires' part by Viral loop, and revenue by Platform", () => {
    const perks = ["founder.growth", "founder.revenue"]
    const plain = productFactsOf({ outsourced: 10 })
    const scaled = productFactsOf({ outsourced: 10 }, { perks, prestigeTotal: 0 })
    expect(scaled.growthMult).toBeCloseTo(plain.growthMult * PERK.growth)
    expect(scaled.hireBonus).toBeCloseTo(plain.hireBonus * PERK.growth)
    expect(scaled.revenueMult).toBe(PERK.revenue)
    expect(productRevenueOf(100, perks)).toBeCloseTo(100 * PERK.revenue)
    expect(productRevenueOf(100)).toBe(100)
  })

  it("ignores a perk id that no longer exists", () => {
    expect(productFactsOf({}, { perks: ["founder.burn", "founder.bridge"], prestigeTotal: 0 })).toEqual(productFactsOf({}))
  })

  it("costs the hires' salaries over a step, and nothing with nobody hired", () => {
    expect(step().payroll).toBe(0)
    expect(step({ outsourced: 10 }).payroll).toBeCloseTo(productFactsOf({ outsourced: 10 }).payroll * 60, 6)
  })
})

describe("the win", () => {
  it("multiplies everything earned from then on by WIN_MULT, once", () => {
    const won = { state: { ...FRESH_COMPANY, won: true }, earned: 0, lost: 0, payroll: 0, notes: [] }
    expect(settleGrowth(0, 1, false, won).foreverMult).toBe(WIN_MULT)
    expect(settleGrowth(0, WIN_MULT, true, won).wonNow).toBe(false)
  })
})
