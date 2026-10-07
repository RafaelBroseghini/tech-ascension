/**
 * Traffic dots on a canvas: the whiteboard's reveal and the desk drawing share the path math and the loop. Nothing here
 * imports `@xyflow/react` or Motion, so the desk can.
 */

export type Pt = { readonly x: number; readonly y: number }
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

/** `lane.dots` dots, evenly spaced and shifted `phase` (0 to 1) along the lane. At phase 0 they sit mid-slot. */
export function paintDots(ctx: CanvasRenderingContext2D, lanes: readonly Lane[], phase: number, radius: number): void {
  for (const lane of lanes) {
    for (let k = 0; k < lane.dots; k++) {
      const p = pointAt(lane, (phase + (k + 0.5) / lane.dots) % 1)
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
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
