import { expect, test } from "vitest"
import { ENEMIES, FIGHT_DURATION_MS } from "../data/enemies.ts"
import { CAPITAL_UNLOCK, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { CAPITAL } from "../data/capital.ts"
import { EVENTS } from "../data/events.ts"
import { installGameHarness } from "./harness.ts"
import { hydrate } from "./save.ts"

const game = installGameHarness()

function tierByName(name: string) {
  const row = CAPITAL.find((item) => item.name === name)
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
  const second = SKILL_TIERS[1]
  if (!first || !second) throw new Error("missing skills")
  let guard = 0
  while (game.getState().xp < first.baseXpCost) {
    const gain = game.click()
    expect(gain.money).toBe(start.clickPower)
    expect(gain.xp).toBe(1)
    guard += 1
    if (guard > 5_000) throw new Error("clicks did not pay for the first skill")
  }
  expect(guard).toBeGreaterThan(100)
  expect(game.getState().money).toBe(first.baseXpCost)
  expect(game.getState().lastPop).toMatchObject({ kind: "click", size: "medium" })

  const ready = game.getState()
  expect(game.buy(26)).toBe(false)
  expect(game.buySkill(1)).toBe(true)
  const bought = game.getState()
  expect(bought.xp).toBe(ready.xp - first.baseXpCost)
  expect(bought.xpTotal).toBe(ready.xpTotal)
  expect(bought.xpPerClick).toBe(ready.xpPerClick + first.xpPerClick)
  expect(bought.money).toBe(ready.money)
  expect(bought.cps).toBe(0)
  const paid = game.click()
  expect(paid.xp).toBe(bought.xpPerClick)
  expect(paid.money).toBe(bought.clickPower)

  game.setXp(Math.max(second.baseXpCost, second.unlockAtXp))
  expect(game.buySkill(2)).toBe(true)
  expect(game.getState().xpPerSec).toBeCloseTo(second.xpPerSec)
  const idleBefore = game.getState()
  game.tick(10_000)
  const idleAfter = game.getState()
  expect(idleAfter.xp - idleBefore.xp).toBeCloseTo(second.xpPerSec * 10)
  expect(idleAfter.money).toBe(idleBefore.money)
  expect(idleAfter.cps).toBe(0)
})

test("A → B: Portfolio + React and 12K XP open the Gig Board, and the first gig still needs its skills", () => {
  game.reset()
  game.setXp(1_000_000)
  expect(game.getState().unlocks.gigBoard).toBe(false)
  expect(game.getState().phase).toBe("A")
  for (let id = 1; id <= 14; id++) expect(game.buySkill(id)).toBe(true)
  expect(game.getState().phase).toBe("A")
  expect(game.buySkill(15)).toBe(true)
  expect(game.getState().phase).toBe("A")
  expect(game.buySkill(16)).toBe(true)

  const open = game.getState()
  expect(open.phase).toBe("B")
  expect(open.unlocks).toEqual({ gigBoard: true, jobBoard: false, gear: true, capital: false })
  expect(open.lastPop).toMatchObject({ kind: "unlock", size: "large" })

  const gig1 = GIGS[0]
  const gig2 = GIGS[1]
  if (!gig1 || !gig2) throw new Error("missing gigs")
  const primed = game.click()
  expect(primed.money).toBe(open.clickPower)
  expect(primed.xp).toBeGreaterThan(0)
  expect(game.completeGig(gig2.id)).toBe(false)
  expect(game.completeGig(gig1.id)).toBe(true)
  expect(game.completeGig(gig1.id)).toBe(false)
  const cleared = game.getState()
  expect(cleared.money).toBe(open.money + primed.money + gig1.lump)
  expect(cleared.gigs).toEqual([gig1.id])
  expect(cleared.cps).toBe(0)
  expect(cleared.lastPop).toEqual({ kind: "gigClear", size: "large", amount: gig1.lump, label: gig1.name })

  const click = game.click()
  expect(click.money).toBe(cleared.clickPower)
  expect(click.xp).toBeGreaterThan(0)
  expect(game.getState().money).toBe(cleared.money + cleared.clickPower)
  expect(game.getState().lastPop).toMatchObject({ kind: "click", size: "medium" })
})

