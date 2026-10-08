/** Traffic dots on a canvas: the path math and the animation loop for the whiteboard's reveal. */

export type Pt = { readonly x: number; readonly y: number }
/** A polyline from The Users to a leaf, with how many dots ride it. */
export type Lane = { readonly points: readonly Pt[]; readonly length: readonly number[]; readonly total: number; readonly dots: number }

export function laneOf(points: readonly Pt[], dots: number): Lane {
  const length = [0]
  for (let i = 1; i < points.length; i++) length.push(length[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  return { points, length, total: length[length.length - 1] || 1, dots }
}

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

export type Dot = { readonly at: Pt; readonly alpha: number }

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
    dots.push(
      stalls
        ? { at: pointAt(lane, STALL_AT * Math.min(1, t / 0.6)), alpha: t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 }
        : { at: pointAt(lane, t), alpha: 1 },
    )
  }
  return dots
}

/** Without motion, the dots sit evenly along the lane. */
export const stillDots = (lane: Lane): Dot[] => Array.from({ length: lane.dots }, (_, k) => ({ at: pointAt(lane, (k + 0.5) / lane.dots), alpha: 1 }))

/** Fills `dots` at the context's current alpha, each scaled by its own. */
export function paintDots(ctx: CanvasRenderingContext2D, dots: readonly Dot[], radius: number): void {
  const base = ctx.globalAlpha
  for (const dot of dots) {
    ctx.globalAlpha = base * dot.alpha
    ctx.beginPath()
    ctx.arc(dot.at.x, dot.at.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = base
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
