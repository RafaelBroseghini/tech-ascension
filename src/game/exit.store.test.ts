import { beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { PERK, PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import { GIGS, JOB_TIERS } from "../data/phases.ts"
import { installGameHarness } from "./harness.ts"
import { prestigeMult } from "./mods.ts"
import { readCareerText } from "./ledger.ts"
import { hydrate } from "./save.ts"
import { useGame } from "./store.ts"

const game = installGameHarness()

/** `earned` dollars credited this career. */
function earn(earned = PRESTIGE_EARN_SCALE * 3) {
  game.setMoney(earned)
}

describe("the Exit", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  it("stays shut on career 1 until it would pay a Prestige", () => {
    game.setMoney(PRESTIGE_EARN_SCALE * 0.9)
    expect(game.getState().legacy).toMatchObject({ exitOpen: false, prestigeOnExit: 0 })
    expect(game.exit()).toBe(false)
    expect(game.getState().legacy.runs).toBe(1)
  })

  it("opens at one Prestige of earnings and stays open", () => {
    game.setMoney(PRESTIGE_EARN_SCALE)
    expect(game.getState().legacy).toMatchObject({ exitOpen: true, prestigeOnExit: 1 })
    game.setMoney(0)
    expect(game.getState().legacy.exitOpen).toBe(true)
  })

  it("pays Prestige, and Prestige never falls", () => {
    earn()
    expect(game.getState().legacy.prestigeOnExit).toBe(1)
    expect(game.exit()).toBe(1)
    const after = game.getState().legacy
    expect(after).toMatchObject({ runs: 2, prestige: 1, prestigeTotal: 1 })
    expect(after.mult).toBeCloseTo(prestigeMult(1))
    expect(after.exitOpen).toBe(true)
    expect(after.prestigeOnExit).toBe(0)
    expect(game.exit()).toBe(false)
    expect(game.getState().legacy.prestigeTotal).toBe(1)
  })

  it("resets the run and keeps the career", () => {
    game.setXp(300_000)
    for (const id of [1, 2, 3]) game.buySkill(id)
    for (const gig of GIGS.slice(0, 6)) game.forceGig(gig.id)
    expect(game.buyJob(JOB_TIERS[0]!.id)).toBe(true)
    game.forceGold(2)
    game.forceGold(4)
    game.buyEquipment(1)
    game.forceBoost(5, 60_000)
    const handle = game.getState().profile.handle
    const logged = game.careerLog().length
    const unlocked = game.getState().features.open
    earn()
    expect(game.exit()).toBe(1)
    const s = game.getState()
    expect(s).toMatchObject({ money: 0, xp: 0, xpTotal: 0, phase: "A", cps: 0, activeBoost: null, foreverMult: 1, era: "early" })
    expect(s.skills).toEqual({})
    expect(s.owned).toEqual({})
    expect(s.equipment).toEqual({})
    expect(s.jobs).toEqual([])
    expect(s.gigs).toEqual([])
    expect(s.tempMults).toEqual({})
    expect(useGame.getState().stats.lifetimeEarned).toBe(0)
    expect(useGame.getState().peakMoney).toBe(0)
    expect(s.gold).toEqual([2, 4])
    expect(s.profile.handle).toBe(handle)
    expect(s.features.open).toEqual(expect.arrayContaining(unlocked))
    expect(game.careerLog().length).toBeGreaterThan(logged)
    expect(game.careerLog().at(-1)).toMatchObject({ type: "exit", run: 1, prestigeEarned: 1, prestigeTotal: 1 })
  })

  it("puts the event multiplier back the way a fresh career has it", () => {
    useGame.setState({ foreverMult: 3 })
    earn()
    expect(game.exit()).toBeGreaterThan(0)
    expect(useGame.getState().foreverMult).toBe(1)
  })

  it("keeps the handle and the choice of it: a later career has nothing to draw on the start card", () => {
    const before = game.getState().profile
    expect(before.chosen).toBe(true)
    earn()
    game.exit()
    expect(game.getState().profile).toEqual(before)
    expect(game.rerollProfile()).toBe(false)
  })

  it("keeps the headline card until it is dismissed", () => {
    earn()
    game.exit()
    expect(useGame.getState().exitCard).toMatchObject({ run: 1, prestigeEarned: 1 })
    game.tick(60_000)
    game.keepProfile()
    useGame.getState().click()
    game.setMoney(5)
    game.advanceOffline(30 * 60 * 1000)
    game.clearReveals()
    expect(useGame.getState().exitCard).not.toBeNull()
    useGame.getState().dismissExitCard()
    expect(useGame.getState().exitCard).toBeNull()
  })
})

describe("the headline", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  it("names the handle and reads by what the career earned", () => {
    earn(PRESTIGE_EARN_SCALE * 8)
    game.exit()
    const handle = game.getState().profile.handle
    expect(useGame.getState().exitCard).toMatchObject({ run: 1, prestigeEarned: 2 })
    expect(useGame.getState().exitCard?.headline).toContain(`@${handle}`)
  })

  it("survives a reload", () => {
    earn()
    game.exit()
    const saved = hydrate(readCareerText(), Date.now()).save
    expect(saved.legacy).toMatchObject({ runs: 2, prestige: 1, prestigeTotal: 1 })
  })
})