test("B: a retainer gig is the first $/s", () => {
  game.reset()
  const retainer = GIGS.find((gig) => gig.retainerCps > 0)
  if (!retainer) throw new Error("missing retainer gig")
  game.setXp(1_000_000)
  const furthest = Math.max(16, ...retainer.skillIds)
  for (let id = 1; id <= furthest; id++) expect(game.buySkill(id)).toBe(true)
  for (let id = 1; id < retainer.id; id++) expect(game.completeGig(id)).toBe(true)
  expect(game.getState().cps).toBe(0)
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
  const senior = JOB_TIERS.find((job) => job.id === 14)
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

test("Gear opens at 8K XP, and the next-unlock target follows the gates", () => {
  game.reset()
  expect(game.getState().nextUnlock).toMatchObject({ key: "board:gear", tab: "G", needs: ["8,000 more XP"] })
  expect(game.getState().unlocks.gear).toBe(false)
  game.setMoney(1e6)
  expect(game.buyEquipment(1)).toBe(false)

  game.setXp(8_000)
  expect(game.getState().unlocks.gear).toBe(true)
  expect(game.buyEquipment(1)).toBe(true)
  expect(game.getState().equipment).toEqual({ "1": 1 })
  expect(game.getState().clickPower).toBe(1 + 2)

  game.reset()
  game.setXp(1_000_000)
  expect(game.buySkill(15)).toBe(true)
  expect(game.buySkill(16)).toBe(true)
  for (const id of [1, 2, 3, 4]) expect(game.forceGig(id)).toBe(true)
  expect(game.getState().nextUnlock).toMatchObject({ key: "board:job", tab: "C", needs: ["1 more gig"] })
  expect(game.forceGig(5)).toBe(true)
  expect(game.getState().nextUnlock).toMatchObject({ key: "board:capital", tab: "D", either: true })
})

test("D: capital waits for $500K held (or a senior job)", () => {
  game.reset()
  game.setMoney(CAPITAL_UNLOCK.minMoney - 1)
  expect(game.getState().phase).toBe("A")
  expect(game.buy(1)).toBe(false)
  game.setMoney(CAPITAL_UNLOCK.minMoney)
  expect(game.getState().phase).toBe("D")
  expect(game.buy(1)).toBe(true)
  expect(game.getState().owned).toEqual({ "1": 1 })
  expect(game.getState().era).toBe("mid")
  expect(game.getState().spriteTierId).toBe(25)
})

test("mid jump matches the first-LLM tier and boosts clicks only", () => {
  game.reset()
  const row = tierByName("WhyCombinator batch investment")
  game.setMoney(row.baseCost)
  const before = game.getState()
  expect(game.buy(row.id)).toBe(true)
  const after = game.getState()
  expect(after.cps - before.cps).toBe(row.cps)
  expect(after.clickPower - before.clickPower).toBe(row.clickBonus)
  expect(after.spriteTierId).toBe(row.artId)
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
  game.setXp(1_000_000)
  game.buySkill(15)
  game.buySkill(16)
  const retainer = GIGS.find((gig) => gig.retainerCps > 0)
  if (!retainer) throw new Error("missing retainer gig")
  for (const id of [1, 2, 3, retainer.id]) game.forceGig(id)
  const cps = game.getState().cps
  expect(cps).toBeCloseTo(retainer.retainerCps)

  const hour = 60 * 60 * 1000
  const oneHour = game.advanceOffline(hour)
  expect(oneHour.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(oneHour.credited - cps * 3600)).toBeLessThan(1)

  const tenHours = game.advanceOffline(10 * hour)
  expect(tenHours.toast).toMatch(/^welcome back, credited \$/)
  expect(Math.abs(tenHours.credited - cps * 8 * 3600)).toBeLessThan(1)
  expect(tenHours.credited).toBeLessThan(cps * 10 * 3600)
})

test("offline study credits XP in phase A and adds no idle money", () => {
  game.reset()
  const second = SKILL_TIERS[1]
  if (!second) throw new Error("missing skill 2")
  game.setXp(Math.max(second.baseXpCost, second.unlockAtXp))
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
  expect(game.forceGig(8)).toBe(true)
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
  game.setMoney(tierByName("WhyCombinator batch investment").baseCost)
  expect(game.buy(tierByName("WhyCombinator batch investment").id)).toBe(true)
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

test("events: forceEvent applies the table row once, the modal closes without undoing it", () => {
  game.reset()
  expect(game.forceEvent(99_999)).toBe(false)
  expect(game.getState().event).toBeNull()

  game.forceGig(1)
  game.setMoney(1_000)
  const row = EVENTS.find((item) => item.id === 21)
  expect(row?.effects).toEqual([{ kind: "money", delta: 800 }])
  expect(game.forceEvent(21)).toBe(true)
  const fired = game.getState()
  expect(fired.money).toBe(1_800)
  expect(fired.event).toEqual({ eventId: 21, name: "Open-source bounty", lines: ["+$800"] })

  expect(game.forceEvent(3)).toBe(true)
  expect(game.getState().event?.eventId).toBe(3)
  expect(game.getState().money).toBe(1_770)

  game.dismissEvent()
  expect(game.getState().event).toBeNull()
  expect(game.getState().lastEvent?.eventId).toBe(3)
  expect(game.getState().money).toBe(1_770)
})

test("events: a penalty never takes more than you have", () => {
  game.reset()
  game.forceGig(1)
  game.setMoney(10)
  game.setXp(5)
  expect(game.forceEvent(3)).toBe(true)
  expect(game.getState().money).toBe(0)
  expect(game.forceEvent(106)).toBe(true)
  expect(game.getState().xp).toBe(0)
  expect(game.getState().xpTotal).toBe(5)
  game.dismissEvent()
  expect(game.click().money).toBeGreaterThan(0)
})

test("events: a permanent multiplier scales click and cps, a timed one scales its target only", () => {
  game.reset()
  game.forceGig(5)
  game.tick(1)
  const base = game.getState()
  expect(base.foreverMult).toBe(1)

  game.forceEvent(41)
  const forever = game.getState()
  expect(forever.foreverMult).toBe(1.03)
  expect(forever.clickPower).toBeCloseTo(base.clickPower * 1.03)
  expect(forever.cps).toBeCloseTo(base.cps * 1.03)

  game.forceEvent(58)
  const timed = game.getState()
  expect(timed.tempMults.click?.mult).toBe(1.2)
  expect(timed.clickPower).toBeCloseTo(base.clickPower * 1.03 * 1.2)
  expect(timed.cps).toBeCloseTo(forever.cps)
  game.dismissEvent()
})

test("events: none fire during a fight, forceEnemy closes an open one", () => {
  game.reset()
  game.forceEvent(2)
  expect(game.getState().event).not.toBeNull()
  expect(game.forceEnemy(1)).toBe(true)
  expect(game.getState().event).toBeNull()
  expect(game.forceEvent(2)).toBe(false)
  game.flee()
  expect(game.forceEvent(2)).toBe(true)
  game.dismissEvent()
})

test("fight: v1.2 rewards pay out like a payday", () => {
  game.reset()
  game.forceGig(1)
  game.forceBoost(10, 60_000)
  const row = enemy(1)
  expect(row.reward).toBe(500)
  game.forceEnemy(row.id)
  const before = game.getState().money
  let guard = 0
  while (game.getState().fight) {
    game.click()
    if (++guard > row.hp) throw new Error("enemy never died")
  }
  const won = game.getState()
  expect(won.money - before).toBe(500)
  expect(won.lastFight).toEqual({ kind: "win", enemyId: 1, reward: 500 })
  expect(won.lastPop).toMatchObject({ kind: "fightWin", size: "large", amount: 500 })
})

test("ide: the pack follows the owned era, tabs navigate, the shop era previews and snaps back", () => {
  game.reset()
  expect(game.getState().ide).toMatchObject({ era: "early", packId: "fizzbuzz", kind: "files", index: 0, previewing: false })

  game.setMoney(1e28)
  const top = (name: string) => {
    const row = tierByName(name)
    for (let id = 1; id <= row.id; id++) game.buy(id)
    return row
  }
  top("Angel syndicate seat")
  expect(game.getState().ide).toMatchObject({ era: "mid", packId: "search", kind: "files", items: ["BinarySearch.java", "BinarySearchTest.java"] })
  expect(game.ideSelect(1)).toBe(true)
  expect(game.getState().ide.index).toBe(1)
  expect(game.ideSelect(3)).toBe(false)
  expect(game.ideSelect(-1)).toBe(false)
  expect(game.getState().ide.index).toBe(1)

  game.previewEra("q3")
  expect(game.getState().ide).toMatchObject({ era: "q3", kind: "inbox", previewing: true, restPackId: "search", index: 0 })
  expect(game.ideSelect(2)).toBe(true)
  expect(game.getState().ide.items[2]).toBe("CUDA OOM on node gpu-17")
  game.previewEra("end")
  expect(game.getState().ide).toMatchObject({ era: "end", kind: "deck", previewing: true })
  game.previewEra(null)
  expect(game.getState().ide).toMatchObject({ packId: "search", previewing: false })

  game.previewEra("upper")
  game.tick(60_000)
  expect(game.getState().ide).toMatchObject({ packId: "search", previewing: false })

  top("Custom accelerator IP")
  expect(game.getState().ide).toMatchObject({ era: "q3", kind: "inbox", packId: "frontier" })
  top("Mars megacampus Holdings")
  expect(game.getState().ide).toMatchObject({ era: "end", kind: "deck", packId: "mars", items: ["Habitat power", "GPU shed policy", "Dust storm runbook"] })
})

test("save: a save from another schema version is wiped, not migrated", () => {
  game.reset()
  game.forceGig(1)
  localStorage.setItem("tech-ascension.save", JSON.stringify({ version: 2, money: 5e9, xp: 99, owned: { "26": 3 }, savedAt: 1 }))
  const hydrated = hydrate(localStorage.getItem("tech-ascension.save"), Date.now())
  expect(hydrated.reset).toBe(true)
  expect(hydrated.save.money).toBe(0)
  expect(hydrated.save.owned).toEqual({})
  game.reset()
})
