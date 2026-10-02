import { describe, expect, it } from "vitest"
import { ENEMIES, ENEMY_MEAN_WAIT_MS, ENEMY_SPAWN_SAME_ERA_ONLY, FIGHT_DURATION_MS } from "../data/enemies.ts"
import type { Era } from "../data/tiers.ts"
import { BOOST_WAIT_MAX_FACTOR, BOOST_WAIT_MIN_FACTOR } from "../data/boosts.ts"
import { PALETTE } from "../pixel/palette.ts"
import { ENEMY_IDS, ENEMY_SIZE, enemyGrid, enemySprite } from "../pixel/enemies.ts"
import {
  advanceEnemyClock,
  applyDamage,
  eligibleEnemies,
  endFight,
  enemyById,
  pickEnemy,
  remainingMs,
  startFight,
} from "./fight.ts"

const ERAS: Era[] = ["early", "mid", "upper", "q3", "end"]

describe("enemy table", () => {
  it("wires all 44 enemies with sane stats", () => {
    expect(ENEMIES).toHaveLength(44)
    expect(new Set(ENEMIES.map((enemy) => enemy.id)).size).toBe(44)
    for (const enemy of ENEMIES) {
      expect(enemy.hp).toBeGreaterThan(0)
      expect(enemy.reward).toBeGreaterThan(0)
      expect(enemy.weight).toBeGreaterThan(0)
      expect(ERAS).toContain(enemy.eraGate)
    }
    expect(FIGHT_DURATION_MS).toBe(30_000)
    expect(ENEMY_MEAN_WAIT_MS.early).toBe(90_000)
    expect(ENEMY_MEAN_WAIT_MS.end).toBe(210_000)
    expect(ENEMY_SPAWN_SAME_ERA_ONLY).toBe(true)
    expect(enemyById(1)).toMatchObject({ hp: 88, reward: 500 })
    expect(enemyById(44)).toMatchObject({ hp: 480_000, reward: 2_500_000_000 })
  })

  it("pays the v1.2 payday rewards and keeps early fights winnable at $1 a click", () => {
    expect(ENEMIES.map((enemy) => enemy.reward)).toEqual([
      500, 250, 600, 750, 900, 550, 280, 1_100, 1_300, 400,
      50_000, 90_000, 120_000, 32_000, 40_000, 150_000, 60_000, 75_000, 200_000, 36_000,
      2_500_000, 1_800_000, 3_500_000, 2_200_000, 5_000_000, 4_000_000, 7_000_000, 1_200_000, 9_000_000,
      40_000_000, 65_000_000, 120_000_000, 30_000_000, 50_000_000, 90_000_000, 140_000_000,
      350_000_000, 300_000_000, 500_000_000, 750_000_000, 1_000_000_000, 550_000_000, 1_400_000_000, 2_500_000_000,
    ])
    for (const enemy of ENEMIES.filter((row) => row.eraGate === "early")) {
      expect(enemy.hp).toBeLessThanOrEqual(150)
    }
  })

  it("draws a 96×96 pixel sprite for every enemy inside the shared palette", () => {
    expect(ENEMY_IDS).toHaveLength(44)
    const seen = new Set<string>()
    for (const id of ENEMY_IDS) {
      const grid = enemyGrid(id)
      expect([grid.w, grid.h]).toEqual([ENEMY_SIZE, ENEMY_SIZE])
      expect(ENEMY_SIZE).toBe(96)
      const colors = grid.colors()
      expect(colors.length).toBeGreaterThan(4)
      for (const color of colors) expect(color).toBeLessThanOrEqual(PALETTE.length)
      const filled = grid.data.filter((value) => value !== 0).length
      expect(filled).toBeGreaterThan(900)
      expect(filled).toBeLessThan(ENEMY_SIZE * ENEMY_SIZE * 0.8)
      const url = enemySprite(id)
      expect(url.startsWith("data:image/png;base64,")).toBe(true)
      seen.add(url)
    }
    expect(seen.size).toBe(44)
  })
})

describe("era gating", () => {
  it("offers only enemies gated to exactly the player's era", () => {
    expect(eligibleEnemies("early")).toHaveLength(10)
    expect(eligibleEnemies("mid")).toHaveLength(10)
    expect(eligibleEnemies("upper")).toHaveLength(9)
    expect(eligibleEnemies("q3")).toHaveLength(7)
    expect(eligibleEnemies("end")).toHaveLength(8)
    for (const era of ERAS) {
      for (const enemy of eligibleEnemies(era)) expect(enemy.eraGate).toBe(era)
    }
  })

  it("never picks outside the current era, whatever the roll", () => {
    for (const era of ERAS) {
      for (let i = 0; i <= 200; i++) expect(pickEnemy(era, i / 200).eraGate).toBe(era)
    }
  })

  it("weights the pick: heavier rows cover more of the roll", () => {
    const pool = eligibleEnemies("mid")
    const total = pool.reduce((sum, enemy) => sum + enemy.weight, 0)
    expect(pickEnemy("mid", 0).id).toBe(pool[0]?.id)
    expect(pickEnemy("mid", 0.999999).id).toBe(pool[pool.length - 1]?.id)
    const counts = new Map<number, number>()
    const n = 4000
    for (let i = 0; i < n; i++) {
      const enemy = pickEnemy("mid", (i + 0.5) / n)
      counts.set(enemy.id, (counts.get(enemy.id) ?? 0) + 1)
    }
    for (const enemy of pool) {
      expect((counts.get(enemy.id) ?? 0) / n).toBeCloseTo(enemy.weight / total, 2)
    }
    expect(counts.get(14) ?? 0).toBeGreaterThan(counts.get(19) ?? 0)
  })
})

