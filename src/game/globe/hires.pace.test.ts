import { describe, expect, it } from "vitest"
import { REGIONS } from "../../data/regions.ts"
import { FRESH_COMPANY, growthFacts, stepCompany, STEP_MS } from "./growth.ts"
import type { CompanyState } from "./growth.ts"
import { creditOf, headcountOf, HIRES, hireBonusOf, hirePrice, MAX_HIRES } from "./hires.ts"
import type { Hires } from "./hires.ts"
import { productFactsOf } from "./product.ts"
import { totalUsers } from "./world.ts"

/** Dollars a second the day job pays: a Senior SWE. */
const SALARY = 200
const START_USERS = 1000
const DAY = 86_400_000
const everywhere = { regions: REGIONS.map((r) => r.id), pops: ["ashburn", "frankfurt", "tokyo", "saopaulo", "lagos", "sydney", "sf"], off: [], dark: [] }
const never = () => 0.999

type Plan = "alone" | "hiring"

function race(plan: Plan, limitDays = 4000) {
  let company: CompanyState = { ...FRESH_COMPANY, users: { "americas-east": START_USERS } }
  let hires: Hires = {}
  let money = 0
  let at = 0
  while (!company.won && at < limitDays * DAY) {
    if (plan === "hiring") {
      for (;;) {
        // The cheapest growth per dollar among the rows open, kept to a payroll the product can carry.
        let best: { id: string; price: number; ratio: number } | null = null
        for (let i = 0; i < HIRES.length; i++) {
          const row = HIRES[i]!
          const held = hires[row.id] ?? 0
          if (held >= MAX_HIRES) continue
          const price = hirePrice(row, held)
          const next: Hires = { ...hires, [row.id]: held + 1 }
          const ratio = (hireBonusOf(next) - hireBonusOf(hires)) / price
          if (!best || ratio > best.ratio) best = { id: row.id, price, ratio }
          if (held === 0) break
        }
        if (!best || money < best.price) break
        money -= best.price
        hires = { ...hires, [best.id]: (hires[best.id] ?? 0) + 1 }
      }
    }
    const facts = growthFacts([1, 2, 3, 4, 5, 6, 7, 8], { "110": 3 }, everywhere, productFactsOf(hires))
    const step = stepCompany(company, facts, STEP_MS, at + STEP_MS, never)
    company = step.state
    money = Math.max(0, money + step.earned - step.lost - step.payroll + SALARY * 60)
    at += STEP_MS
  }
  return { days: at / DAY, won: company.won, ending: company.ending, share: creditOf(company).hiredShare, hires, users: totalUsers(company.users) }
}

/** Two careers from 1,000 users to the world, on the real growth model, with the same serving gear and no incidents. */
describe("the pace of hiring", () => {
  const alone = race("alone")
  const hiring = race("hiring")

  it("reaches the world either way", () => {
    expect([alone.won, hiring.won]).toEqual([true, true])
  })

  // The player's own pace is about eight times faster than when the four was set, and both careers end on the same
  // resistance-slowed tail, so the gap is smaller: 79 minutes against 22, a ratio of 3.6.
  it("leaves a career without hires at least three times slower than one that spends its cash on them", () => {
    expect(alone.days).toBeGreaterThanOrEqual(hiring.days * 3)
  })

  it("credits the team with most of the users, and the endings follow", () => {
    expect(hiring.share).toBeGreaterThan(0.5)
    expect(hiring.ending).toBe("sponsor")
    expect(alone.ending).toBe("nightOwl")
    expect(headcountOf(hiring.hires)).toBeGreaterThan(1000)
  })
})
