/** Click fountain: a developer-icon from the owned pool, tossed up from just above the cursor and falling to one side. */

export const WATERFALL_CAP = 14
export const FALL_MS = 1400

export type Drop = { id: number; x: number; y: number; dx: number; rise: number; rot: number; size: number; icon: string }

/** How far above the pointer the fountain starts. A finger covers more than a cursor does, so a touch starts higher. */
export const fountainLift = (touch: boolean): number => (touch ? 48 : 22)

/** One toss: a side (alternating, so the fountain fans out both ways), a sideways reach and a modest peak. */
export function toss(side: 1 | -1, random: () => number = Math.random): { dx: number; rise: number } {
  return { dx: side * (36 + random() * 70), rise: 34 + random() * 22 }
}

/** One thumb per click; a boost adds one or two more. */
export function waterfallCount(boosted: boolean, random: () => number = Math.random): number {
  return boosted ? 2 + Math.floor(random() * 2) : 1
}

/** Newest wins: once the cap is hit the oldest thumbs are dropped from the list. */
export function capDrops<T>(current: readonly T[], born: readonly T[], cap: number = WATERFALL_CAP): T[] {
  return [...current, ...born].slice(-cap)
}
