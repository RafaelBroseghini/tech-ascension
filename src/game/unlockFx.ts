/**
 * The unlock celebration, as a simulation with no screen in it. A burst is a flash, a pair of shockwaves, chunky
 * shards that arc and fall, and sparks that streak out and fade. Everything is measured against `unit` (the sprite's
 * size in pixels) so a phone's 128px art and a desktop's 192px art read the same. The canvas that draws it is
 * `src/components/UnlockFx.tsx`; the sprite's own squash and spring beside it are played there with Motion.
 * Positions are pixels from the burst's centre, time is seconds.
 */

export type FxKind = "unlock" | "clear"

export type FxColors = {
  /** The era's glow: the shards, the flash and the near wave. */
  accent: string
  /** The far wave and some sparks, near white in a dark theme. */
  light: string
  /** The outline on a shard. */
  ink: string
}

export type Shard = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; size: number; age: number; life: number; color: string }
export type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; width: number; age: number; life: number; color: string }
/** A ring that grows from nothing to `reach` and thins as it goes. `delay` holds it back after the flash. */
export type Wave = { age: number; delay: number; life: number; reach: number; width: number; color: string }
/** The light at the centre: a glow, and `rays` thin lines that flare out of it for the first moment. */
export type Flash = { age: number; life: number; radius: number; color: string; rays: number; twist: number }

export type Burst = {
  kind: FxKind
  unit: number
  shards: Shard[]
  sparks: Spark[]
  waves: Wave[]
  flash: Flash
}

type Rand = () => number

/** How many of each a burst throws: an unlock is the big one, a cleared gig a smaller cousin. */
const COUNTS: Record<FxKind, { shards: number; sparks: number }> = {
  unlock: { shards: 30, sparks: 44 },
  clear: { shards: 16, sparks: 22 },
}

const GRAVITY = 5.4
const SHARD_DRAG = 2.1
const SPARK_DRAG = 3.2

const between = (rand: Rand, lo: number, hi: number) => lo + rand() * (hi - lo)

export function makeBurst(kind: FxKind, unit: number, colors: FxColors, rand: Rand = Math.random): Burst {
  const big = kind === "unlock"
  const counts = COUNTS[kind]
  const shards: Shard[] = Array.from({ length: counts.shards }, (_, index) => {
    // Evenly spread round the circle with a little jitter, so no side is bare.
    const angle = ((index + between(rand, -0.35, 0.35)) / counts.shards) * Math.PI * 2
    const speed = unit * between(rand, 1.5, 3.6)
    // Whole pixels, like the art: a shard is a square or a chip, never a blur.
    const size = Math.max(3, Math.round(unit * between(rand, 0.03, 0.062)))
    return {
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - unit * 0.9,
      rot: between(rand, 0, Math.PI),
      spin: between(rand, -9, 9),
      size,
      age: 0,
      life: between(rand, 0.85, 1.45),
      color: rand() < 0.62 ? colors.accent : rand() < 0.5 ? colors.light : colors.accent,
    }
  })
  const sparks: Spark[] = Array.from({ length: counts.sparks }, () => {
    const angle = between(rand, 0, Math.PI * 2)
    const speed = unit * between(rand, 2.6, 6.2)
    return {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      width: Math.max(1.5, unit * between(rand, 0.008, 0.016)),
      age: 0,
      life: between(rand, 0.35, 0.8),
      color: rand() < 0.5 ? colors.light : colors.accent,
    }
  })
  // `width` is how far the wave's glow trails behind its leading edge.
  const waves: Wave[] = [{ age: 0, delay: 0, life: big ? 0.7 : 0.5, reach: unit * (big ? 1.5 : 1.1), width: unit * (big ? 0.34 : 0.26), color: colors.accent }]
  if (big) waves.push({ age: 0, delay: 0.1, life: 0.95, reach: unit * 1.85, width: unit * 0.18, color: colors.light })
  return {
    kind,
    unit,
    shards,
    sparks,
    waves,
    flash: { age: 0, life: big ? 0.45 : 0.3, radius: unit * (big ? 1.05 : 0.8), color: colors.accent, rays: big ? 14 : 8, twist: between(rand, 0, Math.PI) },
  }
}

/** Moves a burst on by `dt` seconds. Mutates it: the screen runs this every frame and nothing else holds the arrays. */
export function stepBurst(burst: Burst, dt: number): void {
  const shardDrag = Math.exp(-SHARD_DRAG * dt)
  const sparkDrag = Math.exp(-SPARK_DRAG * dt)
  const gravity = GRAVITY * burst.unit * dt
  for (const shard of burst.shards) {
    shard.age += dt
    shard.vx *= shardDrag
    shard.vy = shard.vy * shardDrag + gravity
    shard.x += shard.vx * dt
    shard.y += shard.vy * dt
    shard.rot += shard.spin * dt
  }
  for (const spark of burst.sparks) {
    spark.age += dt
    spark.px = spark.x
    spark.py = spark.y
    spark.vx *= sparkDrag
    spark.vy = spark.vy * sparkDrag + gravity * 0.25
    spark.x += spark.vx * dt
    spark.y += spark.vy * dt
  }
  for (const wave of burst.waves) wave.age += dt
  burst.flash.age += dt
}

/** True while anything of the burst is still on screen. */
export function burstAlive(burst: Burst): boolean {
  return (
    burst.flash.age < burst.flash.life ||
    burst.waves.some((wave) => wave.age < wave.delay + wave.life) ||
    burst.shards.some((shard) => shard.age < shard.life) ||
    burst.sparks.some((spark) => spark.age < spark.life)
  )
}

/** Eases out hard: the shockwave leaves fast and settles. */
export const easeOut = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

/** How far a wave has travelled, how far its glow trails and how bright, at its own age. Null before its delay or after its life. */
export function waveAt(wave: Wave): { radius: number; width: number; alpha: number } | null {
  const t = (wave.age - wave.delay) / wave.life
  if (t < 0 || t >= 1) return null
  return { radius: wave.reach * easeOut(t), width: wave.width * (1 - t * 0.6), alpha: (1 - t) ** 1.6 }
}

/** A shard holds its colour, then fades over its last third. */
export const shardAlpha = (shard: Pick<Shard, "age" | "life">): number => Math.min(1, Math.max(0, (shard.life - shard.age) / (shard.life * 0.34)))

/** A spark fades the whole way, brightest at birth. */
export const sparkAlpha = (spark: Pick<Spark, "age" | "life">): number => Math.min(1, Math.max(0, 1 - spark.age / spark.life)) ** 1.3

/** The flash is a bright pop that falls away quickly. */
export const flashAlpha = (flash: Flash): number => (flash.age >= flash.life ? 0 : (1 - flash.age / flash.life) ** 2)

/**
 * The time scale a designer can slow the effect by to see it frame by frame (`forceCelebration` in the harness).
 * 1 is real time. It only reaches the screen's clock, never the simulation's rules.
 */
let slowdown = 1
export const fxSlowdown = (): number => slowdown
export function setFxSlowdown(factor: number): void {
  slowdown = Number.isFinite(factor) && factor >= 1 ? factor : 1
}
