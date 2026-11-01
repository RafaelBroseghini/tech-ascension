import { describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { LEGACY_PERKS, PERK, PRESTIGE_EARN_SCALE, PRESTIGE_MULT_PER, TRACKS } from "../data/legacy.ts"
import { GIG_BOARD_UNLOCK, GIGS, JOB_TIERS } from "../data/phases.ts"
import { capitalBase, gearBase, idlePerSec } from "./economy.ts"
import { GEAR } from "../data/gear.ts"
import { gigBoardUnlocked } from "./phase.ts"
import { offlineCapMs } from "./gold.ts"
import { perkEffects, NO_PERKS } from "./perks.ts"
import {
  canBuyPerk,
  canExit,
  earningsPrestige,
  exitHeadline,
  exitOpen,
  freshLegacy,
  isFreshLegacy,
  normalizeLegacy,
  prestigeTotalFor,
  startingGrant,
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
    expect(earningsPrestige(legacy, 0)).toBe(0)
    expect(earningsPrestige(legacy, PRESTIGE_EARN_SCALE * 37)).toBe(1)
    expect(earningsPrestige(legacy, PRESTIGE_EARN_SCALE * 1000 - legacy.earnedAllRuns)).toBe(7)
  })

  it("never pays a negative amount, even when Prestige was set above the ladder", () => {
    expect(earningsPrestige({ ...freshLegacy(), prestigeTotal: 50, prestige: 50 }, PRESTIGE_EARN_SCALE)).toBe(0)
  })

  it("the multiplier is 1 + PRESTIGE_MULT_PER per Prestige earned", () => {
    expect(prestigeMult(0)).toBe(1)
    expect(prestigeMult(10)).toBeCloseTo(1 + 10 * PRESTIGE_MULT_PER)
  })

  it("folds into the click, idle and XP factors beside the event multipliers", () => {
    const fx = modFactors(modsOf({ skills: {}, equipment: {}, owned: {}, jobs: [], gigs: [], foreverMult: 2, tempMults: {}, legacy: { prestigeTotal: 10 } }), 0, 0)
    expect(fx.click).toBeCloseTo(2 * prestigeMult(10))
    expect(fx.cps).toBeCloseTo(2 * prestigeMult(10))
    expect(fx.xpIdle).toBeCloseTo(2 * prestigeMult(10))
    expect(modFactors({ foreverMult: 1, temp: {} }, 0, 0)).toEqual({ click: 1, cps: 1, xpIdle: 1 })
  })
})

describe("the ladder", () => {
  it("does not count a rung twice: Prestige earned already is subtracted", () => {
    const legacy = { ...freshLegacy(), runs: 2, prestige: 2, prestigeTotal: 2, earnedAllRuns: PRESTIGE_EARN_SCALE * 8 }
    expect(earningsPrestige(legacy, 0)).toBe(0)
    expect(earningsPrestige(legacy, PRESTIGE_EARN_SCALE * 27 - legacy.earnedAllRuns)).toBe(1)
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
  })
})

describe("Legacy perks", () => {
  it("are the spec's two tracks and cost 66 together", () => {
    expect(TRACKS.map((track) => track.id)).toEqual(["network", "capital"])
    const costs = (track: string) => LEGACY_PERKS.filter((perk) => perk.track === track).map((perk) => perk.cost)
    expect(costs("network")).toEqual([1, 2, 4, 7, 12])
    expect(costs("capital")).toEqual([2, 4, 7, 11, 16])
    expect(LEGACY_PERKS.reduce((sum, perk) => sum + perk.cost, 0)).toBe(66)
    for (const perk of LEGACY_PERKS) expect(perk.blurb.startsWith("Now, and at the start of every career: ")).toBe(true)
  })

  it("are bought in order within a track and for their price", () => {
    const rich = { ...freshLegacy(), prestige: 100, prestigeTotal: 100 }
    expect(canBuyPerk(rich, "network.gigBoard")).toBe(false)
    expect(canBuyPerk(rich, "network.skills")).toBe(true)
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
    // Each effect belongs to one perk: the others stay at their neutral value.
    expect(perkEffects(["capital.offline"])).toEqual({ ...NO_PERKS, offlineHours: PERK.offlineHours })
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

describe("the headline by outcome", () => {
  const base = { handle: "quiet-otter" }
  it("reads by what the career earned", () => {
    expect(exitHeadline({ ...base, earned: PRESTIGE_EARN_SCALE })).toBe("@quiet-otter takes the severance and a very large mug")
    expect(exitHeadline({ ...base, earned: 5e13 })).toBe("@quiet-otter retires to a standing desk and a quiet calendar")
    expect(exitHeadline({ ...base, earned: 5e14 })).toBe("@quiet-otter leaves a legacy, an endowed chair and a very long wiki")
  })
})

describe("save: legacy", () => {
  it("a save without the block is run 1 with no Prestige", () => {
    const save = parseSave(JSON.parse(JSON.stringify(freshSave(1_000))))
    expect(save?.legacy).toBeUndefined()
  })

  it("round-trips through parse and hydrate", () => {
    const legacy = { runs: 3, prestige: 4, prestigeTotal: 12, earnedAllRuns: 3.5e11, perks: ["network.skills", "capital.offline"] }
    const text = JSON.stringify({ ...freshSave(1_000), legacy })
    expect(parseSave(JSON.parse(text))?.legacy).toEqual(legacy)
    expect(hydrate(text, 1_000).save.legacy).toEqual(legacy)
  })

  it("drops unknown perk ids (the removed Founder track included) and clamps numbers", () => {
    const raw = {
      ...freshSave(1),
      legacy: { runs: -4, prestige: 9, prestigeTotal: 2, earnedAllRuns: -1, perks: ["network.skills", "craft.nope", 7, "founder.burn", "founder.users", "network.skills", "capital.offline"] },
    }
    expect(parseSave(raw)?.legacy).toEqual({ runs: 1, prestige: 9, prestigeTotal: 9, earnedAllRuns: 0, perks: ["network.skills", "capital.offline"] })
    const bad = normalizeLegacy({ runs: Number.NaN, prestige: Number.POSITIVE_INFINITY, prestigeTotal: "x", earnedAllRuns: Number.NaN, perks: "no" })
    expect(isFreshLegacy(bad)).toBe(true)
    expect(isFreshLegacy(normalizeLegacy(null))).toBe(true)
    expect(isFreshLegacy({ ...freshLegacy(), runs: 2 })).toBe(false)
  })

  it("an offline credit carries the multiplier and the cap carries Long weekend", () => {
    const base = { ...freshSave(0), owned: { "1": 3 } }
    const plain = hydrate(JSON.stringify(base), 3_600_000).save
    const boosted = hydrate(JSON.stringify({ ...base, legacy: { runs: 2, prestige: 0, prestigeTotal: 10, earnedAllRuns: 0, perks: [] } }), 3_600_000).save
    expect(plain.money).toBeGreaterThan(0)
    expect(boosted.money / plain.money).toBeCloseTo(prestigeMult(10))
    const day = 24 * 3_600_000
    const eight = hydrate(JSON.stringify(base), day).save.money
    const twelve = hydrate(JSON.stringify({ ...base, legacy: { runs: 2, prestige: 0, prestigeTotal: 0, earnedAllRuns: 0, perks: ["capital.offline"] } }), day).save.money
    expect(twelve / eight).toBeCloseTo(12 / 8)
  })
})
