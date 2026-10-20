import { describe, expect, it } from "vitest"
import { setRegionUsers } from "./actions.ts"
import type { CompanySlice } from "./actions.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts, parseCompany, settleGrowth, stepCompany } from "./growth.ts"
import type { CompanyState } from "./growth.ts"
import {
  canHire,
  creditOf,
  endingLine,
  endingOf,
  fire,
  headcountOf,
  isEnding,
  hire,
  hireBonusOf,
  hireCost,
  hirePayrollOf,
  hirePrice,
  HIRES,
  MAX_HIRES,
  openHires,
  parseHires,
  productRole,
  SPONSOR_SHARE,
  winNote,
} from "./hires.ts"
import { FRESH_FOOTPRINT } from "./footprint.ts"
import { GROWTH_BASE, productFactsOf } from "./product.ts"
import type { Hires } from "./hires.ts"
import { REGIONS } from "../../data/regions.ts"
import { ceilingOf, totalUsers, WORLD_CEILING } from "./world.ts"

const ids = HIRES.map((h) => h.id)
const roomy = { "54": 5 }
const never = () => 0.999
const crowd = (n = 1000) => ({ ...FRESH_COMPANY, users: { "americas-east": n } })
const run = (hires: Hires, company = crowd(), ms = 60_000) => stepCompany(company, growthFacts([1, 2, 3], roomy, undefined, productFactsOf(hires)), ms, ms, never)
const team = (n: number, each = 20): Hires => Object.fromEntries(ids.slice(0, n).map((id) => [id, each]))
const nearWin = Object.fromEntries(REGIONS.map((r) => [r.id, ceilingOf(r.id) * (7.9999e9 / WORLD_CEILING)]))
const everywhere = { regions: REGIONS.map((r) => r.id), pops: ["ashburn", "frankfurt", "tokyo", "saopaulo", "lagos", "sydney", "sf"], off: [], dark: [] }
const winFacts = (hires: Hires) => growthFacts([1, 2, 3, 4, 5, 6, 7, 8], { "110": 20 }, everywhere, productFactsOf(hires))
const slice = (over: Partial<CompanySlice> = {}): CompanySlice => ({ money: 1e12, footprint: FRESH_FOOTPRINT, company: FRESH_COMPANY, hires: {}, ...over })

describe("the table", () => {
  it("is ordered cheapest first, with price, salary and growth rising", () => {
    expect(ids).toEqual(["outsourced", "bootcamp", "copypaste", "senior", "staff", "tenx", "greybeard", "codegod"])
    for (let i = 1; i < HIRES.length; i++) {
      expect(HIRES[i]!.price).toBeGreaterThan(HIRES[i - 1]!.price)
      expect(HIRES[i]!.salary).toBeGreaterThan(HIRES[i - 1]!.salary)
      expect(HIRES[i]!.growth).toBeGreaterThan(HIRES[i - 1]!.growth)
    }
  })

  it("lets a big team outgrow the base pace many times over", () => {
    expect(GROWTH_BASE + hireBonusOf(team(6, 1000))).toBeGreaterThan(GROWTH_BASE * 10)
    expect(productFactsOf(team(6, 1000)).growthMult).toBeGreaterThan(GROWTH_BASE * 10)
  })

  it("gives each kind diminishing returns, under its cap however many are hired", () => {
    for (const row of HIRES) {
      const at = (n: number) => hireBonusOf({ [row.id]: n })
      expect(at(0)).toBe(0)
      expect(at(100)).toBeGreaterThan(0)
      expect(at(200) - at(100)).toBeLessThan(at(100) - at(0))
      expect(at(MAX_HIRES)).toBeLessThanOrEqual(row.growth)
    }
  })

  it("prices each copy a little over the last", () => {
    for (const row of HIRES) {
      expect(hirePrice(row, 0)).toBe(row.price)
      expect(hirePrice(row, 1)).toBeGreaterThan(row.price)
      expect(hirePrice(row, 1000)).toBeGreaterThan(hirePrice(row, 999))
      expect(Number.isFinite(hirePrice(row, MAX_HIRES))).toBe(true)
    }
    expect(hireCost(HIRES[0]!, 5, 3)).toBe(hirePrice(HIRES[0]!, 5) + hirePrice(HIRES[0]!, 6) + hirePrice(HIRES[0]!, 7))
  })
})

