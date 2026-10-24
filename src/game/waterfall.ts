/** Click fountain: a developer-icon from the owned pool, tossed up high from just above the cursor, falling to the bottom of the screen and bouncing there a few times before it sinks away. */

export const WATERFALL_CAP = 24
/** The toss peaks between RISE_MIN and RISE_MIN + RISE_SPAN px above the start. */
export const RISE_MIN = 80
export const RISE_SPAN = 50
/** Sideways reach of a logo, px: a landing zone each side, so a burst fans out instead of stacking. */
export const REACH_MIN = 50
export const REACH_SPAN = 190
/** Payout text: a lower arc and a reach of its own, wider than the logos' (the money goes one way and the XP the other). */
export const LOOT_RISE_MIN = 30
export const LOOT_RISE_SPAN = 30
export const LOOT_REACH_MIN = 90
export const LOOT_REACH_SPAN = 150
/** How long the payout text lives (its CSS animation), ms. */
export const LOOT_MS = 1100

/** Gravity on a logo, px per second squared. */
export const GRAVITY = 2600
/** The share of its speed a logo keeps on hitting the ground. */
export const RESTITUTION = 0.52
/** A bounce slower than this (px/s) is the last: the logo comes to rest. */
export const REST_SPEED = 150
/** At rest the logo waits, then sinks through the floor while it fades. */
export const REST_MS = 220
export const SINK_MS = 700
/** The logo stays this far above the viewport's bottom edge while it bounces (its centre is size / 2 more), px. */
export const GROUND_MARGIN = 2

export type Drop = {
  id: number
  x: number
  y: number
  dx: number
  rise: number
  fall: number
  rot: number
  size: number
  icon: string
  /** The whole path, sampled: bounce, roll, sink. */
  frames: readonly DropFrame[]
  /** How long the path takes, ms: when the drop can be removed. */
  life: number
}

/** One sample of a drop's path: where it is (from its start), how it is turned and squashed, and how visible. */
export type DropFrame = { t: number; x: number; y: number; rot: number; sx: number; sy: number; o: number }

/** How far above the pointer the fountain starts. A finger covers more than a cursor does, so a touch starts higher. */
export const fountainLift = (touch: boolean): number => (touch ? 48 : 22)

/** One logo's toss: a side (alternating, so the fountain fans out both ways), a sideways reach and a peak. */
export function toss(side: 1 | -1, random: () => number = Math.random): { dx: number; rise: number } {
  return { dx: side * (REACH_MIN + random() * REACH_SPAN), rise: RISE_MIN + random() * RISE_SPAN }
}

/** One payout label's toss: a lower arc and a wider reach than a logo's. */
export function tossLoot(side: 1 | -1, random: () => number = Math.random): { dx: number; rise: number } {
  return { dx: side * (LOOT_REACH_MIN + random() * LOOT_REACH_SPAN), rise: LOOT_RISE_MIN + random() * LOOT_RISE_SPAN }
}

/** Px from a drop's start (its centre) down to where it rests on the viewport's bottom edge, never negative. */
export const fallDistance = (viewportHeight: number, y: number, size: number): number => Math.max(0, viewportHeight - y - size / 2 - GROUND_MARGIN)

const STEP_S = 1 / 120
/** One frame is written for every this many steps, plus one at each landing. */
const SAMPLE_EVERY = 4

/**
 * The path of a logo thrown up `rise` px with `dx` px of sideways reach over its first second, falling `fall` px to the
 * ground. Gravity pulls it down, each landing keeps `RESTITUTION` of its speed and squashes it for a frame, the sideways
 * speed and the spin die away as it bounces, and once it is at rest it waits `REST_MS` and sinks through the floor,
 * fading. Pure, so a test can read every bounce.
 */
export function dropPath(rise: number, dx: number, fall: number, rot: number): DropFrame[] {
  const frames: DropFrame[] = []
  let y = 0
  let x = 0
  let angle = 0
  let vy = -Math.sqrt(2 * GRAVITY * Math.max(1, rise))
  let vx = dx
  // The spin the throw gave it, in degrees a second: `rot` is the half turn it would make in a second.
  let spin = rot * 2
  let t = 0
  let step = 0
  let sx = 1
  let sy = 1
  const push = (o = 1) => frames.push({ t: Math.round(t * 1000), x, y, rot: angle, sx, sy, o })
  push()
  let landed = false
  while (!landed) {
    vy += GRAVITY * STEP_S
    y += vy * STEP_S
    x += vx * STEP_S
    angle += spin * STEP_S
    t += STEP_S
    step += 1
    let hit = false
    if (y >= fall && vy > 0) {
      y = fall
      hit = true
      if (vy * RESTITUTION < REST_SPEED) landed = true
      vy = -vy * RESTITUTION
      vx *= 0.8
      spin *= 0.55
    }
    if (hit) {
      sx = 1.22
      sy = 0.78
      push()
      sx = 1
      sy = 1
    } else if (step % SAMPLE_EVERY === 0) push()
    if (t > 12) break
  }
  // At rest: it slides a little further, waits, then sinks.
  const rest = { x, y, angle }
  const restFrames = Math.round(REST_MS / 1000 / (STEP_S * SAMPLE_EVERY))
  const slide = vx * 0.12
  for (let i = 1; i <= restFrames; i += 1) {
    t += STEP_S * SAMPLE_EVERY
    x = rest.x + slide * (1 - (1 - i / restFrames) ** 2)
    push()
  }
  const sinkFrames = Math.round(SINK_MS / 1000 / (STEP_S * SAMPLE_EVERY))
  const base = { x, angle }
  for (let i = 1; i <= sinkFrames; i += 1) {
    const u = i / sinkFrames
    t += STEP_S * SAMPLE_EVERY
    // Smoothstep for both the sink and the fade, so it melts away instead of dropping and snapping out.
    const ease = u * u * (3 - 2 * u)
    y = rest.y + ease * 40
    angle = base.angle
    x = base.x
    frames.push({ t: Math.round(t * 1000), x, y, rot: angle, sx: 1, sy: 1 - 0.35 * ease, o: 1 - ease })
  }
  return frames
}

/** How long a path takes, ms. */
export const pathMs = (frames: readonly DropFrame[]): number => frames[frames.length - 1]?.t ?? 0

/** A pair per click, one thrown each way like a fountain's two jets; a boost adds one or two more pairs. */
export function waterfallCount(boosted: boolean, random: () => number = Math.random): number {
  return boosted ? 4 + 2 * Math.floor(random() * 2) : 2
}

/** Newest wins: once the cap is hit the oldest thumbs are dropped from the list. */
export function capDrops<T>(current: readonly T[], born: readonly T[], cap: number = WATERFALL_CAP): T[] {
  return [...current, ...born].slice(-cap)
}
