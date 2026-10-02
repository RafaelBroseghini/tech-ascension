import { expect, test } from "vitest"
import { TIERS } from "../data/tiers.ts"
import { installGameHarness } from "./harness.ts"

const game = installGameHarness()

function tierByName(name: string) {
  const row = TIERS.find((item) => item.name === name)
  if (!row) throw new Error(`missing tier ${name}`)
  return row
}

function tier(id: number) {
  const row = TIERS.find((item) => item.id === id)
  if (!row) throw new Error(`missing tier ${id}`)
  return row
}

test("early loop buys tiers 1–3", () => {
  game.reset()
  const start = game.getState()
  expect(start.money).toBe(0)
  expect(start.cps).toBe(0)
  expect(start.spriteTierId).toBe(1)
  expect(start.owned).toEqual({})

  const cost = tier(1).baseCost + tier(2).baseCost + tier(3).baseCost
  let guard = 0
  while (game.getState().money < cost) {
    game.click()
    guard += 1
    if (guard > 500) throw new Error("clicks did not pay for tiers 1–3")
  }

  const ready = game.getState()
  expect(game.buy(1)).toBe(true)
  const afterFirst = game.getState()
  expect(afterFirst.money).toBeLessThan(ready.money)
  expect(afterFirst.cps).toBeGreaterThan(ready.cps)
  expect(afterFirst.xp).toBeGreaterThan(ready.xp)
  expect(afterFirst.spriteTierId).toBe(1)

  expect(game.buy(2)).toBe(true)
  expect(game.buy(3)).toBe(true)
  const after = game.getState()
  expect(after.money).toBeLessThan(afterFirst.money)
  expect(after.cps).toBeCloseTo(tier(1).cps + tier(2).cps + tier(3).cps)
  expect(after.xp).toBeGreaterThan(afterFirst.xp)
  expect(after.spriteTierId).toBe(3)
  expect(after.era).toBe("early")
  expect(after.owned).toMatchObject({ "1": 1, "2": 1, "3": 1 })
})

test("mid jump matches the first-LLM tier and boosts clicks only", () => {
  game.reset()
  const row = tierByName("Fine-tune your first LLM")
  game.setMoney(row.baseCost)
  const before = game.getState()
  expect(game.buy(row.id)).toBe(true)
  const after = game.getState()
  expect(after.cps - before.cps).toBe(row.cps)
  expect(after.clickPower - before.clickPower).toBe(row.clickBonus)
  expect(after.spriteTierId).toBe(row.id)
  expect(after.era).toBe("mid")

  const cps = after.cps
  game.forceBoost(5, 10_000)
  const boosted = game.getState()
  expect(boosted.activeBoost?.mult).toBe(5)
  expect(boosted.cps).toBe(cps)
  const moneyBefore = boosted.money
  game.click()
  expect(game.getState().money - moneyBefore).toBe(boosted.clickPower * 5)
  expect(game.getState().cps).toBe(cps)
})

test("offline catch-up pays 1h and caps at 8h", () => {
  game.reset()
  game.setMoney(tier(1).baseCost)
  expect(game.buy(1)).toBe(true)
  const cps = game.getState().cps
  expect(cps).toBeCloseTo(tier(1).cps)

  const hour = 60 * 60 * 1000
  const oneHour = game.advanceOffline(hour)
  expect(oneHour.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(oneHour.credited - cps * 3600)).toBeLessThan(1)

  const tenHours = game.advanceOffline(10 * hour)
  expect(tenHours.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(tenHours.credited - cps * 8 * 3600)).toBeLessThan(1)
  expect(tenHours.credited).toBeLessThan(cps * 10 * 3600)
})
