/** Gif parade: the unlocked gifs move round the stage together, along the picked style's path. The pool is in paradePool.ts. */
import type { ParadeStyleId } from "../data/paradeStyles.ts"

/** Cap: PARADE_MIN on a phone's stage, PARADE_MAX on a full HD desk's stage, scaled by area between. */
export const PARADE_MIN = 30
export const PARADE_MAX = 50
const SMALL_AREA = 360 * 360
const LARGE_AREA = 1280 * 900
/** Rendered size of one cat, px. */
export const PARADE_SIZE = 40
/** One gif fades out and a fresh one fades in every SWAP_MIN_MS to SWAP_MIN_MS + SWAP_SPAN_MS. */
export const SWAP_MIN_MS = 1000
export const SWAP_SPAN_MS = 1000
export const FADE_MS = 600
/** A gif stays at least this long, so a small collection drifts instead of blinking in and out. */
export const MIN_STAY_MS = 6000
export const PARADE_OPACITY = 0.85
/** Drift speed of the free styles, px per second. */
export const SPEED_MIN = 30
export const SPEED_SPAN = 40
/** A frame longer than this (a tab coming back from the background) moves the clock this far only. */
export const MAX_STEP_MS = 100

export type ParadeGif = {
  url: string
  /** Four numbers in [0, 1) for the free styles: speed, heading, start x, start y (each style reads them its own way). */
  seed: readonly [number, number, number, number]
  bornAt: number
  /** When it began to fade out; null while it stays. */
  leavingAt: number | null
}

export type ParadeBox = { width: number; height: number }

export const isGif = (url: string): boolean => /\.gif(?:$|\?)/i.test(url)

/** The found cats that can parade: gifs only, in discovery order. */
export const catGifs = (found: readonly string[]): string[] => found.filter(isGif)

export function paradeCap(width: number, height: number): number {
  const t = Math.max(0, Math.min(1, (width * height - SMALL_AREA) / (LARGE_AREA - SMALL_AREA)))
  return Math.round(PARADE_MIN + t * (PARADE_MAX - PARADE_MIN))
}

/** Never more cats than gifs found, so no cat is on screen twice. */
export const paradeCount = (cap: number, gifs: number): number => Math.max(0, Math.min(cap, gifs))

/** A gif not already showing; with every gif on screen, any of them (the caller drops the one leaving first). */
export function pickCat(pool: readonly string[], showing: ReadonlySet<string>, random: () => number = Math.random): string | null {
  if (pool.length === 0) return null
  const free = pool.filter((url) => !showing.has(url))
  const from = free.length > 0 ? free : pool
  return from[Math.floor(random() * from.length)] ?? from[0]!
}

export function spawnCat(url: string, now: number, random: () => number = Math.random): ParadeGif {
  return { url, seed: [random(), random(), random(), random()], bornAt: now, leavingAt: null }
}

export function catOpacity(cat: ParadeGif, now: number): number {
  const fadeIn = Math.min(1, Math.max(0, (now - cat.bornAt) / FADE_MS))
  const fadeOut = cat.leavingAt === null ? 1 : Math.max(0, 1 - (now - cat.leavingAt) / FADE_MS)
  return PARADE_OPACITY * Math.min(fadeIn, fadeOut)
}

export const catGone = (cat: ParadeGif, now: number): boolean => cat.leavingAt !== null && now - cat.leavingAt >= FADE_MS

export const nextSwapDelay = (random: () => number = Math.random): number => SWAP_MIN_MS + random() * SWAP_SPAN_MS

/** The cat to send off next: the one on screen longest, if it has had MIN_STAY_MS and is not already leaving. -1 for none. */
export function oldestStaying(cats: readonly ParadeGif[], now: number): number {
  let pick = -1
  for (let i = 0; i < cats.length; i += 1) {
    const cat = cats[i]!
    if (cat.leavingAt !== null || now - cat.bornAt < MIN_STAY_MS) continue
    if (pick < 0 || cat.bornAt < cats[pick]!.bornAt) pick = i
  }
  return pick
}

const TAU = Math.PI * 2
const mod = (value: number, length: number): number => (length > 0 ? ((value % length) + length) % length : 0)
const clamp = (value: number, max: number): number => Math.max(0, Math.min(max, value))
/** Back and forth between 0 and max: the DVD logo's bounce as a function of distance travelled. */
function tri(value: number, max: number): number {
  if (max <= 0) return 0
  const m = mod(value, 2 * max)
  return m > max ? 2 * max - m : m
}

export type ParadeSlot = {
  /** The cat's place in the formation, 0 to count - 1. */
  slot: number
  count: number
}

/**
 * Where a cat's top-left corner is at `t` seconds of parade time, inside a box of `box` (the stage).
 * Free styles read the cat's seed; formations (orbit, conga, heart, ...) read its slot, so a swapped cat
 * fades in where the last one left. Styles that loop round (rain, conga, ...) pass a little past the edges;
 * the layer clips them.
 */
