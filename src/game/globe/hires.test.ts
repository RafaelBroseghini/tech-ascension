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
  headcountOf,
  hire,
  hireBonusOf,
  hireCost,
  hirePayrollOf,
  hirePrice,
  HIRES,
  MAX_HIRES,
  maxHires,
  openHires,
  parseHires,
  productRole,
  SPONSOR_SHARE,
  winNote,
} from "./hires.ts"
import { FRESH_FOOTPRINT } from "./footprint.ts"
import { FOUNDER_GROWTH, FRESH_FOUNDER, goFullTime, LADDER_GROWTH, returnToLadder, trackFactsOf } from "./track.ts"
import type { FounderState } from "./track.ts"
import { REGIONS } from "../../data/regions.ts"
import { ceilingOf, totalUsers, WORLD_CEILING } from "./world.ts"

const ids = HIRES.map((h) => h.id)
const roomy = { "54": 5 }
const never = () => 0.999
const crowd = (n = 1000) => ({ ...FRESH_COMPANY, users: { "americas-east": n } })
const run = (f: FounderState, company = crowd(), ms = 60_000) => stepCompany(company, growthFacts([1, 2, 3], roomy, undefined, trackFactsOf(f)), ms, ms, never)
const team = (n: number, each = 20): FounderState => ({ ...FRESH_FOUNDER, hires: Object.fromEntries(ids.slice(0, n).map((id) => [id, each])) })
const nearWin = Object.fromEntries(REGIONS.map((r) => [r.id, ceilingOf(r.id) * (6.9999e9 / WORLD_CEILING)]))
const everywhere = { regions: REGIONS.map((r) => r.id), pops: ["ashburn", "frankfurt", "tokyo", "saopaulo", "lagos", "sydney", "sf"], off: [], dark: [] }
const winFacts = (f: FounderState) => growthFacts([1, 2, 3, 4, 5, 6, 7, 8], { "110": 20 }, everywhere, trackFactsOf(f))
const slice = (over: Partial<CompanySlice> = {}): CompanySlice => ({ money: 1e12, footprint: FRESH_FOOTPRINT, company: FRESH_COMPANY, founder: FRESH_FOUNDER, ...over })

