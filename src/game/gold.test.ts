import { beforeEach, describe, expect, it } from "vitest"
import { GOLD_SKILLS } from "../data/gold.ts"
import { scalePurchaseCost } from "../data/costs.ts"
import { SKILL_TIERS } from "../data/phases.ts"
import { MAX_CLICKS_PER_SEC } from "./autoClick.ts"
import { nextCost, ownedCount, quotePurchase } from "./economy.ts"
import {
  buyAmounts,
  canBuyGold,
  clampBuyAmount,
  goldSectionOpen,
  hoverRate,
  isGoldRevealed,
  offlineCapMs,
  toBuyAmount,
  visibleGold,
} from "./gold.ts"
import { installGameHarness } from "./harness.ts"
import { readCareerText } from "./ledger.ts"
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
    for (const family of ["buy", "hover", "away"] as const) {
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

describe("buy amounts", () => {
  it("offers one copy until a bulk skill is owned", () => {
    expect(buyAmounts([])).toEqual([1])
    expect(buyAmounts([idOf("Bulk Buy ×5")])).toEqual([1, 5])
    expect(buyAmounts([idOf("Bulk Buy ×5"), idOf("Bulk Buy ×10"), idOf("Bulk Buy Max")])).toEqual([1, 5, 10, "max"])
  })

  it("holds a request to the largest amount unlocked below it", () => {
    const five = [idOf("Bulk Buy ×5")]
    expect(clampBuyAmount([], "max")).toBe(1)
    expect(clampBuyAmount(five, 10)).toBe(5)
    expect(clampBuyAmount(five, "max")).toBe(5)
    expect(clampBuyAmount(five, 1)).toBe(1)
    expect(clampBuyAmount([idOf("Bulk Buy Max")], 10)).toBe(1)
  })

  it("reads the loose modes the store accepts", () => {
    expect(toBuyAmount("one")).toBe(1)
    expect(toBuyAmount("max")).toBe("max")
    expect(toBuyAmount(5)).toBe(5)
    expect(toBuyAmount(7)).toBe(5)
    expect(toBuyAmount(40)).toBe(10)
    expect(toBuyAmount(0)).toBe(1)
  })

  it("quotes up to N copies and stops early when the budget runs out", () => {
    expect(quotePurchase(1e9, 10, 0, 5).count).toBe(5)
    expect(quotePurchase(1e9, 10, 0, 10).count).toBe(10)
    expect(quotePurchase(25, 10, 0, 5).count).toBe(2)
    const five = quotePurchase(1e9, 10, 3, 5)
    let total = 0
    for (let have = 3; have < 8; have++) total += nextCost(10, have)
    expect(five.total).toBe(total)
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
    expect(visibleGold([]).map((row) => row.name)).toEqual(["Bulk Buy ×5", "Hover Tap", "Overnight Cron"])
    const names = visibleGold([idOf("Bulk Buy ×5"), idOf("Hover Tap")]).map((row) => row.name)
    expect(names).toEqual(["Bulk Buy ×5", "Hover Tap", "Bulk Buy ×10", "Overnight Cron", "Hover Rhythm"])
  })

  it("buys only a revealed, affordable row that is next in its family", () => {
    const rich = { xp: 1e12, xpTotal: 1e12, gold: [] as number[] }
    const bulk10 = GOLD_SKILLS.find((row) => row.name === "Bulk Buy ×10")!
    expect(canBuyGold(rich, first)).toBe(true)
    expect(canBuyGold(rich, bulk10)).toBe(false)
    expect(canBuyGold({ ...rich, gold: [first.id] }, bulk10)).toBe(true)
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

  it("buys one copy at a time until a bulk skill is owned, then up to the amount", () => {
    useGame.setState({ xp: 1e12, xpTotal: 1e12 })
    useGame.getState().buySkill(1, 5)
    expect(ownedCount(useGame.getState().skills, 1)).toBe(1)
    useGame.getState().buySkill(1, "max")
    expect(ownedCount(useGame.getState().skills, 1)).toBe(2)

    useGame.setState({ gold: [idOf("Bulk Buy ×5")] })
    useGame.getState().buySkill(1, 10)
    expect(ownedCount(useGame.getState().skills, 1)).toBe(7)

    useGame.setState({ gold: [idOf("Bulk Buy ×5"), idOf("Bulk Buy ×10"), idOf("Bulk Buy Max")] })
    useGame.getState().buySkill(1, 10)
    expect(ownedCount(useGame.getState().skills, 1)).toBe(17)
  })

  it("holds the Buy control to an unlocked amount", () => {
    useGame.getState().setBuyAmount("max")
    expect(useGame.getState().buyAmount).toBe(1)
    useGame.setState({ gold: [idOf("Bulk Buy ×5")] })
    useGame.getState().setBuyAmount(10)
    expect(useGame.getState().buyAmount).toBe(5)
  })

  it("writes the Buy amount to the career, so a reload keeps it", () => {
    useGame.setState({ gold: [idOf("Bulk Buy ×5"), idOf("Bulk Buy ×10")] })
    useGame.getState().setBuyAmount(10)
    const saved = parseSave(JSON.parse(readCareerText()!))
    expect(saved?.buyAmount).toBe(10)
    useGame.getState().setBuyAmount(1)
    expect(parseSave(JSON.parse(readCareerText()!))?.buyAmount).toBeUndefined()
  })

  it("is wiped with the career", () => {
    useGame.setState({ gold: [1], buyAmount: 5 })
    useGame.getState().wipe()
    expect(useGame.getState().gold).toEqual([])
    expect(useGame.getState().buyAmount).toBe(1)
  })
})

describe("gold in the save", () => {
  it("omits the field when empty and keeps known ids, dropping unknown ones", () => {
    expect(freshSave(0).gold).toBeUndefined()
    const raw = { ...freshSave(0), gold: [3, 1, 1, 9999, "x"] }
    expect(parseSave(raw)?.gold).toEqual([1, 3])
    expect(parseSave({ ...freshSave(0), gold: [] })?.gold).toBeUndefined()
  })

  it("keeps the Buy amount, held to what the gold skills unlock", () => {
    const five = idOf("Bulk Buy ×5")
    expect(freshSave(0).buyAmount).toBeUndefined()
    expect(parseSave({ ...freshSave(0), gold: [five], buyAmount: 5 })?.buyAmount).toBe(5)
    expect(parseSave({ ...freshSave(0), gold: [five], buyAmount: 10 })?.buyAmount).toBe(5)
    expect(parseSave({ ...freshSave(0), buyAmount: "max" })?.buyAmount).toBeUndefined()
    expect(parseSave({ ...freshSave(0), gold: [five], buyAmount: 7 })?.buyAmount).toBeUndefined()
    expect(parseSave({ ...freshSave(0), gold: [five, idOf("Bulk Buy ×10"), idOf("Bulk Buy Max")], buyAmount: "max" })?.buyAmount).toBe("max")
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
    expect(state.buyAmounts).toEqual([1])
    expect(state.hoverRate).toBe(0)
    expect(state.offlineCapHours).toBe(8)

    expect(game.buyGold(1)).toBe(false)
    expect(game.forceGold(idOf("Hover Tap"))).toBe(true)
    expect(game.forceGold(idOf("Hover Tap"))).toBe(false)
    expect(game.forceGold(9999)).toBe(false)
    expect(game.forceGold(idOf("Overnight Cron"))).toBe(true)
    expect(game.forceGold(idOf("Bulk Buy ×5"))).toBe(true)
    state = game.getState()
    expect(state.hoverRate).toBe(2)
    expect(state.offlineCapHours).toBe(12)
    expect(state.buyAmounts).toEqual([1, 5])
    expect(game.setBuyAmount("max")).toBe(5)
    game.reset()
  })

  it("buys through the normal gates and lets a bulk amount through", () => {
    const game = installGameHarness()
    game.reset()
    const first = GOLD_SKILLS[0]!
    game.setXp(first.unlockXp + first.cost)
    expect(game.buyGold(first.id)).toBe(true)
    expect(game.getState().gold).toEqual([first.id])
    game.setXp(1e9)
    expect(game.buySkill(1, 5)).toBe(true)
    expect(game.getState().skills["1"]).toBe(5)
    game.reset()
  })
})