describe("damage and outcomes", () => {
  it("chips HP without ending the fight", () => {
    const enemy = enemyById(1)
    if (!enemy) throw new Error("missing enemy 1")
    const fight = startFight(enemy, 1_000)
    expect(fight.hp).toBe(enemy.hp)
    expect(fight.endsAt).toBe(1_000 + FIGHT_DURATION_MS)
    const hit = applyDamage(fight, 5)
    expect(hit.outcome).toBeNull()
    expect(hit.fight?.hp).toBe(enemy.hp - 5)
  })

  it("pays the reward exactly when HP reaches zero, overkill included", () => {
    const enemy = enemyById(2)
    if (!enemy) throw new Error("missing enemy 2")
    const fight = startFight(enemy, 0)
    const almost = applyDamage(fight, enemy.hp - 1)
    expect(almost.outcome).toBeNull()
    const exact = applyDamage(almost.fight ?? fight, 1)
    expect(exact.fight).toBeNull()
    expect(exact.outcome).toEqual({ kind: "win", enemyId: 2, reward: enemy.reward })
    expect(applyDamage(fight, enemy.hp * 10).outcome?.reward).toBe(enemy.reward)
  })

  it("flee and timeout carry no reward", () => {
    const enemy = enemyById(44)
    if (!enemy) throw new Error("missing enemy 44")
    const fight = startFight(enemy, 0)
    expect(endFight(fight, "flee")).toEqual({ kind: "flee", enemyId: 44, reward: 0 })
    expect(endFight(fight, "timeout")).toEqual({ kind: "timeout", enemyId: 44, reward: 0 })
  })

  it("counts the timer down on the store clock", () => {
    const enemy = enemyById(3)
    if (!enemy) throw new Error("missing enemy 3")
    const fight = startFight(enemy, 500)
    expect(remainingMs(fight, 500)).toBe(FIGHT_DURATION_MS)
    expect(remainingMs(fight, 10_500)).toBe(20_000)
    expect(remainingMs(fight, 99_999)).toBe(0)
  })
})

describe("enemy clock", () => {
  const never = () => {
    throw new Error("rng should not be called")
  }

  it("schedules the first spawn from the era mean, clamped like boosts", () => {
    for (const era of ERAS) {
      const mean = ENEMY_MEAN_WAIT_MS[era]
      const quick = advanceEnemyClock({ fight: null, nextEnemyAt: null }, era, 1_000, () => 0)
      expect(quick.spawned).toBeNull()
      expect(quick.clock.nextEnemyAt).toBe(1_000 + BOOST_WAIT_MIN_FACTOR * mean)
      const slow = advanceEnemyClock({ fight: null, nextEnemyAt: null }, era, 1_000, () => 0.999999999)
      expect(slow.clock.nextEnemyAt).toBe(1_000 + BOOST_WAIT_MAX_FACTOR * mean)
    }
  })

  it("spawns an eligible enemy once the wait is up, then holds one fight at a time", () => {
    const waiting = advanceEnemyClock({ fight: null, nextEnemyAt: 5_000 }, "mid", 4_999, never)
    expect(waiting.spawned).toBeNull()
    const rolls = [0.5]
    const spawn = advanceEnemyClock({ fight: null, nextEnemyAt: 5_000 }, "mid", 5_000, () => rolls.shift() ?? 0)
    expect(spawn.spawned).not.toBeNull()
    expect(spawn.clock.nextEnemyAt).toBeNull()
    const enemy = enemyById(spawn.spawned?.enemyId ?? 0)
    expect(enemy?.eraGate).toBe("mid")
    expect(spawn.spawned?.endsAt).toBe(5_000 + FIGHT_DURATION_MS)

    const during = advanceEnemyClock(spawn.clock, "mid", 5_000 + FIGHT_DURATION_MS - 1, never)
    expect(during.spawned).toBeNull()
    expect(during.outcome).toBeNull()
    expect(during.clock.fight).toEqual(spawn.clock.fight)
  })

  it("times out cleanly with no reward and reschedules from scratch", () => {
    const enemy = enemyById(10)
    if (!enemy) throw new Error("missing enemy 10")
    const fight = startFight(enemy, 0)
    const out = advanceEnemyClock({ fight, nextEnemyAt: null }, "early", FIGHT_DURATION_MS, never)
    expect(out.outcome).toEqual({ kind: "timeout", enemyId: 10, reward: 0 })
    expect(out.clock).toEqual({ fight: null, nextEnemyAt: null })
    expect(out.spawned).toBeNull()
  })
})