describe("the hire gate", () => {
  const outsourced = HIRES[0]!

  it("hires in an open row, with the money for one", () => {
    expect(canHire({}, 1e12, "outsourced")).toBe(true)
    expect(canHire({}, 1e12, "senior")).toBe(false)
  })

  it("charges each copy's price, and a kind is hired again and again", () => {
    const first = hire(slice({ money: 100_000 }), "outsourced")!
    expect(first.money).toBe(100_000 - outsourced.price)
    expect(first.hires).toEqual({ outsourced: 1 })
    const second = hire({ money: 100_000, hires: first.hires }, "outsourced")!
    expect(second.money).toBe(100_000 - hirePrice(outsourced, 1))
    expect(second.hires).toEqual({ outsourced: 2 })
  })

  it("refuses a short purse and leaves the money alone", () => {
    expect(hire(slice({ money: outsourced.price - 1 }), "outsourced")).toBeNull()
    expect(hire(slice({ money: outsourced.price }), "outsourced")).not.toBeNull()
  })

  it("hires one at a time, however much money there is", () => {
    const one = hire(slice({ money: 1e9 }), "outsourced")!
    expect(one.hires.outsourced).toBe(1)
    expect(one.money).toBe(1e9 - hireCost(outsourced, 0, 1))
  })

  it("stops at the cap", () => {
    const full = { outsourced: MAX_HIRES - 1 }
    expect(hire({ money: 1e30, hires: full }, "outsourced")!.hires.outsourced).toBe(MAX_HIRES)
    expect(hire({ money: 1e30, hires: { outsourced: MAX_HIRES } }, "outsourced")).toBeNull()
  })

  it("opens a row once the one above it has a hire, cheapest first", () => {
    expect(hire(slice(), "senior")).toBeNull()
    expect(openHires({}).map((h) => h.id)).toEqual(["outsourced"])
    expect(openHires({ outsourced: 1 }).map((h) => h.id)).toEqual(["outsourced", "bootcamp"])
    expect(openHires({ outsourced: 3, bootcamp: 1, copypaste: 1 }).map((h) => h.id)).toEqual(["outsourced", "bootcamp", "copypaste", "senior"])
    expect(openHires(team(8)).map((h) => h.id)).toEqual(ids)
    expect(hire(slice({ hires: { outsourced: 1 } }), "bootcamp")).not.toBeNull()
  })

  it("fires one at a time, with no refund", () => {
    const f: Hires = { outsourced: 12, bootcamp: 3 }
    expect(fire({ hires: f }, "outsourced")?.hires).toEqual({ outsourced: 11, bootcamp: 3 })
    expect(fire({ hires: { bootcamp: 1 } }, "bootcamp")?.hires).toEqual({})
    expect(fire({ hires: f }, "bootcamp")?.hires).toEqual({ outsourced: 12, bootcamp: 2 })
    expect(fire({ hires: f }, "senior")).toBeNull()
    expect(fire({ hires: f }, "nobody")).toBeNull()
    expect(hirePayrollOf(fire({ hires: f }, "outsourced")!.hires)).toBe(11 * HIRES[0]!.salary + 3 * HIRES[1]!.salary)
  })

  it("keeps the rows below a kind fired to nobody open", () => {
    expect(openHires({ bootcamp: 2 }).map((h) => h.id)).toEqual(["outsourced", "bootcamp", "copypaste"])
    expect(hire(slice({ hires: { bootcamp: 2 } }), "outsourced")).not.toBeNull()
  })

  it("is saved as counts: unknown ids, fractions, negatives and the old list are dropped, and counts are capped", () => {
    expect(parseHires({ outsourced: 12, bootcamp: 3 })).toEqual({ outsourced: 12, bootcamp: 3 })
    expect(parseHires({ outsourced: 2.5, bootcamp: -1, copypaste: 0, ceo: 4, senior: "9", tenx: 99_999_999 })).toEqual({ tenx: MAX_HIRES })
    expect(parseHires(["outsourced", "bootcamp"])).toEqual({})
    expect(parseHires("outsourced")).toEqual({})
    expect(parseHires(null)).toEqual({})
    expect(headcountOf({ outsourced: 12, bootcamp: 3 })).toBe(15)
  })
})

describe("salaries as a cost", () => {
  it("are paid every second, in the same figure the settle subtracts", () => {
    const step = run(team(3))
    expect(step.payroll).toBeCloseTo(hirePayrollOf(team(3)) * 60, 6)
    expect(productFactsOf(team(3)).payroll).toBe(hirePayrollOf(team(3)))
    expect(run({}).payroll).toBe(0)
  })

  it("floor the balance at 0 and the hires stay", () => {
    const step = run(team(2), crowd(), 60_000)
    expect(settleGrowth(1, 1, false, step).money).toBe(0)
  })

  it("add their growth to the base pace", () => {
    expect(productFactsOf(team(3)).growthMult).toBeCloseTo(GROWTH_BASE + hireBonusOf(team(3)))
  })
})

