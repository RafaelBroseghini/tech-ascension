import { expect, test } from "vitest"
import { ENEMIES, FIGHT_DURATION_MS } from "../data/enemies.ts"
import { CAPITAL_UNLOCK, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { TIERS } from "../data/tiers.ts"
import { installGameHarness } from "./harness.ts"

const game = installGameHarness()

function tierByName(name: string) {
  const row = TIERS.find((item) => item.name === name)
  if (!row) throw new Error(`missing tier ${name}`)
  return row
}

test("phase A: clicks are XP only, skills cost XP, there is no $/s", () => {
  game.reset()
  const start = game.getState()
  expect(start).toMatchObject({ phase: "A", money: 0, xp: 0, xpTotal: 0, cps: 0, spriteTierId: 1, era: "early" })
  expect(start.owned).toEqual({})
  expect(start.skills).toEqual({})

  const first = SKILL_TIERS[0]
  if (!first) throw new Error("missing skill 1")
  let guard = 0
  while (game.getState().xp < first.baseXpCost) {
    const gain = game.click()
    expect(gain.money).toBe(0)
    expect(gain.xp).toBe(1)
    guard += 1
    if (guard > 100) throw new Error("clicks did not pay for the first skill")
  }
  expect(game.getState().money).toBe(0)
  expect(game.getState().lastPop).toBeNull()

  const ready = game.getState()
  expect(game.buy(26)).toBe(false)
  expect(game.buySkill(1)).toBe(true)
  const bought = game.getState()
  expect(bought.xp).toBe(ready.xp - first.baseXpCost)
  expect(bought.xpTotal).toBe(ready.xpTotal)
  expect(bought.xpPerClick).toBe(ready.xpPerClick + first.xpPerClick)
  expect(bought.money).toBe(0)
  expect(bought.cps).toBe(0)
  expect(game.click().xp).toBe(bought.xpPerClick)

  game.setXp(1_000)
  expect(game.buySkill(2)).toBe(true)
  expect(game.getState().xpPerSec).toBeCloseTo(0.2)
  const idleBefore = game.getState()
  game.tick(10_000)
  const idleAfter = game.getState()
  expect(idleAfter.xp - idleBefore.xp).toBeCloseTo(2)
  expect(idleAfter.money).toBe(0)
  expect(idleAfter.cps).toBe(0)
})

test("A → B: Portfolio + React and 12K XP open the Gig Board, the first gig starts the money", () => {
  game.reset()
  game.setXp(30_000)
  expect(game.getState().unlocks.gigBoard).toBe(false)
  expect(game.getState().phase).toBe("A")
  expect(game.buySkill(11)).toBe(true)
  expect(game.getState().phase).toBe("A")
  expect(game.buySkill(12)).toBe(true)

  const open = game.getState()
  expect(open.phase).toBe("B")
  expect(open.unlocks).toEqual({ gigBoard: true, jobBoard: false, capital: false })
  expect(open.lastPop).toMatchObject({ kind: "unlock", size: "large" })
  expect(open.money).toBe(0)
  expect(game.click().money).toBe(0)

  const gig1 = GIGS[0]
  const gig2 = GIGS[1]
  if (!gig1 || !gig2) throw new Error("missing gigs")
  expect(game.completeGig(gig2.id)).toBe(false)
  expect(game.completeGig(gig1.id)).toBe(true)
  expect(game.completeGig(gig1.id)).toBe(false)
  const cleared = game.getState()
  expect(cleared.money).toBe(gig1.lump)
  expect(cleared.gigs).toEqual([gig1.id])
  expect(cleared.cps).toBe(0)
  expect(cleared.lastPop).toEqual({ kind: "gigClear", size: "large", amount: gig1.lump, label: gig1.name })

  const click = game.click()
  expect(click.money).toBe(cleared.clickPower)
  expect(game.getState().money).toBe(gig1.lump + cleared.clickPower)
  expect(game.getState().lastPop).toMatchObject({ kind: "click", size: "medium" })
})

test("B: a retainer gig is the first $/s", () => {
  game.reset()
  game.setXp(30_000)
  game.buySkill(11)
  game.buySkill(12)
  for (const id of [1, 2, 3]) expect(game.completeGig(id)).toBe(true)
  expect(game.getState().cps).toBe(0)
  const retainer = GIGS[4]
  if (!retainer) throw new Error("missing gig 5")
  expect(game.completeGig(retainer.id)).toBe(true)
  expect(game.getState().cps).toBe(retainer.retainerCps)
  const before = game.getState()
  game.tick(10_000)
  expect(game.getState().money - before.money).toBeCloseTo(retainer.retainerCps * 10)
  expect(game.getState().lastPop?.kind).toBe("gigClear")
})

test("B → C → D: job board, a salary, then capital through a senior job", () => {
  game.reset()
  game.setXp(35_000)
  for (const id of [1, 2, 3, 4]) expect(game.forceGig(id)).toBe(true)
  expect(game.getState().unlocks.jobBoard).toBe(false)
  expect(game.forceGig(5)).toBe(true)
  const board = game.getState()
  expect(board.unlocks.jobBoard).toBe(true)
  expect(board.phase).toBe("C")
  expect(board.lastPop).toMatchObject({ kind: "unlock", size: "large" })

  const intern = JOB_TIERS[0]
  const junior = JOB_TIERS[1]
  const senior = JOB_TIERS[6]
  if (!intern || !junior || !senior) throw new Error("missing jobs")
  expect(game.buyJob(intern.id)).toBe(true)
  expect(game.getState().cps).toBeCloseTo(board.cps + intern.cps)
  expect(game.buyJob(junior.id)).toBe(false)
  game.setXp(45_000)
  game.setMoney(junior.baseCost)
  expect(game.buyJob(junior.id)).toBe(true)
  expect(game.getState().jobs).toEqual([intern.id, junior.id])
  expect(game.getState().phase).toBe("C")

  game.setXp(senior.xpReq)
  game.setMoney(senior.baseCost)
  expect(game.getState().unlocks.capital).toBe(false)
  expect(game.buyJob(senior.id)).toBe(true)
  const d = game.getState()
  expect(d.unlocks.capital).toBe(true)
  expect(d.phase).toBe("D")
  expect(d.money).toBe(0)
  expect(d.lastPop).toMatchObject({ kind: "unlock", size: "large" })
})

test("D: capital waits for $500K held (or a senior job)", () => {
  game.reset()
  game.setMoney(CAPITAL_UNLOCK.minMoney - 1)
  expect(game.getState().phase).toBe("A")
  expect(game.buy(19)).toBe(false)
  game.setMoney(CAPITAL_UNLOCK.minMoney)
  expect(game.getState().phase).toBe("D")
  expect(game.buy(19)).toBe(true)
  expect(game.getState().owned).toEqual({ "19": 1 })
  expect(game.getState().era).toBe("mid")
  expect(game.getState().spriteTierId).toBe(19)
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
  game.setXp(30_000)
  game.buySkill(11)
  game.buySkill(12)
  for (const id of [1, 2, 3, 5]) game.forceGig(id)
  const cps = game.getState().cps
  expect(cps).toBeCloseTo(GIGS[4]?.retainerCps ?? 0)

  const hour = 60 * 60 * 1000
  const oneHour = game.advanceOffline(hour)
  expect(oneHour.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(oneHour.credited - cps * 3600)).toBeLessThan(1)

  const tenHours = game.advanceOffline(10 * hour)
  expect(tenHours.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(tenHours.credited - cps * 8 * 3600)).toBeLessThan(1)
  expect(tenHours.credited).toBeLessThan(cps * 10 * 3600)
})

test("offline study credits XP in phase A and keeps money at zero", () => {
  game.reset()
  game.setXp(100)
  expect(game.buySkill(2)).toBe(true)
  const xpPerSec = game.getState().xpPerSec
  const away = game.advanceOffline(60 * 60 * 1000)
  expect(away.credited).toBe(0)
  expect(Math.abs(away.creditedXp - xpPerSec * 3600)).toBeLessThan(1)
  expect(away.toast).toMatch(/^welcome back, studied \+/)
  expect(game.getState().money).toBe(0)
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
  game.forceGig(1)
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
  game.forceGig(1)
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
  expect(game.forceGig(5)).toBe(true)
  expect(game.getState().cps).toBeGreaterThan(0)
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

test("fight: rare spawn waits for money, then comes from idle time, era-gated, one at a time", () => {
  game.reset()
  game.tick(8 * 60 * 60 * 1000)
  game.tick(8 * 60 * 60 * 1000)
  expect(game.getState().fight).toBeNull()
  game.forceGig(1)
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
  game.setXp(SKILL_TIERS[0]?.baseXpCost ?? 10)
  game.forceEnemy(1)
  expect(game.buySkill(1)).toBe(true)
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
