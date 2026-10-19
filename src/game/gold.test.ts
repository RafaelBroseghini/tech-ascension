import { beforeEach, describe, expect, it } from "vitest"
import { GOLD_SKILLS } from "../data/gold.ts"
import { scalePurchaseCost } from "../data/costs.ts"
import { SKILL_TIERS } from "../data/phases.ts"
import { MAX_CLICKS_PER_SEC } from "./autoClick.ts"
import {
  canBuyGold,
  goldSectionOpen,
  hoverRate,
  isGoldRevealed,
  offlineCapMs,
  visibleGold,
} from "./gold.ts"
import { installGameHarness } from "./harness.ts"
import { hydrate, OFFLINE_CAP_MS, parseSave, freshSave } from "./save.ts"
import { useGame } from "./store.ts"

const HOUR = 3_600_000
const idOf = (name: string) => GOLD_SKILLS.find((row) => row.name === name)!.id

describe("gold table", () => {
  it("has unique ids and names, each with a one-line description", () => {
    expect(new Set(GOLD_SKILLS.map((row) => row.id)).size).toBe(GOLD_SKILLS.length)
    expect(new Set(GOLD_SKILLS.map((row) => row.name)).size).toBe(GOLD_SKILLS.length)
    for (const row of GOLD_SKILLS) {
      expect(row.blurb.length).toBeGreaterThan(10)
      expect(row.blurb).not.toContain("\n")
    }
  })

  it("prices every row in spendable XP on the same scale as the skills", () => {
    for (const row of GOLD_SKILLS) expect(row.cost).toBe(scalePurchaseCost(Math.round(row.unlockXp * 0.25)))
  })

  it("opens within a family in rising order, so a chain never waits on a later gate", () => {
    for (const family of ["hover", "away"] as const) {
      const rows = GOLD_SKILLS.filter((row) => row.family === family)
      expect(rows.length).toBeGreaterThan(1)
      expect(rows.map((row) => row.unlockXp)).toEqual([...rows.map((row) => row.unlockXp)].sort((a, b) => a - b))
    }
  })

  it("brings hover clicking in well before the endgame", () => {
    const first = GOLD_SKILLS.find((row) => row.effect.kind === "hoverRate")!
    expect(first.unlockXp).toBeLessThan(SKILL_TIERS.at(-1)!.unlockAtXp / 100)
    const rates = GOLD_SKILLS.flatMap((row) => (row.effect.kind === "hoverRate" ? [row.effect.perSec] : []))
    expect(Math.max(...rates)).toBeLessThan(MAX_CLICKS_PER_SEC)
  })
})

describe("hover rate and time away", () => {
  it("is zero with no hover skill, and the endgame still grants the ceiling", () => {
    expect(hoverRate([], false)).toBe(0)
    expect(hoverRate([], true)).toBe(MAX_CLICKS_PER_SEC)
  })

  it("takes the fastest hover skill owned", () => {
    expect(hoverRate([idOf("Hover Tap")], false)).toBe(2)
    expect(hoverRate([idOf("Hover Tap"), idOf("Hover Rhythm")], false)).toBe(5)
    expect(hoverRate([idOf("Hover Overdrive")], false)).toBe(15)
    expect(hoverRate([idOf("Hover Tap")], true)).toBe(MAX_CLICKS_PER_SEC)
  })

  it("keeps eight hours until an away skill extends it", () => {
    expect(offlineCapMs([], OFFLINE_CAP_MS)).toBe(8 * HOUR)
    expect(offlineCapMs([idOf("Overnight Cron")], OFFLINE_CAP_MS)).toBe(12 * HOUR)
    expect(offlineCapMs([idOf("Overnight Cron"), idOf("Sabbatical")], OFFLINE_CAP_MS)).toBe(24 * HOUR)
  })
})

describe("gold shop rows", () => {
  const first = GOLD_SKILLS[0]!

  it("stays out of the shop until the first row is in reach", () => {
    expect(goldSectionOpen({ xpTotal: first.unlockXp - 1, gold: [] })).toBe(false)
    expect(goldSectionOpen({ xpTotal: first.unlockXp, gold: [] })).toBe(true)
    expect(goldSectionOpen({ xpTotal: 0, gold: [first.id] })).toBe(true)
  })

  it("lists owned rows plus the next one of each family", () => {
    expect(visibleGold([]).map((row) => row.name)).toEqual(["Hover Tap", "Overnight Cron"])
    const names = visibleGold([idOf("Hover Tap")]).map((row) => row.name)
    expect(names).toEqual(["Hover Tap", "Overnight Cron", "Hover Rhythm"])
  })

  it("buys only a revealed, affordable row that is next in its family", () => {
    const rich = { xp: 1e12, xpTotal: 1e12, gold: [] as number[] }
    const rhythm = GOLD_SKILLS.find((row) => row.name === "Hover Rhythm")!
    expect(canBuyGold(rich, first)).toBe(true)
    expect(canBuyGold(rich, rhythm)).toBe(false)
    expect(canBuyGold({ ...rich, gold: [first.id] }, rhythm)).toBe(true)
    expect(canBuyGold({ ...rich, gold: [first.id] }, first)).toBe(false)
    expect(canBuyGold({ ...rich, xpTotal: first.unlockXp - 1 }, first)).toBe(false)
    expect(canBuyGold({ ...rich, xp: first.cost - 1 }, first)).toBe(false)
    expect(isGoldRevealed(first, { xpTotal: first.unlockXp, gold: [] })).toBe(true)
  })
})

