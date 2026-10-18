import {
  BOOST_BY_ERA,
  BOOST_GRACE_MS,
  BOOST_PITY_FACTOR,
  BOOST_WAIT_MAX_FACTOR,
  BOOST_WAIT_MIN_FACTOR,
} from "../data/boosts.ts"
import type { ActiveBoost, BoostEraConfig, BoostWeight } from "../data/boosts.ts"
import type { Era } from "../data/capital.ts"

export type BoostClock = {
  activeBoost: ActiveBoost | null
  /** Null until the next roll is scheduled, and while a boost is active. */
  nextBoostAt: number | null
  /** Last boost end, or this session's start if none has ended yet. */
  idleSince: number
}

export function boostConfigFor(era: Era): BoostEraConfig {
  return BOOST_BY_ERA[era] ?? BOOST_BY_ERA.early
}

/** Exponential wait around `meanMs`, clamped to [0.5×, 2.5×] mean. */
export function sampleWaitMs(meanMs: number, rand: number): number {
  const u = Math.min(Math.max(rand, 0), 1 - 1e-12)
  const raw = meanMs * -Math.log(1 - u)
  const min = BOOST_WAIT_MIN_FACTOR * meanMs
  const max = BOOST_WAIT_MAX_FACTOR * meanMs
  return Math.round(Math.min(max, Math.max(min, raw)))
}

export function scheduleNextBoostAt(
  from: number,
  meanMs: number,
  rand: number,
  includeGrace: boolean,
): number {
  const grace = includeGrace ? BOOST_GRACE_MS : 0
  return from + grace + sampleWaitMs(meanMs, rand)
}

export function shouldForceBoost(now: number, idleSince: number, meanMs: number): boolean {
  return now - idleSince >= meanMs * BOOST_PITY_FACTOR
}

export function pickMultiplier(weights: readonly BoostWeight[], rand: number): number {
  const total = weights.reduce((sum, row) => sum + row.weight, 0)
  if (total <= 0 || weights.length === 0) return 3
  let roll = Math.min(Math.max(rand, 0), 0.999999999) * total
  for (const row of weights) {
    if (roll < row.weight) return row.mult
    roll -= row.weight
  }
  return weights[weights.length - 1]?.mult ?? 3
}

/** Inclusive whole seconds between durMin and durMax. */
export function sampleDurationMs(config: BoostEraConfig, rand: number): number {
  const minS = Math.round(config.durMinMs / 1000)
  const maxS = Math.round(config.durMaxMs / 1000)
  const span = Math.max(1, maxS - minS + 1)
  const offset = Math.min(span - 1, Math.floor(Math.min(Math.max(rand, 0), 0.999999999) * span))
  return (minS + offset) * 1000
}

export function rollClickBoost(era: Era, randMult: number, randDur: number, now: number): ActiveBoost {
  const config = boostConfigFor(era)
  return {
    mult: pickMultiplier(config.weights, randMult),
    endsAt: now + sampleDurationMs(config, randDur),
  }
}

export type BoostAdvance = {
  clock: BoostClock
  spawned: ActiveBoost | null
}

/**
 * Advance the single click-boost slot.
 * A running boost is left alone until it ends. The next roll replaces it.
 * `rng` is called only when a wait or a boost is rolled.
 */
export function advanceBoostClock(clock: BoostClock, era: Era, now: number, rng: () => number): BoostAdvance {
  const config = boostConfigFor(era)
  let active = clock.activeBoost
  let nextAt = clock.nextBoostAt
  let idleSince = clock.idleSince

  if (active && now >= active.endsAt) {
    idleSince = active.endsAt
    active = null
    nextAt = scheduleNextBoostAt(idleSince, config.meanWaitMs, rng(), true)
  }

  if (!active) {
    if (nextAt == null) {
      nextAt = scheduleNextBoostAt(idleSince, config.meanWaitMs, rng(), false)
    }
    const force = shouldForceBoost(now, idleSince, config.meanWaitMs)
    if (force || now >= nextAt) {
      const spawned = rollClickBoost(era, rng(), rng(), now)
      return {
        clock: { activeBoost: spawned, nextBoostAt: null, idleSince },
        spawned,
      }
    }
  }

  return {
    clock: { activeBoost: active, nextBoostAt: nextAt, idleSince },
    spawned: null,
  }
}
