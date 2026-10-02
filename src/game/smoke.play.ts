import { expect, test } from "vitest"
import { ENEMIES, FIGHT_DURATION_MS } from "../data/enemies.ts"
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

function enemy(id: number) {
  const row = ENEMIES.find((item) => item.id === id)
  if (!row) throw new Error(`missing enemy ${id}`)
  return row
}

test("fight: force spawn, click damage, win pays the reward once", () => {
  game.reset()
  expect(game.getState().fight).toBeNull()
  expect(game.forceEnemy(9999)).toBe(false)
  expect(game.getState().fight).toBeNull()

  const row = enemy(2)
  expect(game.forceEnemy(row.id)).toBe(true)
  const start = game.getState()
  expect(start.fight).toEqual({ enemyId: row.id, hp: row.hp, maxHp: row.hp, remainingMs: FIGHT_DURATION_MS })

  const power = start.clickPower
  const gain = game.click()
  expect(gain.money).toBe(0)
  const hit = game.getState()
  expect(hit.fight?.hp).toBe(row.hp - power)
  expect(hit.money).toBe(start.money)
  expect(hit.xp).toBe(start.xp)

  let guard = 0
  while (game.getState().fight) {
    expect(game.getState().money).toBe(start.money)
    game.click()
    guard += 1
    if (guard > row.hp) throw new Error("enemy never died")
  }
  const won = game.getState()
  expect(guard).toBe(Math.ceil(row.hp / power) - 1)
  expect(won.money).toBe(start.money + row.reward)
  expect(won.lastFight).toEqual({ kind: "win", enemyId: row.id, reward: row.reward })

  game.click()
  expect(game.getState().money).toBe(won.money + power)
})

test("fight: click damage is click power times the live boost", () => {
  game.reset()
  game.setMoney(tier(1).baseCost)
  game.buy(1)
  const row = enemy(44)
  game.forceEnemy(row.id)
  game.forceBoost(5, 10_000)
  const before = game.getState()
  game.click()
  const after = game.getState()
  expect(before.fight?.hp).toBe(row.hp)
  expect(after.fight?.hp).toBe(row.hp - before.clickPower * 5)
  expect(after.cps).toBe(before.cps)
})

test("fight: flee ends clean with no reward and no penalty", () => {
  game.reset()
  const row = enemy(1)
  game.forceEnemy(row.id)
  game.click()
  const before = game.getState()
  game.flee()
  const after = game.getState()
  expect(after.fight).toBeNull()
  expect(after.money).toBe(before.money)
  expect(after.xp).toBe(before.xp)
  expect(after.owned).toEqual(before.owned)
  expect(after.lastFight).toEqual({ kind: "flee", enemyId: row.id, reward: 0 })

  game.flee()
  expect(game.getState().lastFight?.kind).toBe("flee")
  game.click()
  expect(game.getState().money).toBe(before.money + before.clickPower)
})

test("fight: timeout ends clean with no reward, idle income keeps running", () => {
  game.reset()
  game.setMoney(tier(1).baseCost)
  expect(game.buy(1)).toBe(true)
  const row = enemy(3)
  game.forceEnemy(row.id)
  const before = game.getState()

  game.tick(FIGHT_DURATION_MS - 1_000)
  const mid = game.getState()
  expect(mid.fight?.remainingMs).toBe(1_000)
  expect(mid.money).toBeCloseTo(before.money + before.cps * 29, 6)

  game.tick(1_000)
  const after = game.getState()
  expect(after.fight).toBeNull()
  expect(after.lastFight).toEqual({ kind: "timeout", enemyId: row.id, reward: 0 })
  expect(after.money).toBeCloseTo(before.money + before.cps * 30, 6)
  expect(after.owned).toEqual(before.owned)
})

test("fight: rare spawn comes from idle time, era-gated, one at a time", () => {
  game.reset()
  game.tick(8 * 60 * 60 * 1000)
  expect(game.getState().fight).toBeNull()
  game.tick(8 * 60 * 60 * 1000)
  const spawned = game.getState().fight
  expect(spawned).not.toBeNull()
  expect(enemy(spawned?.enemyId ?? 0).eraGate).toBe("early")
  expect(spawned?.remainingMs).toBe(FIGHT_DURATION_MS)

  const id = spawned?.enemyId
  game.tick(10_000)
  expect(game.getState().fight?.enemyId).toBe(id)
  expect(game.getState().fight?.remainingMs).toBe(FIGHT_DURATION_MS - 10_000)
})

test("fight: spawn pool is the current era only, forceEnemy ignores the gate", () => {
  game.reset()
  game.setMoney(tierByName("Fine-tune your first LLM").baseCost)
  expect(game.buy(tierByName("Fine-tune your first LLM").id)).toBe(true)
  expect(game.getState().era).toBe("mid")
  game.tick(8 * 60 * 60 * 1000)
  game.tick(8 * 60 * 60 * 1000)
  const spawned = game.getState().fight
  expect(spawned).not.toBeNull()
  expect(enemy(spawned?.enemyId ?? 0).eraGate).toBe("mid")

  game.flee()
  expect(game.forceEnemy(1)).toBe(true)
  expect(game.getState().fight?.enemyId).toBe(1)
})

test("fight: boost rolls wait out the fight, shop stays usable", () => {
  game.reset()
  game.setMoney(tier(1).baseCost)
  game.forceEnemy(1)
  expect(game.buy(1)).toBe(true)
  expect(game.getState().fight).not.toBeNull()

  for (let i = 0; i < 6; i++) {
    game.forceEnemy(1)
    game.tick(FIGHT_DURATION_MS - 1_000)
    expect(game.getState().activeBoost).toBeNull()
  }
  game.flee()
  game.tick(100)
  expect(game.getState().activeBoost).not.toBeNull()
})
