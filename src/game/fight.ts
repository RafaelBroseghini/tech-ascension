import { ENEMIES, ENEMY_MEAN_WAIT_MS, ENEMY_SPAWN_SAME_ERA_ONLY, FIGHT_DURATION_MS } from "../data/enemies.ts"
import type { Enemy } from "../data/enemies.ts"
import type { Era } from "../data/tiers.ts"
import { sampleWaitMs } from "./boosts.ts"

export { ENEMIES, ENEMY_SPAWN_SAME_ERA_ONLY, FIGHT_DURATION_MS }

const ERA_RANK: Record<Era, number> = { early: 0, mid: 1, upper: 2, q3: 3, end: 4 }

const ENEMY_BY_ID = new Map<number, Enemy>(ENEMIES.map((enemy) => [enemy.id, enemy]))

export type Fight = {
  enemyId: number
  hp: number
  maxHp: number
  /** Same clock as the store's `now`. */
  endsAt: number
}

export type FightOutcome = {
  kind: "win" | "flee" | "timeout"
  enemyId: number
  reward: number
}

export type EnemyClock = {
  fight: Fight | null
  /** Null until the next spawn is scheduled, and while a fight is running. */
  nextEnemyAt: number | null
}

export function enemyById(id: number): Enemy | undefined {
  return ENEMY_BY_ID.get(id)
}

/** Spawn pool: enemies gated to exactly the player's current era (`ENEMY_SPAWN_SAME_ERA_ONLY`). */
export function eligibleEnemies(era: Era): Enemy[] {
  if (ENEMY_SPAWN_SAME_ERA_ONLY) return ENEMIES.filter((enemy) => enemy.eraGate === era)
  const rank = ERA_RANK[era] ?? 0
  return ENEMIES.filter((enemy) => (ERA_RANK[enemy.eraGate] ?? 0) <= rank)
}

export function pickEnemy(era: Era, rand: number): Enemy {
  const pool = eligibleEnemies(era)
  const total = pool.reduce((sum, enemy) => sum + enemy.weight, 0)
  let roll = Math.min(Math.max(rand, 0), 0.999999999) * total
  for (const enemy of pool) {
    if (roll < enemy.weight) return enemy
    roll -= enemy.weight
  }
  return pool[pool.length - 1] ?? ENEMIES[0]!
}

export function startFight(enemy: Enemy, now: number): Fight {
  return { enemyId: enemy.id, hp: enemy.hp, maxHp: enemy.hp, endsAt: now + FIGHT_DURATION_MS }
}

export function remainingMs(fight: Fight, now: number): number {
  return Math.max(0, fight.endsAt - now)
}

export type HitResult = { fight: Fight | null; outcome: FightOutcome | null }

/** Apply one click of damage. A kill ends the fight and carries the reward. */
export function applyDamage(fight: Fight, damage: number): HitResult {
  const hp = Math.max(0, fight.hp - Math.max(0, damage))
  if (hp > 0) return { fight: { ...fight, hp }, outcome: null }
  const enemy = enemyById(fight.enemyId)
  return { fight: null, outcome: { kind: "win", enemyId: fight.enemyId, reward: enemy?.reward ?? 0 } }
}

export function endFight(fight: Fight, kind: "flee" | "timeout"): FightOutcome {
  return { kind, enemyId: fight.enemyId, reward: 0 }
}

export type EnemyAdvance = {
  clock: EnemyClock
  spawned: Fight | null
  outcome: FightOutcome | null
}

/**
 * Advance the single enemy slot: expire a running fight, otherwise schedule and roll the next spawn.
 * `rng` is called only when a wait or an enemy is rolled.
 */
export function advanceEnemyClock(clock: EnemyClock, era: Era, now: number, rng: () => number): EnemyAdvance {
  if (clock.fight) {
    if (now >= clock.fight.endsAt) {
      return { clock: { fight: null, nextEnemyAt: null }, spawned: null, outcome: endFight(clock.fight, "timeout") }
    }
    return { clock, spawned: null, outcome: null }
  }
  const mean = ENEMY_MEAN_WAIT_MS[era] ?? ENEMY_MEAN_WAIT_MS.early
  const nextAt = clock.nextEnemyAt ?? now + sampleWaitMs(mean, rng())
  if (now < nextAt) return { clock: { fight: null, nextEnemyAt: nextAt }, spawned: null, outcome: null }
  const spawned = startFight(pickEnemy(era, rng()), now)
  return { clock: { fight: spawned, nextEnemyAt: null }, spawned, outcome: null }
}
