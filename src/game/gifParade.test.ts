import { describe, expect, it } from "vitest"
import { PARADE_STYLES, parseParadeStyleId } from "../data/paradeStyles.ts"
import type { ParadeStyleId } from "../data/paradeStyles.ts"
import { CAT_ROSTER } from "./catRoster.ts"
import {
  catGone,
  catOpacity,
  FADE_MS,
  isGif,
  MIN_STAY_MS,
  nextSwapDelay,
  oldestStaying,
  PARADE_MAX,
  PARADE_MIN,
  PARADE_OPACITY,
  PARADE_SIZE,
  paradeAt,
  paradeCap,
  paradeCount,
  catGifs,
  pickCat,
  spawnCat,
  SWAP_MIN_MS,
  SWAP_SPAN_MS,
  type ParadeGif,
  REDUCED_MOTION_SCALE,
} from "./gifParade.ts"

const cat = (over: Partial<ParadeGif> = {}): ParadeGif => ({ url: "a.gif", seed: [0, 0, 0, 0], bornAt: 0, leavingAt: null, ...over })
const BOX = { width: 800, height: 600 }
const W = BOX.width - PARADE_SIZE
const H = BOX.height - PARADE_SIZE
/** Styles that loop round and pass a cat's width past the edges, where the layer clips them. */
const LOOPING = new Set<ParadeStyleId>(["rain", "bubbles", "wave", "conga", "zigzag", "tornado"])

function seeded(n: number): () => number {
  let state = n * 9301 + 49297
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

describe("gif parade", () => {
  it("parades the found gifs only, in discovery order", () => {
    const gifs = CAT_ROSTER.filter((row) => isGif(row.url)).map((row) => row.url)
    const pngs = CAT_ROSTER.filter((row) => !isGif(row.url)).map((row) => row.url)
    expect(gifs.length).toBeGreaterThan(0)
    expect(catGifs([pngs[0]!, gifs[1]!, gifs[0]!])).toEqual([gifs[1], gifs[0]])
  })

  it("caps the stage between the phone and desktop counts, and never above the gifs found", () => {
    expect(paradeCap(320, 300)).toBe(PARADE_MIN)
    expect(paradeCap(2560, 1300)).toBe(PARADE_MAX)
    const mid = paradeCap(800, 700)
    expect(mid).toBeGreaterThan(PARADE_MIN)
    expect(mid).toBeLessThan(PARADE_MAX)
    expect(paradeCount(PARADE_MAX, 3)).toBe(3)
    expect(paradeCount(PARADE_MIN, 500)).toBe(PARADE_MIN)
  })

  it("picks a gif not on screen, and falls back to any when all are showing", () => {
    expect(pickCat([], new Set())).toBeNull()
    expect(pickCat(["a", "b", "c"], new Set(["a", "c"]), () => 0.9)).toBe("b")
    expect(pickCat(["a", "b"], new Set(["a", "b"]), () => 0.99)).toBe("b")
    expect(spawnCat("a.gif", 5, () => 0.5)).toEqual({ url: "a.gif", seed: [0.5, 0.5, 0.5, 0.5], bornAt: 5, leavingAt: null })
  })

  it("keeps every style inside the stage (the looping ones within a cat of its edges)", () => {
    const random = seeded(1)
    for (const { id } of PARADE_STYLES) {
      for (let run = 0; run < 40; run += 1) {
        const seed = [random(), random(), random(), random()] as const
        const count = 1 + Math.floor(random() * PARADE_MAX)
        const slot = Math.floor(random() * count)
        const t = random() * 600
        const { x, y } = paradeAt(id, seed, { slot, count }, t, BOX)
        const slack = LOOPING.has(id) ? PARADE_SIZE : 0
        expect(Number.isFinite(x) && Number.isFinite(y), id).toBe(true)
        expect(x, id).toBeGreaterThanOrEqual(-slack - 1e-6)
        // The back of a long conga line waits off the right edge for its turn.
        if (id !== "conga") expect(x, id).toBeLessThanOrEqual(W + slack + 1e-6)
        expect(y, id).toBeGreaterThanOrEqual(-slack - 1e-6)
        expect(y, id).toBeLessThanOrEqual(H + slack + 1e-6)
      }
    }
  })

  it("bounces off the edges like the DVD logo", () => {
    // Heading 0 is straight right: it reaches the far wall and comes back.
    const at = (t: number) => paradeAt("bounce", [0, 0, 0, 0.5], { slot: 0, count: 1 }, t, BOX)
    const speed = 30
    expect(at(0)).toEqual({ x: 0, y: H / 2 })
    expect(at(W / speed).x).toBeCloseTo(W)
    expect(at((W + 100) / speed).x).toBeCloseTo(W - 100)
  })

  it("falls for the waterfall and rises for the bubbles", () => {
    const fall = (t: number) => paradeAt("rain", [0, 0.5, 0, 0], { slot: 0, count: 1 }, t, BOX).y
    const rise = (t: number) => paradeAt("bubbles", [0, 0.5, 0.5, 0], { slot: 0, count: 1 }, t, BOX).y
    expect(fall(1)).toBeGreaterThan(fall(0))
    expect(rise(1)).toBeLessThan(rise(0))
  })

  it("lines the conga along the bottom, and spaces the orbit rings evenly", () => {
    for (let slot = 0; slot < 30; slot += 1) {
      expect(paradeAt("conga", [0, 0, 0, 0], { slot, count: 30 }, 3.3, BOX).y).toBeGreaterThanOrEqual(H - PARADE_SIZE * 0.35)
    }
    const radius = (slot: number) => {
      const { x, y } = paradeAt("orbit", [0, 0, 0, 0], { slot, count: 30 }, 7, BOX)
      return Math.hypot(x - W / 2, y - H / 2)
    }
    const inner = Math.min(W, H) / 2 / 3
    expect(radius(0)).toBeCloseTo(inner)
    expect(radius(1)).toBeCloseTo(inner * 2)
    expect(radius(2)).toBeCloseTo(inner * 3)
    expect(radius(3)).toBeCloseTo(inner)
  })

  it("keeps the snake's cats nose to tail", () => {
    for (let slot = 1; slot < 30; slot += 1) {
      const head = paradeAt("snake", [0, 0, 0, 0], { slot: slot - 1, count: 30 }, 12, BOX)
      const tail = paradeAt("snake", [0, 0, 0, 0], { slot, count: 30 }, 12, BOX)
      expect(Math.hypot(head.x - tail.x, head.y - tail.y)).toBeLessThan(PARADE_SIZE * 1.5)
    }
  })

  it("reads a saved style and falls back to the bounce", () => {
    expect(parseParadeStyleId("heart")).toBe("heart")
    expect(parseParadeStyleId("moonwalk")).toBe("bounce")
    expect(new Set(PARADE_STYLES.map((style) => style.id)).size).toBe(PARADE_STYLES.length)
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

describe("reduced motion", () => {
  it("slows the paths but never freezes them", () => {
    expect(REDUCED_MOTION_SCALE).toBeGreaterThan(0)
    expect(REDUCED_MOTION_SCALE).toBeLessThan(1)
    const box = { width: 800, height: 500 }
    const seed = [0.5, 0.1, 0.4, 0.6] as const
    const a = paradeAt("bounce", seed, { slot: 0, count: 10 }, 10 * REDUCED_MOTION_SCALE, box)
    const b = paradeAt("bounce", seed, { slot: 0, count: 10 }, 14 * REDUCED_MOTION_SCALE, box)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(5)
  })
})
