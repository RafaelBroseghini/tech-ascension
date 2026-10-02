import { expect, test } from "vitest"
import { TIERS } from "../data/tiers.ts"
import { installGameHarness } from "./harness.ts"

const game = installGameHarness()

function tier(key: string) {
  const row = TIERS.find((item) => item.key === key)
  if (!row) throw new Error(`missing stage ${key}`)
  return row
}

test("early loop buys the first three stages", () => {
  game.reset()
  const start = game.getState()
  expect(start.money).toBe(0)
  expect(start.cps).toBe(0)
  expect(start.spriteTierKey).toBe("used-laptop")
  expect(start.owned).toEqual({})

  const cost = tier("used-laptop").baseCost + tier("stack-overblow").baseCost + tier("freecodechamp").baseCost
  let guard = 0
  while (game.getState().money < cost) {
    game.click()
    guard += 1
    if (guard > 500) throw new Error("clicks did not pay for the first three stages")
  }

  const ready = game.getState()
  expect(game.buy("used-laptop")).toBe(true)
  const afterFirst = game.getState()
  expect(afterFirst.money).toBeLessThan(ready.money)
  expect(afterFirst.cps).toBeGreaterThan(ready.cps)
  expect(afterFirst.xp).toBeGreaterThan(ready.xp)
  expect(afterFirst.spriteTierKey).toBe("used-laptop")

  expect(game.buy("stack-overblow")).toBe(true)
  expect(game.buy("freecodechamp")).toBe(true)
  const after = game.getState()
  expect(after.money).toBeLessThan(afterFirst.money)
  expect(after.cps).toBeCloseTo(tier("used-laptop").cps + tier("stack-overblow").cps + tier("freecodechamp").cps)
  expect(after.xp).toBeGreaterThan(afterFirst.xp)
  expect(after.spriteTierKey).toBe("freecodechamp")
  expect(after.era).toBe("early")
  expect(after.owned).toMatchObject({ "used-laptop": 1, "stack-overblow": 1, "freecodechamp": 1 })
})

test("mid jump matches the first-LLM tier and boosts clicks only", () => {
  game.reset()
  const row = tier("first-llm-finetune")
  game.setMoney(row.baseCost)
  const before = game.getState()
  expect(game.buy(row.key)).toBe(true)
  const after = game.getState()
  expect(after.cps - before.cps).toBe(row.cps)
  expect(after.clickPower - before.clickPower).toBe(row.clickBonus)
  expect(after.spriteTierKey).toBe(row.key)
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
  game.setMoney(tier("used-laptop").baseCost)
  expect(game.buy("used-laptop")).toBe(true)
  const cps = game.getState().cps
  expect(cps).toBeCloseTo(tier("used-laptop").cps)

  const hour = 60 * 60 * 1000
  const oneHour = game.advanceOffline(hour)
  expect(oneHour.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(oneHour.credited - cps * 3600)).toBeLessThan(1)

  const tenHours = game.advanceOffline(10 * hour)
  expect(tenHours.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(tenHours.credited - cps * 8 * 3600)).toBeLessThan(1)
  expect(tenHours.credited).toBeLessThan(cps * 10 * 3600)
})