describe("the table", () => {
  it("is ordered cheapest first, with price, salary and growth rising", () => {
    expect(ids).toEqual(["outsourced", "bootcamp", "copypaste", "senior", "staff", "tenx", "greybeard", "codegod"])
    for (let i = 1; i < HIRES.length; i++) {
      expect(HIRES[i]!.price).toBeGreaterThan(HIRES[i - 1]!.price)
      expect(HIRES[i]!.salary).toBeGreaterThan(HIRES[i - 1]!.salary)
      expect(HIRES[i]!.growth).toBeGreaterThan(HIRES[i - 1]!.growth)
    }
  })

  it("lets a big team grow the ladder past a founder", () => {
    expect(LADDER_GROWTH + hireBonusOf(team(6, 1000).hires)).toBeGreaterThan(FOUNDER_GROWTH)
    expect(trackFactsOf(team(6, 1000)).growthMult).toBeGreaterThan(FOUNDER_GROWTH)
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

  it("hires on the ladder only", () => {
    expect(canHire("ladder", {}, 1e12, "outsourced")).toBe(true)
    expect(canHire("founder", {}, 1e12, "outsourced")).toBe(false)
    expect(hire(slice({ founder: goFullTime(FRESH_FOUNDER) }), "outsourced")).toBeNull()
  })

  it("charges each copy's price, and a kind is hired again and again", () => {
    const first = hire(slice({ money: 100_000 }), "outsourced")!
    expect(first.money).toBe(100_000 - outsourced.price)
    expect(first.founder.hires).toEqual({ outsourced: 1 })
    const second = hire({ money: 100_000, founder: first.founder }, "outsourced")!
    expect(second.money).toBe(100_000 - hirePrice(outsourced, 1))
    expect(second.founder.hires).toEqual({ outsourced: 2 })
  })

  it("refuses a short purse and leaves the money alone", () => {
    expect(hire(slice({ money: outsourced.price - 1 }), "outsourced")).toBeNull()
    expect(hire(slice({ money: outsourced.price }), "outsourced")).not.toBeNull()
  })

  it("buys up to the amount asked, as many as the money pays for", () => {
    const five = hire(slice({ money: 1e9 }), "outsourced", 5)!
    expect(five.founder.hires.outsourced).toBe(5)
    expect(five.money).toBe(1e9 - hireCost(outsourced, 0, 5))
    const short = hire(slice({ money: outsourced.price * 2.5 }), "outsourced", 10)!
    expect(short.founder.hires.outsourced).toBe(2)
    const max = hire(slice({ money: 1e9 }), "outsourced", "max")!
    const n = max.founder.hires.outsourced!
    expect(n).toBe(maxHires(outsourced, 0, 1e9))
    expect(max.money).toBeGreaterThanOrEqual(0)
    expect(hireCost(outsourced, 0, n + 1)).toBeGreaterThan(1e9)
  })

  it("stops at the cap", () => {
    const full = { ...FRESH_FOUNDER, hires: { outsourced: MAX_HIRES - 1 } }
    expect(hire({ money: 1e30, founder: full }, "outsourced", 5)!.founder.hires.outsourced).toBe(MAX_HIRES)
    expect(hire({ money: 1e30, founder: { ...full, hires: { outsourced: MAX_HIRES } } }, "outsourced")).toBeNull()
  })

  it("opens a row once the one above it has a hire, cheapest first", () => {
    expect(hire(slice(), "senior")).toBeNull()
    expect(openHires({}).map((h) => h.id)).toEqual(["outsourced"])
    expect(openHires({ outsourced: 1 }).map((h) => h.id)).toEqual(["outsourced", "bootcamp"])
    expect(openHires({ outsourced: 3, bootcamp: 1, copypaste: 1 }).map((h) => h.id)).toEqual(["outsourced", "bootcamp", "copypaste", "senior"])
    expect(openHires(team(8).hires).map((h) => h.id)).toEqual(ids)
    expect(hire(slice({ founder: { ...FRESH_FOUNDER, hires: { outsourced: 1 } } }), "bootcamp")).not.toBeNull()
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
  it("are paid every second on the ladder, in the same figure the settle subtracts", () => {
    const step = run(team(3))
    expect(step.burned).toBeCloseTo(hirePayrollOf(team(3).hires) * 60, 6)
    expect(run(FRESH_FOUNDER).burned).toBe(0)
  })

  it("floor the ladder at 0 and the hires stay", () => {
    const step = run(team(2), crowd(), 60_000)
    const settled = settleGrowth(1, 1, false, step, { track: "ladder", broke: false, away: false })
    expect(settled.money).toBe(0)
    expect(settled.broke).toBe(false)
  })

  it("join the founder's burn, and stop with it when the founder runs out", () => {
    const f = { ...goFullTime(team(2)) }
    expect(trackFactsOf(f).payroll).toBe(hirePayrollOf(f.hires))
    expect(run(f).burned).toBeGreaterThan(hirePayrollOf(f.hires) * 60)
    expect(run({ ...f, broke: true }).burned).toBe(0)
    expect(trackFactsOf({ ...f, broke: true }).payroll).toBe(0)
  })
})

describe("a founder keeps the people already hired", () => {
  it("keeps the hires and their bonus through the quit and a return, but hires no more", () => {
    const quit = goFullTime(team(3))
    expect(quit.hires).toEqual(team(3).hires)
    expect(trackFactsOf(quit).growthMult).toBeCloseTo(FOUNDER_GROWTH + hireBonusOf(quit.hires))
    expect(hire({ money: 1e12, founder: quit }, "senior")).toBeNull()
    const back = returnToLadder(quit, 5_000, [1, 2], false)!.founder
    expect(back.hires).toEqual(quit.hires)
    expect(hire({ money: 1e12, founder: back }, "senior")).not.toBeNull()
  })
})

describe("who grew the product", () => {
  it("credits the hires with their share of each step's growth, in proportion to the bonus", () => {
    const f = team(3)
    const facts = trackFactsOf(f)
    const grown = run(f)
    const added = totalUsers(grown.state.users) - 1000
    expect(grown.state.hiredUsers).toBeCloseTo((added * facts.hireBonus) / facts.growthMult, 6)
    expect(run(FRESH_FOUNDER).state.hiredUsers).toBe(0)
    expect(run(goFullTime(FRESH_FOUNDER)).state.hiredUsers).toBe(0)
  })

  it("gives a bigger team a bigger share, and never more than the users", () => {
    const small = creditOf(run(team(1)).state).hiredShare
    const big = creditOf(run(team(6)).state).hiredShare
    expect(big).toBeGreaterThan(small)
    let company: CompanyState = crowd(10)
    const facts = growthFacts([1, 2, 3], roomy, undefined, trackFactsOf(team(6)))
    for (let t = 0; t < 40; t++) {
      company = advanceCompany(company, facts, t * 3_600_000, (t + 1) * 3_600_000, never).state
      expect(company.hiredUsers).toBeLessThanOrEqual(totalUsers(company.users))
    }
    expect(creditOf(company).hiredShare).toBeLessThanOrEqual(1)
  })

  it("counts a founder's growth after quitting as theirs, except what the kept hires add", () => {
    const kept = goFullTime(team(2))
    const grown = run(kept).state
    const bonus = hireBonusOf(kept.hires)
    expect(grown.hiredUsers / (totalUsers(grown.users) - 1000)).toBeCloseTo(bonus / (FOUNDER_GROWTH + bonus), 6)
    expect(creditOf(grown).hiredShare).toBeLessThan(0.5)
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
  it("gives the founder their own ending when the team did half the work or less", () => {
    expect(endingOf("founder", 0)).toBe("founder")
    expect(endingOf("founder", SPONSOR_SHARE)).toBe("founder")
  })

  it("gives the ladder its night-owl ending at half or less", () => {
    expect(endingOf("ladder", 0)).toBe("nightOwl")
    expect(endingOf("ladder", SPONSOR_SHARE)).toBe("nightOwl")
  })

  it("goes to the sponsor line past half, on either track", () => {
    expect(endingOf("ladder", SPONSOR_SHARE + 1e-9)).toBe("sponsor")
    expect(endingOf("founder", 0.9)).toBe("sponsor")
  })

  it("is picked once, when the win latches, and written in the journal note", () => {
    const near = { ...FRESH_COMPANY, users: nearWin, hiredUsers: 6.9999e9 * 0.9 }
    const facts = winFacts(team(6))
    const won = stepCompany(near, facts, 60_000, 60_000, never)
    expect(won.state.won).toBe(true)
    expect(won.state.ending).toBe("sponsor")
    expect(won.notes.find((n) => n.ref === "world:won")?.data).toMatchObject({ ending: "sponsor" })
    const later = stepCompany(won.state, winFacts(FRESH_FOUNDER), 60_000, 120_000, never)
    expect(later.state.ending).toBe("sponsor")
  })

  it("reads a founder's win and a ladder's night-owl win from who grew it", () => {
    const near = { ...FRESH_COMPANY, users: nearWin }
    const win = (f: FounderState) => stepCompany(near, winFacts(f), 60_000, 60_000, never).state.ending
    expect(win(goFullTime(FRESH_FOUNDER))).toBe("founder")
    expect(win(FRESH_FOUNDER)).toBe("nightOwl")
  })

  it("has the three lines, the product on the founder's, and the LinkedOut role", () => {
    expect(endingLine("founder", "Otterly")).toBe("Seven billion people use Otterly. You built this.")
    expect(endingLine("sponsor", "Otterly")).toBe("Seven billion users. Your team was incredible. You were in a lot of their standups.")
    expect(endingLine("nightOwl", "Otterly")).toBe("Seven billion users, on nights and weekends. Go to bed.")
    expect(winNote("founder", "Otterly", 1.5)).toContain("×1.5")
    expect(productRole("sponsor", "Otterly")).toBe("Executive sponsor, Otterly")
    expect(productRole("nightOwl", "Otterly")).toBe("Founder, Otterly")
    expect(productRole("founder", "Otterly")).toBe("Founder, Otterly")
  })
})