describe("Legacy perks", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
    earn()
    game.exit()
    game.keepProfile()
  })

  it("spending Prestige does not lower prestigeTotal or the multiplier", () => {
    game.setPrestige(10)
    const before = game.getState().legacy
    expect(game.buyLegacy("network.skills")).toBe(true)
    const after = game.getState().legacy
    expect(after.prestige).toBe(before.prestige - 1)
    expect(after.prestigeTotal).toBe(before.prestigeTotal)
    expect(after.mult).toBe(before.mult)
  })

  it("buyLegacy enforces order and price, track by track", () => {
    expect(game.buyLegacy("network.skills")).toBe(true)
    game.setPrestige(100)
    expect(game.buyLegacy("network.gigBoard")).toBe(true)
    expect(game.buyLegacy("network.seed")).toBe(false)
    expect(game.buyLegacy("capital.offline")).toBe(true)
    expect(game.buyLegacy("capital.offline")).toBe(false)
    expect(game.buyLegacy("nope")).toBe(false)
    game.setPrestige(1)
    expect(game.buyLegacy("network.gigs")).toBe(false)
    expect(game.careerLog().filter((line) => line.type === "legacy")).toHaveLength(3)
  })

  it("Network perks land in the career under way without taking anything away, and the seed money is not earnings", () => {
    game.setXp(60_000)
    game.buySkill(1)
    game.buySkill(2)
    game.buySkill(2)
    game.setPrestige(100)
    expect(game.buyLegacy("network.skills")).toBe(true)
    const s = game.getState()
    expect(Object.keys(s.skills).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(s.skills["2"]).toBe(2)
    for (const id of ["network.gigBoard", "network.gigs", "network.internship"]) game.buyLegacy(id)
    const earnedMid = useGame.getState().stats.lifetimeEarned
    expect(game.buyLegacy("network.seed")).toBe(true)
    expect(game.getState().money).toBe(PERK.seedMoney)
    expect(useGame.getState().stats.lifetimeEarned).toBe(earnedMid)
    expect(game.getState().jobs).toEqual([JOB_TIERS[0]!.id])
  })

  it("Long weekend adds four hours to the offline cap, on top of Time away", () => {
    expect(game.getState().offlineCapHours).toBe(8)
    game.setPrestige(10)
    game.buyLegacy("capital.offline")
    expect(game.getState().offlineCapHours).toBe(8 + PERK.offlineHours)
    game.forceGold(2)
    const gold = game.getState().offlineCapHours
    expect(gold).toBeGreaterThanOrEqual(8 + PERK.offlineHours)
    for (let id = 2; id <= 12; id++) game.forceGold(id)
    expect(game.getState().offlineCapHours).toBeGreaterThan(gold - 1)
  })

  it("Volume discount and Bulk hardware cut what the shop charges and what is paid", () => {
    const row = CAPITAL[0]!
    const gear = GEAR[0]!
    game.setPrestige(100)
    for (const id of ["capital.offline", "capital.capitalCost", "capital.gearCost"]) expect(game.buyLegacy(id)).toBe(true)
    game.forceGig(1)
    game.setXp(60_000)
    game.setMoney(1e9)
    const before = game.getState().money
    expect(game.buy(row.id)).toBe(true)
    expect(before - game.getState().money).toBe(Math.round(row.baseCost * PERK.capitalCost))
    const gearBefore = game.getState().money
    expect(game.buyEquipment(gear.id)).toBe(true)
    expect(gearBefore - game.getState().money).toBe(Math.round(gear.baseCost * PERK.gearCost))
  })

  it("Raise season and Compounding lift salaries, retainers and capital income", () => {
    for (const gig of GIGS.slice(0, 8)) game.forceGig(gig.id)
    game.setMoney(1e9)
    game.buy(1)
    const base = game.getState().cps
    game.setPrestige(100)
    for (const id of ["capital.offline", "capital.capitalCost", "capital.gearCost", "capital.salaries"]) game.buyLegacy(id)
    const retainers = GIGS.slice(0, 8).reduce((sum, gig) => sum + gig.retainerCps, 0)
    const capital = CAPITAL[0]!.cps
    const mult = prestigeMult(game.getState().legacy.prestigeTotal)
    expect(game.getState().cps / mult).toBeCloseTo((retainers * PERK.salaries + capital))
    expect(base).toBeGreaterThan(0)
    expect(game.buyLegacy("capital.capitalIncome")).toBe(true)
    expect(game.getState().cps / mult).toBeCloseTo(retainers * PERK.salaries + capital * PERK.capitalIncome)
  })
})

