import type { Era } from "./capital.ts"

/**
 * Click-only boosts. These multiply click power for a short window.
 * Idle $/s is never multiplied. Researcher can retune this table
 * without touching the store or the shop UI.
 *
 * Spawn: after a boost ends, wait BOOST_GRACE_MS, then
 * wait = meanWaitMs * -ln(1 - rand), clamped to
 * [BOOST_WAIT_MIN_FACTOR, BOOST_WAIT_MAX_FACTOR] × mean.
 * If no boost has landed for BOOST_PITY_FACTOR × mean since the last
 * end (or this session's start), force a roll.
 * One boost at a time: a new roll replaces the active one.
 *
 * Multipliers are only 3×, 5× and 10×. Mean waits run from 4 minutes early to
 * 12 minutes at the end, so a boost is an event you notice, not the normal pace.
 * Gold chrome is UI: activeBoost.mult >= GOLD_MULT_THRESHOLD.
 */
export const GOLD_MULT_THRESHOLD = 8
export const BOOST_GRACE_MS = 1_000
export const BOOST_WAIT_MIN_FACTOR = 0.5
export const BOOST_WAIT_MAX_FACTOR = 2.5
export const BOOST_PITY_FACTOR = 2.5

export type BoostWeight = {
  mult: number
  /** Relative weight. 70 means 70% when the row sums to 100. */
  weight: number
}

export type BoostEraConfig = {
  /** Mean wait between the end of one boost and the next roll. */
  meanWaitMs: number
  durMinMs: number
  durMaxMs: number
  weights: readonly BoostWeight[]
}

export const BOOST_BY_ERA: Record<Era, BoostEraConfig> = {
  early: {
    meanWaitMs: 240_000,
    durMinMs: 8_000,
    durMaxMs: 12_000,
    weights: [
      { mult: 3, weight: 70 },
      { mult: 5, weight: 25 },
      { mult: 10, weight: 5 },
    ],
  },
  mid: {
    meanWaitMs: 360_000,
    durMinMs: 8_000,
    durMaxMs: 12_000,
    weights: [
      { mult: 3, weight: 55 },
      { mult: 5, weight: 35 },
      { mult: 10, weight: 10 },
    ],
  },
  upper: {
    meanWaitMs: 480_000,
    durMinMs: 6_000,
    durMaxMs: 10_000,
    weights: [
      { mult: 3, weight: 40 },
      { mult: 5, weight: 40 },
      { mult: 10, weight: 20 },
    ],
  },
  q3: {
    meanWaitMs: 600_000,
    durMinMs: 5_000,
    durMaxMs: 8_000,
    weights: [
      { mult: 3, weight: 25 },
      { mult: 5, weight: 45 },
      { mult: 10, weight: 30 },
    ],
  },
  end: {
    meanWaitMs: 720_000,
    durMinMs: 5_000,
    durMaxMs: 8_000,
    weights: [
      { mult: 3, weight: 15 },
      { mult: 5, weight: 40 },
      { mult: 10, weight: 45 },
    ],
  },
}

export type ActiveBoost = {
  mult: number
  endsAt: number
}
