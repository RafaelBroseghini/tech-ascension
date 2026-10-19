import { describe, expect, it } from "vitest"
import { CAT_ROSTER } from "./catRoster.ts"
import {
  catGone,
  catOpacity,
  FADE_MS,
  isGif,
  MAX_STEP_MS,
  MIN_STAY_MS,
  nextSwapDelay,
  oldestStaying,
  PARADE_MAX,
  PARADE_MIN,
  PARADE_OPACITY,
  PARADE_SIZE,
  paradeCap,
  paradeCount,
  paradeGifs,
  pickCat,
  spawnCat,
  stepCat,
  SWAP_MIN_MS,
  SWAP_SPAN_MS,
  type ParadeCat,
} from "./catParade.ts"

const cat = (over: Partial<ParadeCat> = {}): ParadeCat => ({ url: "a.gif", x: 10, y: 10, vx: 0, vy: 0, bornAt: 0, leavingAt: null, ...over })

describe("cat parade", () => {
  it("parades the found gifs only, in discovery order", () => {
    const gifs = CAT_ROSTER.filter((row) => isGif(row.url)).map((row) => row.url)
    const pngs = CAT_ROSTER.filter((row) => !isGif(row.url)).map((row) => row.url)
    expect(gifs.length).toBeGreaterThan(0)
    expect(paradeGifs([pngs[0]!, gifs[1]!, gifs[0]!])).toEqual([gifs[1], gifs[0]])
  })

  it("caps the screen between the phone and desktop counts, and never above the gifs found", () => {
    expect(paradeCap(375, 667)).toBe(PARADE_MIN)
    expect(paradeCap(320, 480)).toBe(PARADE_MIN)
    expect(paradeCap(1920, 1080)).toBe(PARADE_MAX)
    expect(paradeCap(3840, 2160)).toBe(PARADE_MAX)
    const mid = paradeCap(1280, 800)
    expect(mid).toBeGreaterThan(PARADE_MIN)
    expect(mid).toBeLessThan(PARADE_MAX)
    expect(paradeCount(PARADE_MAX, 3)).toBe(3)
    expect(paradeCount(PARADE_MIN, 500)).toBe(PARADE_MIN)
  })

  it("picks a gif not on screen, and falls back to any when all are showing", () => {
    expect(pickCat([], new Set())).toBeNull()
    expect(pickCat(["a", "b", "c"], new Set(["a", "c"]), () => 0.9)).toBe("b")
    expect(pickCat(["a", "b"], new Set(["a", "b"]), () => 0.99)).toBe("b")
  })

  it("spawns inside the box at drift speed", () => {
    const born = spawnCat("a.gif", 800, 600, 5, () => 0.999)
    expect(born.x).toBeLessThanOrEqual(800 - PARADE_SIZE)
    expect(born.y).toBeLessThanOrEqual(600 - PARADE_SIZE)
    expect(born.bornAt).toBe(5)
    expect(Math.hypot(born.vx, born.vy)).toBeGreaterThan(0)
  })

  it("bounces off the edges like the DVD logo", () => {
    const right = stepCat(cat({ x: 800 - PARADE_SIZE - 1, vx: 100 }), 50, 800, 600)
    expect(right.vx).toBe(-100)
    expect(right.x).toBeLessThanOrEqual(800 - PARADE_SIZE)
    const top = stepCat(cat({ y: 1, vy: -100 }), 50, 800, 600)
    expect(top.vy).toBe(100)
    expect(top.y).toBeGreaterThanOrEqual(0)
  })

  it("does not jump through walls after a long frame, and pulls a cat back into a smaller window", () => {
    const moved = stepCat(cat({ x: 100, vx: 100 }), 10_000, 800, 600)
    expect(moved.x).toBeCloseTo(100 + (100 * MAX_STEP_MS) / 1000)
    const shrunk = stepCat(cat({ x: 700, y: 500, vx: 10, vy: 10 }), 16, 400, 300)
    expect(shrunk.x).toBeLessThanOrEqual(400 - PARADE_SIZE)
    expect(shrunk.y).toBeLessThanOrEqual(300 - PARADE_SIZE)
  })

  it("fades in, holds and fades out", () => {
    expect(catOpacity(cat({ bornAt: 100 }), 0)).toBe(0)
    expect(catOpacity(cat(), FADE_MS / 2)).toBeCloseTo(PARADE_OPACITY / 2)
    expect(catOpacity(cat(), FADE_MS * 3)).toBe(PARADE_OPACITY)
    const leaving = cat({ leavingAt: 10_000 })
    expect(catOpacity(leaving, 10_000 + FADE_MS / 2)).toBeCloseTo(PARADE_OPACITY / 2)
    expect(catGone(leaving, 10_000 + FADE_MS - 1)).toBe(false)
    expect(catGone(leaving, 10_000 + FADE_MS)).toBe(true)
  })

  it("swaps one cat every one to two seconds, the oldest that has had its minimum stay", () => {
    expect(nextSwapDelay(() => 0)).toBe(SWAP_MIN_MS)
    expect(nextSwapDelay(() => 1)).toBe(SWAP_MIN_MS + SWAP_SPAN_MS)
    const cats = [cat({ bornAt: 3000 }), cat({ bornAt: 1000, leavingAt: 9000 }), cat({ bornAt: 2000 })]
    expect(oldestStaying(cats, 2000 + MIN_STAY_MS)).toBe(2)
    expect(oldestStaying(cats, 2000 + MIN_STAY_MS - 1)).toBe(-1)
  })
})
