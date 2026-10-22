import { describe, expect, it } from "vitest"
import {
  dropPath,
  fallDistance,
  GRAVITY,
  GROUND_MARGIN,
  LOOT_REACH_MIN,
  LOOT_REACH_SPAN,
  LOOT_RISE_MIN,
  LOOT_RISE_SPAN,
  pathMs,
  REACH_MIN,
  REACH_SPAN,
  REST_SPEED,
  RESTITUTION,
  RISE_MIN,
  RISE_SPAN,
  toss,
  tossLoot,
  WATERFALL_CAP,
} from "./waterfall.ts"

describe("click fountain toss", () => {
  it("peaks between RISE_MIN and RISE_MIN + RISE_SPAN and alternates the side", () => {
    expect(toss(1, () => 0).rise).toBe(RISE_MIN)
    expect(toss(-1, () => 0.999999).rise).toBeCloseTo(RISE_MIN + RISE_SPAN, 3)
    expect(Math.sign(toss(1, () => 0.5).dx)).toBe(1)
    expect(Math.sign(toss(-1, () => 0.5).dx)).toBe(-1)
  })

  it("tosses far above the old 34-56 px peak, and then the old 60-100 px one", () => {
    expect(RISE_MIN).toBeGreaterThanOrEqual(100 * 1.4)
    expect(RISE_MIN + RISE_SPAN).toBeGreaterThanOrEqual(100 * 2.2)
  })

  it("lands a logo on the viewport's bottom edge from anywhere, and never backwards", () => {
    expect(fallDistance(800, 300, 24)).toBe(800 - 300 - 12 - GROUND_MARGIN)
    expect(fallDistance(800, 790, 24)).toBe(0)
    expect(fallDistance(800, 900, 24)).toBe(0)
  })

  it("keeps the payout text on a lower arc than the logos, and spreads it wider", () => {
    expect(LOOT_RISE_MIN + LOOT_RISE_SPAN).toBeLessThan(RISE_MIN)
    expect(LOOT_REACH_MIN).toBeGreaterThan(REACH_MIN)
    expect(LOOT_REACH_MIN + LOOT_REACH_SPAN).toBeGreaterThanOrEqual(REACH_MIN + REACH_SPAN * 0.7)
    expect(tossLoot(1, () => 0).dx).toBe(LOOT_REACH_MIN)
    expect(tossLoot(-1, () => 0).dx).toBe(-LOOT_REACH_MIN)
    expect(tossLoot(1, () => 0).rise).toBe(LOOT_RISE_MIN)
  })

  it("keeps the cap above one click burst", () => {
    expect(WATERFALL_CAP).toBeGreaterThanOrEqual(12)
  })
})

describe("a logo's path", () => {
  const path = (rise = 200, dx = 120, fall = 600, rot = 40) => dropPath(rise, dx, fall, rot)

  it("starts at the pointer, whole and opaque", () => {
    expect(path()[0]).toMatchObject({ t: 0, x: 0, y: 0, sx: 1, sy: 1, o: 1 })
  })

  it("rises to the toss's peak before it falls", () => {
    const frames = path(200, 120, 600)
    const peak = Math.min(...frames.map((f) => f.y))
    // Sampled at 30 Hz, so a little short of the true peak.
    expect(peak).toBeLessThan(-190)
    expect(peak).toBeGreaterThan(-205)
  })

  it("lands on the ground and bounces a few times, each lower than the last", () => {
    const fall = 600
    const frames = path(200, 120, fall)
    const landings = frames.filter((f) => f.sx > 1.1)
    expect(landings.length).toBeGreaterThanOrEqual(3)
    expect(landings.length).toBeLessThanOrEqual(6)
    // Between two landings it climbs less each time.
    const heights: number[] = []
    let top = fall
    for (const f of frames) {
      if (f.y < top) top = f.y
      if (f.y >= fall - 0.01 && top < fall - 1) {
        heights.push(fall - top)
        top = fall
      }
    }
    expect(heights.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < heights.length; i += 1) expect(heights[i]!).toBeLessThan(heights[i - 1]!)
    // The first bounce keeps about RESTITUTION squared of the drop from the apex, and the last is under REST_SPEED's height.
    expect(heights[1]! / heights[0]!).toBeCloseTo(RESTITUTION ** 2, 1)
    expect(heights[heights.length - 1]!).toBeLessThan((REST_SPEED / RESTITUTION) ** 2 / (2 * GRAVITY) + 2)
  })

  it("squashes on each landing", () => {
    const frames = path()
    expect(frames.some((f) => f.sx > 1.1 && f.sy < 0.9)).toBe(true)
  })

  it("keeps going sideways while it bounces, slowing down, and stays on the screen's floor", () => {
    const fall = 600
    const frames = path(200, 150, fall)
    expect(frames[frames.length - 1]!.x).toBeGreaterThan(150 * 0.8)
    for (const f of frames) expect(f.y).toBeLessThanOrEqual(fall + 36 + 0.01)
  })

  it("rests, then sinks through the floor and fades to nothing", () => {
    const fall = 500
    const frames = path(180, -100, fall)
    const last = frames[frames.length - 1]!
    expect(last.o).toBe(0)
    expect(last.y).toBeGreaterThan(fall)
    expect(frames.some((f) => f.o < 1 && f.o > 0)).toBe(true)
    // It is fully visible the whole time it bounces.
    const fadeStart = frames.findIndex((f) => f.o < 1)
    expect(frames.slice(0, fadeStart).every((f) => f.o === 1)).toBe(true)
  })

  it("is a path in time: increasing, and a few seconds long from a tall screen", () => {
    const frames = path(200, 120, 900)
    for (let i = 1; i < frames.length; i += 1) expect(frames[i]!.t).toBeGreaterThanOrEqual(frames[i - 1]!.t)
    expect(pathMs(frames)).toBeGreaterThan(2000)
    expect(pathMs(frames)).toBeLessThan(6000)
  })

  it("still lands and goes when the click is on the floor itself", () => {
    const frames = path(150, 80, 0)
    expect(frames.length).toBeGreaterThan(2)
    expect(frames[frames.length - 1]!.o).toBe(0)
    expect(pathMs(frames)).toBeLessThan(3000)
  })
})
