import { afterEach, describe, expect, it } from "vitest"
import { burstAlive, easeOut, flashAlpha, fxSlowdown, makeBurst, setFxSlowdown, shardAlpha, sparkAlpha, stepBurst, waveAt } from "./unlockFx.ts"

const COLORS = { accent: "#a6e3a1", light: "#ffffff", ink: "#11111b" }
const UNIT = 192

/** A rand that walks a fixed ladder, so a burst is the same every run. */
function ladder(): () => number {
  let n = 0
  return () => ((n++ * 0.6180339887) % 1)
}

describe("a burst", () => {
  it("throws more for an unlock than for a cleared gig, with a second wave only for the big one", () => {
    const unlock = makeBurst("unlock", UNIT, COLORS, ladder())
    const clear = makeBurst("clear", UNIT, COLORS, ladder())
    expect(unlock.shards.length).toBeGreaterThan(clear.shards.length)
    expect(unlock.sparks.length).toBeGreaterThan(clear.sparks.length)
    expect(unlock.waves).toHaveLength(2)
    expect(clear.waves).toHaveLength(1)
    expect(unlock.waves[1]!.delay).toBeGreaterThan(0)
  })

  it("scales with the sprite, so a phone's art and a desktop's read the same", () => {
    const small = makeBurst("unlock", 128, COLORS, ladder())
    const large = makeBurst("unlock", 192, COLORS, ladder())
    expect(large.waves[0]!.reach / small.waves[0]!.reach).toBeCloseTo(192 / 128, 5)
    expect(large.flash.radius / small.flash.radius).toBeCloseTo(192 / 128, 5)
  })

  it("draws shards in whole pixels and only in the palette it was given", () => {
    const burst = makeBurst("unlock", UNIT, COLORS, ladder())
    for (const shard of burst.shards) {
      expect(Number.isInteger(shard.size)).toBe(true)
      expect(shard.size).toBeGreaterThanOrEqual(3)
      expect([COLORS.accent, COLORS.light]).toContain(shard.color)
    }
  })

  it("leaves the centre in every direction", () => {
    const burst = makeBurst("unlock", UNIT, COLORS, ladder())
    stepBurst(burst, 0.2)
    const quadrants = new Set(burst.shards.map((shard) => `${Math.sign(shard.x)}${shard.y < -UNIT * 0.2 ? "up" : "down"}`))
    expect(quadrants.size).toBeGreaterThanOrEqual(3)
    for (const shard of burst.shards) expect(Math.hypot(shard.x, shard.y)).toBeGreaterThan(0)
  })

  it("arcs: a shard slows, then gravity pulls it down", () => {
    const burst = makeBurst("unlock", UNIT, COLORS, ladder())
    const shard = burst.shards[0]!
    const speed0 = Math.hypot(shard.vx, shard.vy)
    for (let i = 0; i < 20; i++) stepBurst(burst, 0.016)
    expect(Math.hypot(shard.vx, shard.vy)).toBeLessThan(speed0)
    const vy = shard.vy
    for (let i = 0; i < 40; i++) stepBurst(burst, 0.016)
    expect(shard.vy).toBeGreaterThan(vy)
  })

  it("gives a spark a tail: the place it was a step ago", () => {
    const burst = makeBurst("unlock", UNIT, COLORS, ladder())
    stepBurst(burst, 0.016)
    stepBurst(burst, 0.016)
    const spark = burst.sparks[0]!
    expect(spark.px).not.toBe(spark.x)
    expect(Math.hypot(spark.x - spark.px, spark.y - spark.py)).toBeGreaterThan(0)
  })

  it("ages by the time it is given, however that time is split into frames", () => {
    const a = makeBurst("unlock", UNIT, COLORS, ladder())
    const b = makeBurst("unlock", UNIT, COLORS, ladder())
    stepBurst(a, 0.016)
    stepBurst(a, 0.016)
    stepBurst(b, 0.032)
    expect(a.flash.age).toBeCloseTo(b.flash.age, 9)
    expect(a.shards[0]!.age).toBeCloseTo(b.shards[0]!.age, 9)
  })

  it("is over in about a second and a half, and not before its last wave", () => {
    const burst = makeBurst("unlock", UNIT, COLORS, ladder())
    expect(burstAlive(burst)).toBe(true)
    let t = 0
    while (burstAlive(burst) && t < 5) {
      stepBurst(burst, 0.016)
      t += 0.016
    }
    expect(burstAlive(burst)).toBe(false)
    expect(t).toBeGreaterThan(1)
    expect(t).toBeLessThan(2)
  })
})

describe("the curves", () => {
  it("eases out, hard, and clamps", () => {
    expect(easeOut(0)).toBe(0)
    expect(easeOut(1)).toBe(1)
    expect(easeOut(0.5)).toBeGreaterThan(0.8)
    expect(easeOut(-1)).toBe(0)
    expect(easeOut(2)).toBe(1)
  })

  it("holds a wave back until its delay, thins its glow as it goes and fades it out", () => {
    const [near, far] = makeBurst("unlock", UNIT, COLORS, ladder()).waves
    expect(waveAt(far!)).toBeNull()
    far!.age = far!.delay + 0.01
    expect(waveAt(far!)).not.toBeNull()
    const early = waveAt({ ...near!, age: 0.05 })!
    const late = waveAt({ ...near!, age: near!.life * 0.9 })!
    expect(late.radius).toBeGreaterThan(early.radius)
    expect(late.width).toBeLessThan(early.width)
    expect(late.alpha).toBeLessThan(early.alpha)
    expect(waveAt({ ...near!, age: near!.life })).toBeNull()
  })

  it("fades a shard over its last third, a spark all the way and the flash fast", () => {
    expect(shardAlpha({ age: 0, life: 1 })).toBe(1)
    expect(shardAlpha({ age: 0.6, life: 1 })).toBe(1)
    expect(shardAlpha({ age: 0.9, life: 1 })).toBeLessThan(1)
    expect(shardAlpha({ age: 1, life: 1 })).toBe(0)
    expect(sparkAlpha({ age: 0, life: 1 })).toBe(1)
    expect(sparkAlpha({ age: 0.5, life: 1 })).toBeLessThan(0.5)
    const flash = makeBurst("unlock", UNIT, COLORS, ladder()).flash
    expect(flashAlpha({ ...flash, age: 0 })).toBe(1)
    expect(flashAlpha({ ...flash, age: flash.life / 2 })).toBeCloseTo(0.25, 5)
    expect(flashAlpha({ ...flash, age: flash.life })).toBe(0)
  })
})

describe("the slowdown a designer can set", () => {
  afterEach(() => setFxSlowdown(1))

  it("is real time until asked, and ignores anything that would speed it up or break it", () => {
    expect(fxSlowdown()).toBe(1)
    setFxSlowdown(4)
    expect(fxSlowdown()).toBe(4)
    setFxSlowdown(0.2)
    expect(fxSlowdown()).toBe(1)
    setFxSlowdown(Number.NaN)
    expect(fxSlowdown()).toBe(1)
  })
})
