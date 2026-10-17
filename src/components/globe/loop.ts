/**
 * Calls `frame` once per animation frame until it returns true or the returned stop runs. The loop sleeps while the tab
 * is hidden and picks up again when it shows, so a unit's place is a function of the clock and never catches up.
 */
export function animate(frame: (now: number) => boolean): () => void {
  let raf = 0
  let done = false
  const tick = (now: number) => {
    raf = 0
    if (frame(now)) done = true
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
