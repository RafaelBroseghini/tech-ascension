import { useEffect, useRef } from "react"
import type { RefObject } from "react"
import { laidOut, motionReady, playing, prefersReducedMotion } from "./useMotion.ts"
import type { Playing } from "./useMotion.ts"

/** When each shop list first showed a row. Rows that arrive with the list are part of its own entrance; later ones are new. */
const listBirth = new WeakMap<Element, number>()
/** Rows that mount in one commit are one batch. A row this much later than the first one in its list has just opened. */
const SAME_BATCH_MS = 120
const STAGGER_S = 0.032

/**
 * A row that opens in a list already on screen eases in from the side, a beat behind the rows above it (its index is
 * the `--i` the row carries). The rows a tab switch brings in are not this: the list's own entrance covers them.
 * A ref callback with a stable identity, so React calls it once per row.
 */
export function rowEnter(el: HTMLElement | null) {
  const motion = motionReady()
  const list = el?.closest(".shop-list")
  if (!el || !list || !motion || !laidOut(el)) return
  const now = performance.now()
  const born = listBirth.get(list)
  if (born === undefined) {
    listBirth.set(list, now)
    return
  }
  if (now - born < SAME_BATCH_MS) return
  el.style.opacity = "0"
  if (prefersReducedMotion()) {
    playing(el, [motion.animate(el, { opacity: [0, 1] }, { duration: 0.12 })], ["opacity"])
    return
  }
  const delay = Math.min(Number(el.style.getPropertyValue("--i")) || 0, 10) * STAGGER_S
  playing(el, [motion.animate(el, { opacity: [0, 1], x: [14, 0] }, { duration: 0.36, delay, ease: "easeOut" })])
}

/** The light that sweeps across a row when it is bought. Its element exists for the length of the flash; with no Motion it stays invisible. */
export function sweepRef(el: HTMLElement | null) {
  const motion = motionReady()
  if (!el || !motion || prefersReducedMotion() || !laidOut(el)) return
  motion.animate(el, { x: ["-120%", "120%"], skewX: [-18, -18], opacity: [0.9, 0] }, { duration: 0.42, ease: "easeOut" })
}

/** The owned count jumps up in size, with the accent, and springs back. */
export function bump(el: HTMLElement): Playing | null {
  const motion = motionReady()
  if (!motion || prefersReducedMotion()) return null
  const pop = motion.animate(el, { scale: [1.6, 1] }, { type: "spring", stiffness: 600, damping: 22 })
  const flash = motion.animate(el, { color: ["var(--accent)", "var(--accent)", ""] }, { duration: 0.5, times: [0, 0.6, 1], ease: "linear" })
  return playing(el, [pop, flash], ["transform", "color"])
}

/** Plays something on an element each time `value` changes, never on the first render. */
export function useOnChange<T>(ref: RefObject<HTMLElement | null>, value: T, play: (el: HTMLElement) => Playing | null) {
  const last = useRef(value)
  const running = useRef<Playing | null>(null)
  useEffect(() => {
    if (Object.is(last.current, value)) return
    last.current = value
    const el = ref.current
    if (!el) return
    running.current?.finish()
    running.current = play(el)
  }, [ref, value, play])
}
