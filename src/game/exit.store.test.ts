import { beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { ENDING_BONUS, PERK, PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import { GIGS, JOB_TIERS } from "../data/phases.ts"
import { FRESH_COMPANY } from "./globe/growth.ts"
import type { CompanyState } from "./globe/growth.ts"
import { FRESH_FOOTPRINT } from "./globe/footprint.ts"
import { FRESH_FOUNDER } from "./globe/track.ts"
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

/** A career that has won the world with `ending`, users and all. */
function winWith(ending: "founder" | "nightOwl" | "sponsor") {
  const company: CompanyState = { ...FRESH_COMPANY, users: { "americas-east": 8e9 }, won: true, ending, hiredUsers: 1 }
  useGame.setState({ company })
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

  it("puts every company field back the way a fresh career has it", () => {
    useGame.setState({
      company: {
        users: { "americas-east": 5e8, europe: 1.2e9 },
        resistance: 63,
        incidents: [{ id: 4, kind: "ddos", region: "europe", until: Date.now() + 60_000, strength: 3 }],
        incidentSeq: 4,
        won: true,
        hiredUsers: 3e8,
        ending: "sponsor",
        uptime: "oodpm",
        day: 12,
      },
      footprint: { regions: ["americas-east", "europe"], pops: ["ashburn", "london"], off: ["london"], dark: [] },
      founder: { track: "founder", offered: true, bridges: 2, equityCut: 0.2, requitAt: null, broke: true, hires: { outsourced: 40, senior: 2 } },
      forkModal: true,
      foreverMult: 3,
    })
    earn()
    expect(game.exit()).toBeGreaterThan(0)
    const s = useGame.getState()
    expect(s.company).toEqual(FRESH_COMPANY)
    expect(s.footprint).toEqual(FRESH_FOOTPRINT)
    expect(s.founder).toEqual(FRESH_FOUNDER)
    expect(s.forkModal).toBe(false)
    expect(s.foreverMult).toBe(1)
    const world = game.getState()
    expect(world).toMatchObject({ track: "ladder", hires: {}, headcount: 0, ending: null })
    expect(world.world).toMatchObject({ users: 0, regionUsers: {}, resistance: 0, incidents: [], won: false })
    expect(world.founder).toMatchObject({ bridges: 0, equityCut: 0, broke: false })
  })

  it("draws a new product, keeps the handle, and opens the start card again", () => {
    const before = game.getState().profile
    expect(before.chosen).toBe(true)
    earn()
    game.exit()
    const after = game.getState().profile
    expect(after.handle).toBe(before.handle)
    expect(after.product).not.toBe(before.product)
    expect(after.chosen).toBe(false)
    // The handle stays; the product can be rerolled.
    expect(game.rerollProfile()).toBe(false)
    expect(useGame.getState().rerollProduct()).toBe(true)
    expect(game.getState().profile.handle).toBe(before.handle)
    game.keepProfile()
    expect(game.getState().profile.chosen).toBe(true)
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

describe("the Hall of Fame", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  it("pays the ending bonus on top of the earnings, once per ending", () => {
    earn(PRESTIGE_EARN_SCALE * 8)
    winWith("founder")
    expect(game.getState().legacy.prestigeOnExit).toBe(2 + ENDING_BONUS)
    expect(game.exit()).toBe(2 + ENDING_BONUS)
    expect(game.getState().legacy.endings).toEqual(["founder"])
    expect(useGame.getState().exitCard).toMatchObject({ newEnding: "founder", endingBonus: ENDING_BONUS })

    // The same ending again pays only earnings.
    game.keepProfile()
    earn(PRESTIGE_EARN_SCALE * 64)
    winWith("founder")
    const second = game.exit()
    expect(second).toBe(2)
    expect(game.getState().legacy.endings).toEqual(["founder"])
    expect(useGame.getState().exitCard?.newEnding).toBeNull()

    // A different ending pays its bonus, and the bonus does not eat the earnings ladder: 4 from 64 scales so far, 5 more at 125.
    game.keepProfile()
    earn(PRESTIGE_EARN_SCALE * 125)
    winWith("sponsor")
    const third = game.exit()
    expect(third).toBe(1 + ENDING_BONUS)
    expect(game.getState().legacy.endings).toEqual(["founder", "sponsor"])
    expect(game.getState().legacy.prestigeTotal).toBe(5 + 2 * ENDING_BONUS)
  })

  it("opens the first Exit on a win alone, and a win with a recorded ending pays only earnings", () => {
    winWith("nightOwl")
    expect(game.getState().legacy).toMatchObject({ exitOpen: true, prestigeOnExit: ENDING_BONUS })
    expect(game.exit()).toBe(ENDING_BONUS)
    expect(useGame.getState().exitCard?.headline).toContain("Get some sleep")
  })

  it("survives a reload", () => {
    winWith("nightOwl")
    game.exit()
    const saved = hydrate(readCareerText(), Date.now()).save
    expect(saved.legacy?.endings).toEqual(["nightOwl"])
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
    expect(game.buyLegacy("founder.burn")).toBe(false)
    expect(game.buyLegacy("founder.users")).toBe(true)
    expect(game.buyLegacy("capital.offline")).toBe(true)
    expect(game.buyLegacy("capital.offline")).toBe(false)
    expect(game.buyLegacy("nope")).toBe(false)
    game.setPrestige(1)
    expect(game.buyLegacy("network.gigs")).toBe(false)
    expect(game.careerLog().filter((line) => line.type === "legacy")).toHaveLength(4)
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

  it("Early adopters seed 1,000 users at once and on every new career", () => {
    expect(game.getState().world.users).toBe(0)
    game.setPrestige(2)
    expect(game.buyLegacy("founder.users")).toBe(true)
    expect(game.getState().world.users).toBe(PERK.startUsers)
    expect(game.getState().world.regionUsers).toEqual({ "americas-east": PERK.startUsers })
    earn(PRESTIGE_EARN_SCALE * 30)
    expect(game.exit()).toBeGreaterThan(0)
    expect(game.getState().world.users).toBe(PERK.startUsers)
    // A career that already has the users keeps them.
    game.setUsers("europe", 5_000)
    expect(game.getState().world.users).toBe(6_000)
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

  it("Platform lifts product revenue", () => {
    game.setUsers("americas-east", 1000)
    const base = game.getState().world.revenuePerSec
    expect(base).toBeGreaterThan(0)
    game.setPrestige(100)
    for (const id of ["founder.users", "founder.burn", "founder.bridge", "founder.growth"]) game.buyLegacy(id)
    expect(game.getState().world.revenuePerSec).toBeCloseTo(base)
    expect(game.buyLegacy("founder.revenue")).toBe(true)
    expect(game.getState().world.revenuePerSec).toBeCloseTo(base * PERK.revenue)
  })

  it("Lean team cuts the founder's burn and Friendly investors make the first bridge free", () => {
    game.setUsers("americas-east", 1000)
    for (const gig of GIGS.slice(0, 6)) game.forceGig(gig.id)
    game.setXp(300_000)
    game.buyJob(1)
    expect(game.goFullTime()).toBe(true)
    const burn = game.getState().founder.burnPerSec
    expect(burn).toBeGreaterThan(0)
    game.setPrestige(100)
    for (const id of ["founder.users", "founder.burn"]) game.buyLegacy(id)
    expect(game.getState().founder.burnPerSec).toBeCloseTo(burn * (1 - PERK.burnCut), 5)
    expect(game.buyLegacy("founder.bridge")).toBe(true)
    game.setMoney(0)
    game.tick(10_000)
    expect(game.getState().founder.broke).toBe(true)
    expect(game.raiseBridge()).toBe(true)
    expect(game.getState().founder).toMatchObject({ bridges: 1, equityCut: 0 })
    game.setMoney(0)
    game.tick(10_000)
    expect(game.raiseBridge()).toBe(true)
    expect(game.getState().founder.equityCut).toBeCloseTo(0.1)
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
    expect(game.getState().legacy).toMatchObject({ runs: 1, prestige: 0, prestigeTotal: 0, perks: [], endings: [], mult: 1 })
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
