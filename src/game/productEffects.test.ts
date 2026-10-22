import { describe, expect, it } from "vitest"
import { HOME_REGION_ID } from "../data/regions.ts"
import { effectsOf, gpuGrowthOf, NO_EFFECTS, SPECIALIZATIONS } from "../data/specializations.ts"
import { GEAR } from "../data/gear.ts"
import type { SpecId } from "../data/specializations.ts"
import { gpusHeld, icRowsHeld } from "./build.ts"
import { FRESH_FOOTPRINT } from "./globe/footprint.ts"
import { FRESH_COMPANY, growthFacts, stepCompany } from "./globe/growth.ts"
import type { GrowthFacts } from "./globe/growth.ts"
import { IC_GROWTH_PER_ROW, NO_BUILD, productFactsOf, productRevenueOf } from "./globe/product.ts"
import { incidentRate } from "./globe/world.ts"

const build = (spec: SpecId | null, icRows = 0, gpus = 0) => ({ ...NO_BUILD, spec, icRows, gpus })
const IC_ROWS = [16, 17, 19, 23, 24]

describe("what a specialization does to the product", () => {
  it("changes nothing before the pick, for Frontend and for AI", () => {
    expect(effectsOf(null)).toEqual(NO_EFFECTS)
    expect(effectsOf("frontend")).toEqual(NO_EFFECTS)
    expect(effectsOf("ai")).toEqual(NO_EFFECTS)
    expect(productFactsOf({}, undefined, build(null))).toEqual(productFactsOf({}))
  })

  it("keeps every factor positive", () => {
    for (const spec of SPECIALIZATIONS) for (const value of Object.values(effectsOf(spec.id))) expect(value).toBeGreaterThan(0)
  })

  it("scales growth and revenue for Backend and the team's share with it", () => {
    const plain = productFactsOf({ senior: 40 })
    const backend = productFactsOf({ senior: 40 }, undefined, build("backend"))
    expect(backend.growthMult).toBeCloseTo(plain.growthMult * 0.85, 12)
    expect(backend.hireBonus).toBeCloseTo(plain.hireBonus * 0.85, 12)
    expect(backend.hireBonus / backend.growthMult).toBeCloseTo(plain.hireBonus / plain.growthMult, 12)
    expect(backend.revenueMult).toBeCloseTo(1.3, 12)
  })

  it("shows the revenue the facts pay, in the displayed rate", () => {
    expect(productRevenueOf(100, undefined, "backend")).toBeCloseTo(100 * productFactsOf({}, undefined, build("backend")).revenueMult, 12)
    expect(productRevenueOf(100)).toBe(100)
    expect(productRevenueOf(100, undefined, "infra")).toBe(100)
  })

  it("carries the drop, incident and seed factors", () => {
    expect(productFactsOf({}, undefined, build("infra")).dropsMult).toBe(0.5)
    expect(productFactsOf({}, undefined, build("security")).incidentMult).toBe(0.6)
    expect(productFactsOf({}, undefined, build("fde")).seedMult).toBe(3)
  })
})

describe("an AI build's growth needs GPUs", () => {
  it("runs slow with none, climbs with each GPU and levels off, and is 1 for every other build", () => {
    expect(gpuGrowthOf("ai", 0)).toBeCloseTo(0.6, 12)
    expect(gpuGrowthOf("ai", 12)).toBeGreaterThan(gpuGrowthOf("ai", 4))
    expect(gpuGrowthOf("ai", 500)).toBeCloseTo(1.5, 3)
    expect(gpuGrowthOf("ai", 500)).toBeLessThan(1.5001)
    for (const other of ["backend", "frontend", "infra", "fde", "security", null] as const) expect(gpuGrowthOf(other, 50)).toBe(1)
  })

  it("scales the product's growth and the team's with it, and leaves the revenue alone", () => {
    const none = productFactsOf({ senior: 40 }, undefined, build("ai", 0, 0))
    const many = productFactsOf({ senior: 40 }, undefined, build("ai", 0, 40))
    expect(many.growthMult / none.growthMult).toBeCloseTo(gpuGrowthOf("ai", 40) / gpuGrowthOf("ai", 0), 9)
    expect(many.hireBonus / many.growthMult).toBeCloseTo(none.hireBonus / none.growthMult, 9)
    expect(many.revenueMult).toBe(none.revenueMult)
    expect(productFactsOf({}, undefined, build("backend", 0, 40)).growthMult).toBe(productFactsOf({}, undefined, build("backend", 0, 0)).growthMult)
  })

  it("counts copies of the GPU gear rows, and nothing else", () => {
    const gpuRows = GEAR.filter((row) => row.kind === "gpu")
    expect(gpuRows.length).toBeGreaterThan(0)
    expect(gpusHeld(undefined)).toBe(0)
    expect(gpusHeld({})).toBe(0)
    expect(gpusHeld({ [String(gpuRows[0]!.id)]: 3, [String(gpuRows[1]!.id)]: 2, "1": 9 })).toBe(5)
  })
})