export function paradeAt(
  style: ParadeStyleId,
  seed: ParadeGif["seed"],
  { slot, count }: ParadeSlot,
  t: number,
  box: ParadeBox,
  size: number = PARADE_SIZE,
): { x: number; y: number } {
  const W = Math.max(0, box.width - size)
  const H = Math.max(0, box.height - size)
  const cx = W / 2
  const cy = H / 2
  const R = Math.min(W, H) / 2
  const n = Math.max(1, count)
  const phase = (slot / n) * TAU
  const [s0, s1, s2, s3] = seed
  const speed = SPEED_MIN + s0 * SPEED_SPAN

  switch (style) {
    case "bounce": {
      const heading = s1 * TAU
      return { x: tri(s2 * W + Math.cos(heading) * speed * t, W), y: tri(s3 * H + Math.sin(heading) * speed * t, H) }
    }
    case "rain": {
      const fall = box.height + size
      return { x: clamp(s1 * W + Math.sin(t * 1.5 + s3 * TAU) * 6, W), y: mod(s2 * fall + speed * 1.6 * t, fall) - size }
    }
    case "bubbles": {
      const rise = box.height + size
      return { x: clamp(s1 * W + Math.sin(t * 2 + s3 * TAU) * 16, W), y: box.height - mod(s2 * rise + speed * t, rise) }
    }
    case "wave": {
      const across = box.width + size
      const x = mod(s1 * across + speed * 1.4 * t, across) - size
      const lane = H * (0.2 + 0.6 * s2)
      return { x, y: clamp(lane + Math.sin((x / Math.max(1, box.width)) * TAU * 1.5 + s3 * TAU) * H * 0.15, H) }
    }
    case "orbit": {
      const ring = slot % 3
      const perRing = Math.ceil(n / 3)
      const dir = ring % 2 === 0 ? 1 : -1
      const angle = (Math.floor(slot / 3) / perRing) * TAU + ring * 0.7 + dir * t * (0.7 / (ring + 1))
      const radius = R * ((ring + 1) / 3)
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
    }
    case "conga": {
      // A long line squeezes up to nose-to-tail; past that, the back of the train waits off the right edge.
      const gap = Math.max(size * 0.6, Math.min(size * 1.15, (box.width + size) / n))
      const loop = Math.max(box.width + size, n * gap)
      const hop = Math.abs(Math.sin(t * 6 + slot * 0.7)) * size * 0.35
      return { x: mod(slot * gap + 60 * t, loop) - size, y: H - hop }
    }
    case "spiral": {
      const angle = phase * 3 + t * 0.8
      const radius = R * (0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * 0.6 + phase)))
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
    }
    case "eight": {
      const angle = phase + t * 0.6
      return { x: cx + cx * 0.92 * Math.sin(angle), y: cy + cy * 0.85 * Math.sin(2 * angle) }
    }
    case "fireflies": {
      const a = 0.2 + s0 * 0.5
      const b = 0.25 + s1 * 0.5
      return {
        x: cx + cx * (0.6 * Math.sin(t * a + s2 * TAU) + 0.4 * Math.sin(t * b * 1.7 + s3 * TAU)),
        y: cy + cy * (0.6 * Math.sin(t * b + s3 * TAU) + 0.4 * Math.sin(t * a * 1.3 + s2 * TAU)),
      }
    }
    case "pendulum": {
      // The classic pendulum wave: each a little faster than the last, so the row drifts in and out of step.
      const length = H * (0.3 + 0.7 * ((slot + 1) / n))
      const swing = 0.7 * Math.sin(t * (1 + slot * 0.04))
      return { x: clamp(cx + Math.sin(swing) * length, W), y: clamp(Math.cos(swing) * length, H) }
    }
    case "zigzag": {
      const across = box.width + size
      return { x: mod(s1 * across + speed * t, across) - size, y: tri(s2 * H + speed * 2.4 * t, H) }
    }
    case "tornado": {
      const climb = mod(s1 + t * (0.05 + s0 * 0.04), 1)
      const radius = cx * (0.08 + 0.9 * climb)
      return { x: cx + Math.sin(s2 * TAU + t * 2.6) * radius, y: box.height - climb * (box.height + size) }
    }
    case "heart": {
      const angle = phase + t * 0.4
      const hx = 16 * Math.sin(angle) ** 3
      const hy = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)
      const scale = Math.min(cx / 16, cy / 15) * 0.95
      return { x: cx + hx * scale, y: clamp(cy - (hy + 2.5) * scale, H) }
    }
    case "snake": {
      // Every cat follows the same lissajous path, each a beat behind the one ahead.
      const at = t * 0.5 - slot * 0.07
      return { x: cx + cx * Math.sin(at * 1.3), y: cy + cy * Math.sin(at * 1.9 + 0.6) }
    }
  }
}
