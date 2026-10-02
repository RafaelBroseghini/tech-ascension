/** Click waterfall: a developer-icon from the owned pool, falling from the cursor. */

export const WATERFALL_CAP = 14
export const FALL_MS = 300

export type Drop = { id: number; x: number; y: number; dx: number; dy: number; rot: number; size: number; icon: string }

/** One thumb per click; a boost adds one or two more. */
export function waterfallCount(boosted: boolean, random: () => number = Math.random): number {
  return boosted ? 2 + Math.floor(random() * 2) : 1
}

/** Newest wins: once the cap is hit the oldest thumbs are dropped from the list. */
export function capDrops<T>(current: readonly T[], born: readonly T[], cap: number = WATERFALL_CAP): T[] {
  return [...current, ...born].slice(-cap)
}
