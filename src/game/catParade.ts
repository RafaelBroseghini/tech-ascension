/** Cat parade: the roster gifs found so far drift across the screen and bounce off its edges, DVD logo style. */

/** On-screen cap: PARADE_MIN on a phone, PARADE_MAX on a full HD desktop, scaled by viewport area between. */
export const PARADE_MIN = 30
export const PARADE_MAX = 50
const SMALL_AREA = 375 * 667
const LARGE_AREA = 1920 * 1080
/** Rendered size of one cat, px. */
export const PARADE_SIZE = 40
/** One cat fades out and a fresh one fades in every SWAP_MIN_MS to SWAP_MIN_MS + SWAP_SPAN_MS. */
export const SWAP_MIN_MS = 1000
export const SWAP_SPAN_MS = 1000
export const FADE_MS = 600
/** A cat stays at least this long, so a small collection drifts instead of blinking in and out. */
export const MIN_STAY_MS = 6000
export const PARADE_OPACITY = 0.85
/** Drift speed, px per second. */
export const SPEED_MIN = 30
export const SPEED_SPAN = 40
/** A frame longer than this (a tab coming back from the background) moves as if it were this long. */
export const MAX_STEP_MS = 100

export type ParadeCat = {
  url: string
  x: number
  y: number
  /** px per second */
  vx: number
  vy: number
  bornAt: number
  /** When it began to fade out; null while it stays. */
  leavingAt: number | null
}

export const isGif = (url: string): boolean => /\.gif(?:$|\?)/i.test(url)

/** The found cats that move: gifs only, in discovery order. */
export const paradeGifs = (found: readonly string[]): string[] => found.filter(isGif)

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

export function spawnCat(
  url: string,
  width: number,
  height: number,
  now: number,
  random: () => number = Math.random,
  size: number = PARADE_SIZE,
): ParadeCat {
  const angle = random() * Math.PI * 2
  const speed = SPEED_MIN + random() * SPEED_SPAN
  return {
    url,
    x: random() * Math.max(0, width - size),
    y: random() * Math.max(0, height - size),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    bornAt: now,
    leavingAt: null,
  }
}

function bounce(pos: number, vel: number, max: number): [number, number] {
  if (pos < 0) return [Math.min(-pos, max), Math.abs(vel)]
  if (pos > max) return [Math.max(0, 2 * max - pos), -Math.abs(vel)]
  return [pos, vel]
}

/** Move `dtMs` and reflect off the edges. A cat outside the box (the window shrank) is brought back in. */
export function stepCat(cat: ParadeCat, dtMs: number, width: number, height: number, size: number = PARADE_SIZE): ParadeCat {
  const dt = Math.max(0, Math.min(MAX_STEP_MS, dtMs)) / 1000
  const [x, vx] = bounce(cat.x + cat.vx * dt, cat.vx, Math.max(0, width - size))
  const [y, vy] = bounce(cat.y + cat.vy * dt, cat.vy, Math.max(0, height - size))
  return { ...cat, x, y, vx, vy }
}

export function catOpacity(cat: ParadeCat, now: number): number {
  const fadeIn = Math.min(1, Math.max(0, (now - cat.bornAt) / FADE_MS))
  const fadeOut = cat.leavingAt === null ? 1 : Math.max(0, 1 - (now - cat.leavingAt) / FADE_MS)
  return PARADE_OPACITY * Math.min(fadeIn, fadeOut)
}

export const catGone = (cat: ParadeCat, now: number): boolean => cat.leavingAt !== null && now - cat.leavingAt >= FADE_MS

export const nextSwapDelay = (random: () => number = Math.random): number => SWAP_MIN_MS + random() * SWAP_SPAN_MS

/** The cat to send off next: the one on screen longest, if it has had MIN_STAY_MS and is not already leaving. -1 for none. */
export function oldestStaying(cats: readonly ParadeCat[], now: number): number {
  let pick = -1
  for (let i = 0; i < cats.length; i += 1) {
    const cat = cats[i]!
    if (cat.leavingAt !== null || now - cat.bornAt < MIN_STAY_MS) continue
    if (pick < 0 || cat.bornAt < cats[pick]!.bornAt) pick = i
  }
  return pick
}
