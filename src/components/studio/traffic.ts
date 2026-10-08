/** Traffic dots on a canvas: the path math and the animation loop for the whiteboard's reveal. */

export type Pt = { readonly x: number; readonly y: number }
/** A polyline from The Users to a leaf, with how many dots ride it. */
export type Lane = {
  readonly points: readonly Pt[]
  readonly length: readonly number[]
  readonly total: number
  readonly dots: number
  /** Where requests on this lane die: `at` is how far along it (0 to 1), `share` the part of the dots that stop there. */
  readonly dead: { readonly at: number; readonly share: number } | null
}

export function laneOf(points: readonly Pt[], dots: number, dead: Lane["dead"] = null): Lane {
  const length = [0]
  for (let i = 1; i < points.length; i++) length.push(length[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  return { points, length, total: length[length.length - 1] || 1, dots, dead }
}

/** How far along a lane (0 to 1) its `index`th point is. */
export const fractionAt = (lane: Lane, index: number): number => (lane.length[Math.min(index, lane.length.length - 1)] ?? 0) / lane.total

/** The point `f` (0 to 1) of the way along the lane. */
export function pointAt(lane: Lane, f: number): Pt {
  const d = f * lane.total
  let i = 1
  while (i < lane.length.length - 1 && lane.length[i] < d) i++
  const span = lane.length[i] - lane.length[i - 1] || 1
  const t = Math.min(1, Math.max(0, (d - lane.length[i - 1]) / span))
  const a = lane.points[i - 1]
  const b = lane.points[i]
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** A whole path takes this long at or under the target p95. */
export const FAST_TRAVEL_MS = 600
/** ...and this long at 3 times the target p95 or worse, so a slow board looks slow inside the reveal. */
export const SLOW_TRAVEL_MS = 2500

/**
 * How long a dot takes to cross a whole path: `FAST_TRAVEL_MS` at or under the target, rising in a line to
 * `SLOW_TRAVEL_MS` at 3 times the target. A p95 that is not finite never arrives, so it gets the slow time as well.
 */
export function travelMs(p95Ms: number, targetMs: number): number {
  if (!Number.isFinite(p95Ms)) return SLOW_TRAVEL_MS
  const over = Math.min(1, Math.max(0, (p95Ms / targetMs - 1) / 2))
  return FAST_TRAVEL_MS + (SLOW_TRAVEL_MS - FAST_TRAVEL_MS) * over
}

/** Dots that never arrive get this far down a path before they stall and fade. */
const STALL_AT = 0.5

export type Dot = { readonly at: Pt; readonly alpha: number; readonly dead: boolean }

/**
 * Where the dots of one path are `elapsed` ms after the reveal began. Dot `k` leaves The Users (the path's first point)
 * at `k * gap`, so no dot exists before then, and crosses the path every `travel` ms. With `stalls`, each dot stops
 * halfway and fades out instead of arriving.
 */
export function dotsAt(lane: Lane, elapsed: number, travel: number, stalls: boolean): Dot[] {
  const gap = travel / lane.dots
  const dots: Dot[] = []
  for (let k = 0; k < lane.dots; k++) {
    const age = elapsed - k * gap
    if (age < 0) continue
    const t = (age % travel) / travel
    const dead = isDead(lane, k)
    const stopAt = dead ? lane.dead!.at : stalls ? STALL_AT : null
    dots.push(
      stopAt !== null
        ? { at: pointAt(lane, stopAt * Math.min(1, t / 0.6)), alpha: t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4, dead }
        : { at: pointAt(lane, t), alpha: 1, dead: false },
    )
  }
  return dots
}

/** Dot `k` is one of the lane's dead dots, spread evenly through the stream so the deaths read as a share and not a burst. */
const isDead = (lane: Lane, k: number): boolean => lane.dead !== null && Math.floor((k + 1) * lane.dead.share) > Math.floor(k * lane.dead.share)

/** Without motion, the dots sit evenly along the lane, and the dead ones sit where they die. */
export const stillDots = (lane: Lane): Dot[] =>
  Array.from({ length: lane.dots }, (_, k) => {
    const dead = isDead(lane, k)
    return { at: pointAt(lane, dead ? lane.dead!.at : (k + 0.5) / lane.dots), alpha: 1, dead }
  })

/** Fills `dots` at the context's current alpha, each scaled by its own. */
export function paintDots(ctx: CanvasRenderingContext2D, dots: readonly Dot[], radius: number, deadColor: string): void {
  const base = ctx.globalAlpha
  const live = ctx.fillStyle
  for (const dot of dots) {
    ctx.globalAlpha = base * dot.alpha
    ctx.fillStyle = dot.dead ? deadColor : live
    ctx.beginPath()
    ctx.arc(dot.at.x, dot.at.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = base
  ctx.fillStyle = live
}

/**
 * Calls `frame` once per animation frame until it returns false or the returned stop runs. The loop sleeps while the
 * tab is hidden and picks up again when it shows, so a dot's place is a function of the clock and never catches up.
 */
export function animate(frame: (now: number) => boolean): () => void {
  let raf = 0
  let done = false
  const tick = (now: number) => {
    raf = 0
    if (!frame(now)) done = true
    else if (!document.hidden) raf = requestAnimationFrame(tick)
  }
  const resume = () => {
    if (!done && !document.hidden && raf === 0) raf = requestAnimationFrame(tick)
  }
  document.addEventListener("visibilitychange", resume)
  raf = requestAnimationFrame(tick)
  return () => {
    done = true
    document.removeEventListener("visibilitychange", resume)
    cancelAnimationFrame(raf)
  }
}