describe("who grew the product", () => {
  it("credits the hires with their share of each step's growth, in proportion to the bonus", () => {
    const f = team(3)
    const facts = productFactsOf(f)
    const grown = run(f)
    const added = totalUsers(grown.state.users) - 1000
    expect(grown.state.hiredUsers).toBeCloseTo((added * facts.hireBonus) / facts.growthMult, 6)
    expect(run({}).state.hiredUsers).toBe(0)
  })

  it("gives a bigger team a bigger share, and never more than the users", () => {
    const small = creditOf(run(team(1)).state).hiredShare
    const big = creditOf(run(team(6)).state).hiredShare
    expect(big).toBeGreaterThan(small)
    let company: CompanyState = crowd(10)
    const facts = growthFacts([1, 2, 3], roomy, undefined, productFactsOf(team(6)))
    for (let t = 0; t < 40; t++) {
      company = advanceCompany(company, facts, t * 3_600_000, (t + 1) * 3_600_000, never).state
      expect(company.hiredUsers).toBeLessThanOrEqual(totalUsers(company.users))
    }
    expect(creditOf(company).hiredShare).toBeLessThanOrEqual(1)
  })

  it("counts the base pace as the player's, and only what the hires add as theirs", () => {
    const grown = run(team(2)).state
    const bonus = hireBonusOf(team(2))
    expect(grown.hiredUsers / (totalUsers(grown.users) - 1000)).toBeCloseTo(bonus / (GROWTH_BASE + bonus), 6)
  })

  it("loses its share along with the users it came from", () => {
    const company = { ...crowd(1000), hiredUsers: 800 }
    const smaller = setRegionUsers(slice({ company }), "americas-east", 500)!.company!
    expect(smaller.hiredUsers).toBeCloseTo(400)
    const bigger = setRegionUsers(slice({ company }), "americas-east", 5000)!.company!
    expect(bigger.hiredUsers).toBe(800)
    expect(creditOf({ users: {}, hiredUsers: 5 }).hiredShare).toBe(0)
  })

  it("is saved defensively, never above the users, and the ending only once won", () => {
    const base = { users: { europe: 100 }, resistance: 0, incidents: [], incidentSeq: 0, uptime: "", day: -1 }
    expect(parseCompany({ ...base, won: false })?.hiredUsers).toBe(0)
    expect(parseCompany({ ...base, won: false, hiredUsers: 70 })?.hiredUsers).toBe(70)
    expect(parseCompany({ ...base, won: false, hiredUsers: 7000 })?.hiredUsers).toBe(100)
    expect(parseCompany({ ...base, won: false, hiredUsers: "lots" })?.hiredUsers).toBe(0)
    expect(parseCompany({ ...base, won: false, ending: "sponsor" })).not.toHaveProperty("ending")
    expect(parseCompany({ ...base, won: true, ending: "sponsor" })?.ending).toBe("sponsor")
    expect(parseCompany({ ...base, won: true, ending: "mogul" })).not.toHaveProperty("ending")
  })
})

describe("the endings", () => {
  it("gives the night owl the win at half the users from hires or less, and the sponsor past it", () => {
    expect(endingOf(0)).toBe("nightOwl")
    expect(endingOf(SPONSOR_SHARE)).toBe("nightOwl")
    expect(endingOf(SPONSOR_SHARE + 1e-9)).toBe("sponsor")
    expect(endingOf(0.9)).toBe("sponsor")
  })

  it("is picked once, when the win latches, and written in the journal note", () => {
    const near = { ...FRESH_COMPANY, users: nearWin, hiredUsers: 7.9999e9 * 0.9 }
    const facts = winFacts(team(6))
    const won = stepCompany(near, facts, 60_000, 60_000, never)
    expect(won.state.won).toBe(true)
    expect(won.state.ending).toBe("sponsor")
    expect(won.notes.find((n) => n.ref === "world:won")?.data).toMatchObject({ ending: "sponsor" })
    const later = stepCompany(won.state, winFacts({}), 60_000, 120_000, never)
    expect(later.state.ending).toBe("sponsor")
  })

  it("reads a win with no hires as the night owl", () => {
    const near = { ...FRESH_COMPANY, users: nearWin }
    expect(stepCompany(near, winFacts({}), 60_000, 60_000, never).state.ending).toBe("nightOwl")
  })

  it("has the two lines, and the LinkedOut role with the product title", () => {
    expect(endingLine("sponsor")).toBe("Eight billion users. Your team was incredible. You were in a lot of their standups.")
    expect(endingLine("nightOwl")).toBe("Eight billion users, on nights and weekends. Go to bed.")
    expect(winNote("nightOwl", 1.25)).toContain("×1.25")
    expect(productRole("sponsor", "Otterly")).toBe("Executive sponsor, Otterly")
    expect(productRole("nightOwl", "Otterly")).toBe("Founder, Otterly")
  })

  it("drops an ending from before the fork went, so the win reads with no line", () => {
    expect(isEnding("founder")).toBe(false)
    expect(endingLine(undefined)).toBe("Eight billion users. The world is yours.")
  })
})
