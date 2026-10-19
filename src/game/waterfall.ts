/** Click fountain: a developer-icon from the owned pool, tossed up from just above the cursor and falling to one side. */

// A drop lives until it has left the viewport bottom, so it stays on screen about twice as long as it once did.
export const WATERFALL_CAP = 24
export const FALL_MS = 2000
/** The toss peaks between RISE_MIN and RISE_MIN + RISE_SPAN px above the start. */
export const RISE_MIN = 60
export const RISE_SPAN = 40
/** The payout text keeps its old, lower arc: it scales the toss down rather than flying as high as a logo. */
export const LOOT_RISE_SCALE = 0.55

export type Drop = { id: number; x: number; y: number; dx: number; rise: number; fall: number; rot: number; size: number; icon: string }

/** How far above the pointer the fountain starts. A finger covers more than a cursor does, so a touch starts higher. */
export const fountainLift = (touch: boolean): number => (touch ? 48 : 22)

/** One toss: a side (alternating, so the fountain fans out both ways), a sideways reach and a peak. */
export function toss(side: 1 | -1, random: () => number = Math.random): { dx: number; rise: number } {
  return { dx: side * (36 + random() * 70), rise: RISE_MIN + random() * RISE_SPAN }
}

/** Px from a drop's start to just past the viewport bottom, so it falls off screen wherever it began. */
export const fallDistance = (viewportHeight: number, y: number, size: number): number => Math.max(0, viewportHeight - y + size)

/** One thumb per click; a boost adds one or two more. */
export function waterfallCount(boosted: boolean, random: () => number = Math.random): number {
  return boosted ? 2 + Math.floor(random() * 2) : 1
}

/** Newest wins: once the cap is hit the oldest thumbs are dropped from the list. */
export function capDrops<T>(current: readonly T[], born: readonly T[], cap: number = WATERFALL_CAP): T[] {
  return [...current, ...born].slice(-cap)
}