describe("the Prestige bonus", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  it("reaches cps, clickPower, xpPerClick, xpPerSec and the offline credit", () => {
    for (const gig of GIGS.slice(0, 8)) game.forceGig(gig.id)
    game.setXp(60_000)
    game.buySkill(1)
    game.buySkill(2)
    const base = game.getState()
    expect(base.legacy.mult).toBe(1)
    const baseOffline = game.advanceOffline(3_600_000)
    game.setPrestige(10)
    const boosted = game.getState()
    const mult = prestigeMult(10)
    expect(boosted.cps).toBeCloseTo(base.cps * mult)
    expect(boosted.clickPower).toBeCloseTo(base.clickPower * mult)
    expect(boosted.xpPerClick).toBeCloseTo(base.xpPerClick * mult)
    expect(boosted.xpPerSec).toBeCloseTo(base.xpPerSec * mult)
    const offline = game.advanceOffline(3_600_000)
    expect(offline.creditedXp).toBeCloseTo(baseOffline.creditedXp * mult)
  })

  it("survives a reload, and a full reset wipes it", () => {
    earn()
    game.exit()
    game.setPrestige(7)
    const saved = hydrate(readCareerText(), Date.now()).save
    expect(saved.legacy).toMatchObject({ runs: 2, prestige: 7 })
    game.reset()
    expect(game.getState().legacy).toMatchObject({ runs: 1, prestige: 0, prestigeTotal: 0, perks: [], mult: 1 })
    expect(hydrate(readCareerText(), Date.now()).save.legacy).toBeUndefined()
  })

  it("the timeline row opens with the Exit and never replays", () => {
    expect(game.getState().features.open).not.toContain("exit")
    earn()
    expect(game.getState().features.open).toContain("exit")
    game.clearReveals()
    game.exit()
    expect(game.getState().features.reveals).not.toContain("exit")
    expect(game.careerLog().filter((line) => line.type === "unlock" && line.ref === "exit")).toHaveLength(1)
  })
})
