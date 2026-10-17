import { describe, expect, it } from "vitest"
import { REGIONS } from "../../data/regions.ts"
import { FRESH_COMPANY, growthFacts, stepCompany, STEP_MS } from "./growth.ts"
import type { CompanyState } from "./growth.ts"
import { creditOf, headcountOf, HIRES, hireBonusOf, hirePrice, MAX_HIRES } from "./hires.ts"
import type { Hires } from "./hires.ts"
import { FRESH_FOUNDER, goFullTime, trackFactsOf } from "./track.ts"
import type { FounderState } from "./track.ts"
import { totalUsers } from "./world.ts"

/** Dollars a second the ladder's day job pays: a Senior SWE. A founder gives it up. */
const SALARY = 200
const START_USERS = 1000
const DAY = 86_400_000
const everywhere = { regions: REGIONS.map((r) => r.id), pops: ["ashburn", "frankfurt", "tokyo", "saopaulo", "lagos", "sydney", "sf"], off: [], dark: [] }
const never = () => 0.999

type Plan = "founder" | "ladder" | "hiring"

function race(plan: Plan, limitDays = 4000) {
  let company: CompanyState = { ...FRESH_COMPANY, users: { "americas-east": START_USERS } }
  let founder: FounderState = plan === "founder" ? goFullTime(FRESH_FOUNDER) : FRESH_FOUNDER
  let money = 0
  let at = 0
  while (!company.won && at < limitDays * DAY) {
    if (plan === "hiring") {
      for (;;) {
        // The cheapest growth per dollar among the rows open, kept to a payroll the product can carry.
        let best: { id: string; price: number; ratio: number } | null = null
        for (let i = 0; i < HIRES.length; i++) {
          const row = HIRES[i]!
          const held = founder.hires[row.id] ?? 0
          if (held >= MAX_HIRES) continue
          const price = hirePrice(row, held)
          const next: Hires = { ...founder.hires, [row.id]: held + 1 }
          const ratio = (hireBonusOf(next) - hireBonusOf(founder.hires)) / price
          if (!best || ratio > best.ratio) best = { id: row.id, price, ratio }
          if (held === 0) break
        }
        if (!best || money < best.price) break
        money -= best.price
        founder = { ...founder, hires: { ...founder.hires, [best.id]: (founder.hires[best.id] ?? 0) + 1 } }
      }
    }
    const facts = growthFacts([1, 2, 3, 4, 5, 6, 7, 8], { "110": 3 }, everywhere, trackFactsOf(founder))
    const step = stepCompany(company, facts, STEP_MS, at + STEP_MS, never)
    company = step.state
    money = Math.max(0, money + step.earned - step.lost - step.burned + (founder.track === "ladder" ? SALARY * 60 : 0))
    at += STEP_MS
  }
  return { days: at / DAY, won: company.won, ending: company.ending, share: creditOf(company).hiredShare, founder, users: totalUsers(company.users) }
}

/** Three careers from 1,000 users to the world, on the real growth model, with the same serving gear and no incidents. */
describe("the pace of the three careers", () => {
  const founder = race("founder")
  const ladder = race("ladder")
  const hiring = race("hiring")

  it("all reach the world", () => {
    expect([founder.won, ladder.won, hiring.won]).toEqual([true, true, true])
  })

  it("lets a ladder that spends its cash on hires keep up with a founder", () => {
    expect(hiring.days).toBeLessThanOrEqual(founder.days * 1.5)
  })

  it("leaves a ladder without hires at least five times slower than a founder", () => {
    expect(ladder.days).toBeGreaterThanOrEqual(founder.days * 5)
  })

  it("credits the team with most of the users, and the endings follow", () => {
    expect(hiring.share).toBeGreaterThan(0.5)
    expect(hiring.ending).toBe("sponsor")
    expect(ladder.ending).toBe("nightOwl")
    expect(founder.ending).toBe("founder")
    expect(headcountOf(hiring.founder.hires)).toBeGreaterThan(1000)
  })
})