describe("gold in the store", () => {
  beforeEach(() => {
    useGame.getState().wipe()
  })

  it("spends spendable XP, keeps lifetime XP and persists the id", () => {
    const first = GOLD_SKILLS[0]!
    useGame.setState({ xp: first.cost + 10, xpTotal: first.unlockXp + 500 })
    expect(useGame.getState().buyGold(first.id)).toBe(true)
    const state = useGame.getState()
    expect(state.gold).toEqual([first.id])
    expect(state.xp).toBe(10)
    expect(state.xpTotal).toBe(first.unlockXp + 500)
    expect(useGame.getState().buyGold(first.id)).toBe(false)
    expect(useGame.getState().buyGold(9999)).toBe(false)
  })

  it("refuses a locked or unaffordable row", () => {
    const first = GOLD_SKILLS[0]!
    useGame.setState({ xp: 1e9, xpTotal: first.unlockXp - 1 })
    expect(useGame.getState().buyGold(first.id)).toBe(false)
    useGame.setState({ xp: first.cost - 1, xpTotal: 1e9 })
    expect(useGame.getState().buyGold(first.id)).toBe(false)
    expect(useGame.getState().gold).toEqual([])
  })

  it("is wiped with the career", () => {
    useGame.setState({ gold: [2] })
    useGame.getState().wipe()
    expect(useGame.getState().gold).toEqual([])
  })
})

describe("gold in the save", () => {
  it("omits the field when empty and keeps known ids, dropping unknown ones", () => {
    expect(freshSave(0).gold).toBeUndefined()
    const raw = { ...freshSave(0), gold: [4, 2, 2, 9999, "x"] }
    expect(parseSave(raw)?.gold).toEqual([2, 4])
    expect(parseSave({ ...freshSave(0), gold: [] })?.gold).toBeUndefined()
  })

  it("pays time away up to the extended cap", () => {
    const savedAt = 1_000_000
    const base = { ...freshSave(savedAt), skills: { "2": 10 } }
    const away = 20 * HOUR
    const plain = hydrate(JSON.stringify({ ...base, savedAt }), savedAt + away)
    const night = hydrate(JSON.stringify({ ...base, gold: [idOf("Overnight Cron")], savedAt }), savedAt + away)
    expect(night.save.xp).toBeCloseTo((plain.save.xp * 12) / 8, 6)
    const long = hydrate(JSON.stringify({ ...base, gold: [idOf("Overnight Cron"), idOf("Sabbatical")], savedAt }), savedAt + away)
    expect(long.save.xp).toBeCloseTo((plain.save.xp * 20) / 8, 6)
  })
})

describe("gold through the harness", () => {
  it("shows the live perks and grants a gold skill by force", () => {
    const game = installGameHarness()
    game.reset()
    let state = game.getState()
    expect(state.gold).toEqual([])
    expect(state.hoverRate).toBe(0)
    expect(state.offlineCapHours).toBe(8)

    expect(game.buyGold(1)).toBe(false)
    expect(game.forceGold(idOf("Hover Tap"))).toBe(true)
    expect(game.forceGold(idOf("Hover Tap"))).toBe(false)
    expect(game.forceGold(9999)).toBe(false)
    expect(game.forceGold(idOf("Overnight Cron"))).toBe(true)
    state = game.getState()
    expect(state.hoverRate).toBe(2)
    expect(state.offlineCapHours).toBe(12)
    game.reset()
  })

  it("buys through the normal gates", () => {
    const game = installGameHarness()
    game.reset()
    const first = GOLD_SKILLS[0]!
    game.setXp(first.unlockXp + first.cost)
    expect(game.buyGold(first.id)).toBe(true)
    expect(game.getState().gold).toEqual([first.id])
    game.setXp(1e9)
    expect(game.buySkill(1)).toBe(true)
    expect(game.getState().skills["1"]).toBe(1)
    game.reset()
  })
})