describe("an IC's own growth", () => {
  it("adds a step for each IC row held and never counts as the team", () => {
    const none = productFactsOf({}, undefined, build(null, 0))
    const five = productFactsOf({}, undefined, build(null, 5))
    expect(five.growthMult - none.growthMult).toBeCloseTo(5 * IC_GROWTH_PER_ROW, 12)
    expect(five.hireBonus).toBe(0)
  })

  it("counts the IC line's rows and no others", () => {
    expect(icRowsHeld([])).toBe(0)
    expect(icRowsHeld([1, 2, 3, 14, 15])).toBe(0)
    expect(icRowsHeld([...IC_ROWS, 18, 20])).toBe(IC_ROWS.length)
  })
})

describe("in the growth step", () => {
  const facts = (spec: SpecId | null, overrides: Partial<GrowthFacts> = {}): GrowthFacts => ({
    seeds: { [HOME_REGION_ID]: 10_000 },
    reach: { [HOME_REGION_ID]: 1 },
    live: { [HOME_REGION_ID]: true },
    equipment: {},
    product: productFactsOf({}, undefined, build(spec)),
    ...overrides,
  })
  const users = { [HOME_REGION_ID]: 400_000 }
  const company = { ...FRESH_COMPANY, users }
  const run = (spec: SpecId | null, rand = () => 0.999, ms = 60_000) => stepCompany(company, facts(spec), ms, ms, rand)

  it("halves what dropped requests cost for Infra", () => {
    // One second, so the crowd the drops spare has not yet grown the demand.
    const plain = run(null, undefined, 1000)
    const infra = run("infra", undefined, 1000)
    expect(plain.lost).toBeGreaterThan(0)
    expect(infra.lost / plain.lost).toBeCloseTo(0.5, 6)
    expect(infra.state.users[HOME_REGION_ID]!).toBeGreaterThan(plain.state.users[HOME_REGION_ID]!)
  })

  it("throws incidents less often for Security", () => {
    // A roll lands when it falls under the chance in the step: pick one between the two chances.
    const chance = incidentRate(0) * 60
    const roll = () => chance * 0.8
    expect(run(null, roll).state.incidents.length).toBe(1)
    expect(run("security", roll).state.incidents.length).toBe(0)
  })

  it("seeds each gig's region with more for FDE", () => {
    const grown = (spec: SpecId | null) => stepCompany({ ...FRESH_COMPANY, users: { [HOME_REGION_ID]: 50 } }, facts(spec, { equipment: {} }), 60_000, 60_000, () => 0.999).state.users[HOME_REGION_ID] ?? 0
    expect(grown("fde")).toBeGreaterThan(grown(null))
  })

  it("is not served from a stale memo after a pick", () => {
    const gigs = [1]
    const equipment = {}
    const before = growthFacts(gigs, equipment, FRESH_FOOTPRINT, productFactsOf({}, undefined, build("backend")))
    const infra = growthFacts(gigs, equipment, FRESH_FOOTPRINT, productFactsOf({}, undefined, build("infra")))
    const security = growthFacts(gigs, equipment, FRESH_FOOTPRINT, productFactsOf({}, undefined, build("security")))
    const fde = growthFacts(gigs, equipment, FRESH_FOOTPRINT, productFactsOf({}, undefined, build("fde")))
    expect(before.product?.dropsMult).toBe(1)
    expect(infra.product?.dropsMult).toBe(0.5)
    expect(security.product?.incidentMult).toBe(0.6)
    expect(fde.product?.seedMult).toBe(3)
  })
})
