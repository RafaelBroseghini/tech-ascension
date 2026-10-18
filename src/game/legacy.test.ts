import { describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { ENDING_BONUS, HALL_OF_FAME, LEGACY_PERKS, PERK, PRESTIGE_EARN_SCALE, PRESTIGE_MULT_PER, TRACKS } from "../data/legacy.ts"
import { GIG_BOARD_UNLOCK, GIGS, JOB_TIERS } from "../data/phases.ts"
import { capitalBase, gearBase, idlePerSec } from "./economy.ts"
import { GEAR } from "../data/gear.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts } from "./globe/growth.ts"
import { BRIDGE_CUT, burnOf, FRESH_FOUNDER, productRevenueOf, raiseBridge, trackFactsOf } from "./globe/track.ts"
import type { FounderState } from "./globe/track.ts"
import { gigBoardUnlocked } from "./phase.ts"
import { offlineCapMs } from "./gold.ts"
import { perkEffects, NO_PERKS } from "./perks.ts"
import {
  canBuyPerk,
  canExit,
  earningsPrestige,
  endingBonus,
  exitHeadline,
  exitOpen,
  freshLegacy,
  isFreshLegacy,
  normalizeLegacy,
  pastProductsOf,
  prestigeOnExit,
  prestigeTotalFor,
  startingGrant,
  withStartUsers,
} from "./legacy.ts"
import { modFactors, modsOf, prestigeMult } from "./mods.ts"
import { OFFLINE_CAP_MS, freshSave, hydrate, parseSave } from "./save.ts"

describe("Prestige formula", () => {
  it("pays the first Prestige at one scale of earnings and ten at a thousand", () => {
    expect(prestigeTotalFor(0)).toBe(0)
    expect(prestigeTotalFor(PRESTIGE_EARN_SCALE * 0.99)).toBe(0)
    expect(prestigeTotalFor(PRESTIGE_EARN_SCALE)).toBe(1)
    expect(prestigeTotalFor(PRESTIGE_EARN_SCALE * 1000)).toBe(10)
    expect(prestigeTotalFor(PRESTIGE_EARN_SCALE * 999)).toBe(9)
    expect(prestigeTotalFor(Number.NaN)).toBe(0)
  })

  it("runs on earnings across careers and pays only the rungs this one climbed", () => {
    const legacy = { ...freshLegacy(), runs: 2, prestigeTotal: 3, prestige: 3, earnedAllRuns: PRESTIGE_EARN_SCALE * 27 }
    expect(prestigeOnExit(legacy, 0)).toBe(0)
    expect(prestigeOnExit(legacy, PRESTIGE_EARN_SCALE * 37)).toBe(1)
    expect(prestigeOnExit(legacy, PRESTIGE_EARN_SCALE * 1000 - legacy.earnedAllRuns)).toBe(7)
  })

  it("never pays a negative amount, even when Prestige was set above the ladder", () => {
    expect(prestigeOnExit({ ...freshLegacy(), prestigeTotal: 50, prestige: 50 }, PRESTIGE_EARN_SCALE)).toBe(0)
  })

  it("the multiplier is 1 + PRESTIGE_MULT_PER per Prestige earned", () => {
    expect(prestigeMult(0)).toBe(1)
    expect(prestigeMult(10)).toBeCloseTo(1 + 10 * PRESTIGE_MULT_PER)
  })

  it("folds into the click, idle and XP factors beside the event multipliers", () => {
    const fx = modFactors(modsOf({ foreverMult: 2, tempMults: {}, legacy: { prestigeTotal: 10 } }), 0, 0)
    expect(fx.click).toBeCloseTo(2 * prestigeMult(10))
    expect(fx.cps).toBeCloseTo(2 * prestigeMult(10))
    expect(fx.xpIdle).toBeCloseTo(2 * prestigeMult(10))
    expect(modFactors({ foreverMult: 1, temp: {} }, 0, 0)).toEqual({ click: 1, cps: 1, xpIdle: 1 })
  })
})

describe("the ending bonus", () => {
  const won = (ending: "founder" | "nightOwl" | "sponsor") => ({ won: true, ending })

  it("is paid on top of the earnings, once per ending", () => {
    const legacy = freshLegacy()
    expect(endingBonus(legacy, won("founder"))).toBe(ENDING_BONUS)
    expect(endingBonus({ ...legacy, endings: ["founder"] }, won("founder"))).toBe(0)
    expect(endingBonus({ ...legacy, endings: ["founder"] }, won("sponsor"))).toBe(ENDING_BONUS)
    expect(endingBonus(legacy, { won: false })).toBe(0)
    expect(endingBonus(legacy, null)).toBe(0)
    expect(prestigeOnExit(legacy, PRESTIGE_EARN_SCALE * 8, won("nightOwl"))).toBe(2 + ENDING_BONUS)
  })

  it("does not count as a rung of the earnings ladder", () => {
    const legacy = { ...freshLegacy(), runs: 2, prestige: 2 + ENDING_BONUS, prestigeTotal: 2 + ENDING_BONUS, earnedAllRuns: PRESTIGE_EARN_SCALE * 8, endings: ["founder" as const] }
    expect(earningsPrestige(legacy, 0)).toBe(0)
    expect(earningsPrestige(legacy, PRESTIGE_EARN_SCALE * 27 - legacy.earnedAllRuns)).toBe(1)
  })

  it("opens the first Exit on a win, and the Hall of Fame has the three endings", () => {
    expect(exitOpen(freshLegacy(), 0)).toBe(false)
    expect(exitOpen(freshLegacy(), 0, won("founder"))).toBe(true)
    expect(HALL_OF_FAME.map((entry) => entry.id)).toEqual(["founder", "nightOwl", "sponsor"])
  })
})

describe("the Exit gate", () => {
  it("opens on the first career once it would pay a Prestige, and on every later career from the start", () => {
    expect(exitOpen(freshLegacy(), 0)).toBe(false)
    expect(exitOpen(freshLegacy(), PRESTIGE_EARN_SCALE * 0.99)).toBe(false)
    expect(exitOpen(freshLegacy(), PRESTIGE_EARN_SCALE)).toBe(true)
    expect(exitOpen({ ...freshLegacy(), runs: 2 }, 0)).toBe(true)
  })

  it("needs total pay of at least one Prestige", () => {
    expect(canExit(freshLegacy(), PRESTIGE_EARN_SCALE * 0.5)).toBe(false)
    expect(canExit(freshLegacy(), PRESTIGE_EARN_SCALE)).toBe(true)
    expect(canExit({ ...freshLegacy(), runs: 2 }, 0)).toBe(false)
    expect(canExit({ ...freshLegacy(), runs: 2 }, 0, { won: true, ending: "sponsor" })).toBe(true)
  })
})

describe("Legacy perks", () => {
  it("are the spec's three tracks and cost 106 together", () => {
    expect(TRACKS.map((track) => track.id)).toEqual(["network", "founder", "capital"])
    const costs = (track: string) => LEGACY_PERKS.filter((perk) => perk.track === track).map((perk) => perk.cost)
    expect(costs("network")).toEqual([1, 2, 4, 7, 12])
    expect(costs("founder")).toEqual([2, 4, 7, 11, 16])
    expect(costs("capital")).toEqual([2, 4, 7, 11, 16])
    expect(LEGACY_PERKS.reduce((sum, perk) => sum + perk.cost, 0)).toBe(106)
    for (const perk of LEGACY_PERKS) expect(perk.blurb.startsWith("Now, and at the start of every career: ")).toBe(true)
  })

  it("are bought in order within a track and for their price", () => {
    const rich = { ...freshLegacy(), prestige: 100, prestigeTotal: 100 }
    expect(canBuyPerk(rich, "network.gigBoard")).toBe(false)
    expect(canBuyPerk(rich, "network.skills")).toBe(true)
    expect(canBuyPerk(rich, "founder.users")).toBe(true)
    expect(canBuyPerk(rich, "founder.burn")).toBe(false)
    expect(canBuyPerk(rich, "capital.offline")).toBe(true)
    expect(canBuyPerk({ ...rich, prestige: 0 }, "network.skills")).toBe(false)
    expect(canBuyPerk({ ...rich, perks: ["network.skills"] }, "network.skills")).toBe(false)
    expect(canBuyPerk({ ...rich, perks: ["network.skills"] }, "network.gigBoard")).toBe(true)
    expect(canBuyPerk(rich, "network.nope")).toBe(false)
  })

  it("start a career with nothing granted when none are owned", () => {
    expect(startingGrant([])).toEqual({ skills: {}, gigs: [], jobs: [], xpTotal: 0, xp: 0, money: 0 })
  })

  it("grant skills 1 to 10 with the lifetime XP that bought them", () => {
    const grant = startingGrant(["network.skills"])
    expect(Object.keys(grant.skills).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(grant.xpTotal).toBeGreaterThan(0)
  })

  it("open the Gig Board through the ordinary latch", () => {
    const grant = startingGrant(["network.skills", "network.gigBoard"])
    expect(gigBoardUnlocked({ ...grant, peakMoney: 0, owned: {} })).toBe(true)
    expect(grant.xpTotal).toBeGreaterThanOrEqual(GIG_BOARD_UNLOCK.minXp)
  })

  it("clear gigs 1 to 6, hold the internship, and hand over the seed", () => {
    const grant = startingGrant(LEGACY_PERKS.map((perk) => perk.id))
    expect(grant.gigs).toEqual(GIGS.slice(0, 6).map((gig) => gig.id))
    expect(grant.jobs).toEqual([JOB_TIERS[0]!.id])
    expect(grant.xpTotal).toBeGreaterThanOrEqual(JOB_TIERS[0]!.xpReq)
    expect(grant.money).toBe(PERK.seedMoney)
  })

  it("each effect is off without its perk and on with it", () => {
    expect(perkEffects([])).toEqual(NO_PERKS)
    expect(perkEffects(undefined)).toBe(NO_PERKS)
    expect(perkEffects(["nope"])).toEqual(NO_PERKS)
    expect(perkEffects(["capital.offline"]).offlineHours).toBe(PERK.offlineHours)
    expect(perkEffects(["capital.capitalCost"]).capitalCost).toBe(PERK.capitalCost)
    expect(perkEffects(["capital.gearCost"]).gearCost).toBe(PERK.gearCost)
    expect(perkEffects(["capital.salaries"]).salaries).toBe(PERK.salaries)
    expect(perkEffects(["capital.capitalIncome"]).capitalIncome).toBe(PERK.capitalIncome)
    expect(perkEffects(["founder.burn"]).burn).toBe(1 - PERK.burnCut)
    expect(perkEffects(["founder.bridge"]).freeBridge).toBe(true)
    expect(perkEffects(["founder.growth"]).growth).toBe(PERK.growth)
    expect(perkEffects(["founder.revenue"]).revenue).toBe(PERK.revenue)
    expect(perkEffects(["founder.users"]).startUsers).toBe(PERK.startUsers)
    // Each effect belongs to one perk: the others stay at their neutral value.
    expect(perkEffects(["capital.offline"])).toEqual({ ...NO_PERKS, offlineHours: PERK.offlineHours })
  })

  it("Early adopters top the product up to 1,000 users at the home region", () => {
    expect(withStartUsers({}, [])).toEqual({})
    expect(withStartUsers({}, ["founder.users"])).toEqual({ "americas-east": 1000 })
    expect(withStartUsers({ europe: 400 }, ["founder.users"])).toEqual({ europe: 400, "americas-east": 600 })
    expect(withStartUsers({ europe: 4000 }, ["founder.users"])).toEqual({ europe: 4000 })
  })

  it("Long weekend, Volume discount and Bulk hardware change the cap and the prices", () => {
    expect(offlineCapMs([], OFFLINE_CAP_MS, ["capital.offline"])).toBe(OFFLINE_CAP_MS + 4 * 3_600_000)
    expect(offlineCapMs([], OFFLINE_CAP_MS)).toBe(OFFLINE_CAP_MS)
    const tier = CAPITAL[0]!
    const gear = GEAR[0]!
    expect(capitalBase(tier, {})).toBe(tier.baseCost)
    expect(capitalBase(tier, { legacy: { perks: ["capital.capitalCost"] } })).toBe(Math.round(tier.baseCost * 0.9))
    expect(gearBase(gear, { legacy: { perks: ["capital.gearCost"] } })).toBe(Math.round(gear.baseCost * 0.9))
    expect(gearBase(gear, { legacy: { perks: ["capital.capitalCost"] } })).toBe(gear.baseCost)
  })

  it("Raise season and Compounding multiply their own streams", () => {
    const state = { equipment: {}, owned: { "1": 2 }, jobs: [1], gigs: [8], skills: {} }
    const plain = idlePerSec(state)
    const retainer = GIGS.find((gig) => gig.id === 8)!.retainerCps
    const salary = JOB_TIERS[0]!.cps
    const capital = 2 * CAPITAL[0]!.cps
    expect(plain).toBeCloseTo(retainer + salary + capital)
    expect(idlePerSec({ ...state, legacy: { perks: ["capital.salaries"] } })).toBeCloseTo(2 * (retainer + salary) + capital)
    expect(idlePerSec({ ...state, legacy: { perks: ["capital.capitalIncome"] } })).toBeCloseTo(retainer + salary + 1.5 * capital)
  })
})

describe("the product under the perks", () => {
  const founder = (over: Partial<FounderState> = {}): FounderState => ({ ...FRESH_FOUNDER, track: "founder", offered: true, ...over })
  const roomy = { "54": 5 }
  const never = () => 0.999
  const grown = (f: FounderState, legacy?: { perks: string[]; prestigeTotal: number }) =>
    advanceCompany({ ...FRESH_COMPANY, users: { "americas-east": 1000 } }, growthFacts([1, 2, 3], roomy, undefined, trackFactsOf(f, legacy)), 0, 60_000, never)

  it("the permanent bonus multiplies product growth on both tracks, once", () => {
    for (const f of [FRESH_FOUNDER, founder()]) {
      const base = trackFactsOf(f)
      const boosted = trackFactsOf(f, { perks: [], prestigeTotal: 10 })
      expect(boosted.growthMult).toBeCloseTo(base.growthMult * prestigeMult(10))
      const gained = (legacy?: { perks: string[]; prestigeTotal: number }) => grown(f, legacy).state.users["americas-east"]! - 1000
      expect(gained({ perks: [], prestigeTotal: 10 }) / gained()).toBeCloseTo(prestigeMult(10), 3)
    }
  })

  it("Viral loop multiplies growth by 1.5 and stacks with the bonus", () => {
    const base = trackFactsOf(founder())
    expect(trackFactsOf(founder(), { perks: ["founder.growth"], prestigeTotal: 0 }).growthMult).toBeCloseTo(base.growthMult * PERK.growth)
    expect(trackFactsOf(founder(), { perks: ["founder.growth"], prestigeTotal: 10 }).growthMult).toBeCloseTo(base.growthMult * PERK.growth * prestigeMult(10))
  })

  it("keeps the hires' share of growth the same when the multiplier scales", () => {
    const f = founder({ hires: { senior: 40 } })
    const share = (facts: ReturnType<typeof trackFactsOf>) => facts.hireBonus / facts.growthMult
    expect(share(trackFactsOf(f, { perks: ["founder.growth"], prestigeTotal: 20 }))).toBeCloseTo(share(trackFactsOf(f)))
  })

  it("Platform multiplies the revenue the users pay, in the model and in what is shown", () => {
    const plain = grown(founder())
    const platform = grown(founder(), { perks: ["founder.revenue"], prestigeTotal: 0 })
    expect(platform.earned / plain.earned).toBeCloseTo(PERK.revenue, 4)
    expect(productRevenueOf(100, founder(), ["founder.revenue"]) / productRevenueOf(100, founder())).toBeCloseTo(PERK.revenue)
  })

  it("Lean team cuts the burn by a quarter, not the hires' payroll", () => {
    expect(burnOf(10_000, 1 - PERK.burnCut)).toBeCloseTo(burnOf(10_000) * 0.75)
    const f = founder({ hires: { senior: 4 } })
    const plain = grown(f)
    const lean = grown(f, { perks: ["founder.burn"], prestigeTotal: 0 })
    const payroll = 4 * 25
    expect(plain.burnPerSec - payroll).toBeGreaterThan(0)
    expect((lean.burnPerSec - payroll) / (plain.burnPerSec - payroll)).toBeCloseTo(0.75, 3)
  })

  it("Friendly investors make the first bridge cost no equity, then the usual cut", () => {
    const broke = founder({ broke: true })
    const perks = ["founder.bridge"]
    const first = raiseBridge(broke, 1000, perks)!
    expect(first.founder).toMatchObject({ bridges: 1, equityCut: 0 })
    const second = raiseBridge({ ...first.founder, broke: true }, 1000, perks)!
    expect(second.founder.equityCut).toBeCloseTo(BRIDGE_CUT)
    expect(raiseBridge(broke, 1000)!.founder.equityCut).toBeCloseTo(BRIDGE_CUT)
  })
})

describe("the headline by outcome", () => {
  const base = { handle: "quiet-otter", product: "Otterly" }
  it("reads by users, then by ending", () => {
    expect(exitHeadline({ ...base, users: 999_999, won: false })).toBe("@quiet-otter acqui-hired; Otterly sunset 'to focus on the core'")
    expect(exitHeadline({ ...base, users: 1_000_000, won: false })).toBe("Otterly acquired; @quiet-otter stays on as 'advisor'")
    expect(exitHeadline({ ...base, users: 999_999_999, won: false })).toBe("Otterly acquired; @quiet-otter stays on as 'advisor'")
    expect(exitHeadline({ ...base, users: 1_000_000_000, won: false })).toBe("Otterly sold in a blockbuster deal")
    expect(exitHeadline({ ...base, users: 6_999_999_999, won: false })).toBe("Otterly sold in a blockbuster deal")
    expect(exitHeadline({ ...base, users: 8e9, won: true, ending: "founder" })).toBe("@quiet-otter sells Otterly, the app eight billion people use")
    expect(exitHeadline({ ...base, users: 8e9, won: true, ending: "nightOwl" })).toBe("@quiet-otter sells the side project eight billion people use. Get some sleep.")
    expect(exitHeadline({ ...base, users: 8e9, won: true, ending: "sponsor" })).toBe("Otterly sold; its team thanks their executive sponsor")
  })
})

describe("save: legacy", () => {
  it("a save without the block is run 1 with no Prestige", () => {
    const save = parseSave(JSON.parse(JSON.stringify(freshSave(1_000))))
    expect(save?.legacy).toBeUndefined()
  })

  it("round-trips through parse and hydrate, Hall of Fame included", () => {
    const legacy = { runs: 3, prestige: 4, prestigeTotal: 12, earnedAllRuns: 3.5e11, perks: ["network.skills", "founder.users"], endings: ["founder", "sponsor"] }
    const text = JSON.stringify({ ...freshSave(1_000), legacy })
    expect(parseSave(JSON.parse(text))?.legacy).toEqual(legacy)
    expect(hydrate(text, 1_000).save.legacy).toEqual(legacy)
  })

  it("drops unknown perk ids and endings and clamps numbers", () => {
    const raw = {
      ...freshSave(1),
      legacy: { runs: -4, prestige: 9, prestigeTotal: 2, earnedAllRuns: -1, perks: ["network.skills", "craft.nope", 7, "network.skills", "capital.offline"], endings: ["sponsor", "mogul", "sponsor", 3, "founder"] },
    }
    expect(parseSave(raw)?.legacy).toEqual({ runs: 1, prestige: 9, prestigeTotal: 9, earnedAllRuns: 0, perks: ["network.skills", "capital.offline"], endings: ["founder", "sponsor"] })
    const bad = normalizeLegacy({ runs: Number.NaN, prestige: Number.POSITIVE_INFINITY, prestigeTotal: "x", earnedAllRuns: Number.NaN, perks: "no", endings: "no" })
    expect(isFreshLegacy(bad)).toBe(true)
    expect(isFreshLegacy(normalizeLegacy(null))).toBe(true)
    expect(isFreshLegacy({ ...freshLegacy(), endings: ["founder"] })).toBe(false)
  })

  it("an offline credit carries the multiplier and the cap carries Long weekend", () => {
    const base = { ...freshSave(0), owned: { "1": 3 } }
    const plain = hydrate(JSON.stringify(base), 3_600_000).save
    const boosted = hydrate(JSON.stringify({ ...base, legacy: { runs: 2, prestige: 0, prestigeTotal: 10, earnedAllRuns: 0, perks: [], endings: [] } }), 3_600_000).save
    expect(plain.money).toBeGreaterThan(0)
    expect(boosted.money / plain.money).toBeCloseTo(prestigeMult(10))
    const day = 24 * 3_600_000
    const eight = hydrate(JSON.stringify(base), day).save.money
    const twelve = hydrate(JSON.stringify({ ...base, legacy: { runs: 2, prestige: 0, prestigeTotal: 0, earnedAllRuns: 0, perks: ["capital.offline"], endings: [] } }), day).save.money
    expect(twelve / eight).toBeCloseTo(12 / 8)
  })
})

describe("past products on the résumé", () => {
  it("lists the products sold, newest first, by how far they got", () => {
    const exit = (data: Record<string, number | string | boolean>) => ({ type: "exit", data })
    const past = pastProductsOf([
      { type: "skill" },
      exit({ product: "Otterly", users: 12_345, won: false }),
      exit({ product: "Foxly", users: 8e9, won: true, ending: "sponsor" }),
      exit({ product: "Mooly", users: 8e9, won: true, ending: "founder" }),
      exit({ users: 4 }),
    ])
    expect(past.map((p) => p.role)).toEqual(["Founder, Mooly", "Executive sponsor, Foxly", "Side project, Otterly"])
    expect(past[2]!.meta).toBe("Sold · 12,345 users")
    expect(past[0]!.meta).toBe("Sold · eight billion users")
  })
})
