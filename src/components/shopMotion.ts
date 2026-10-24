import { useEffect, useLayoutEffect, useRef } from "react"
import type { RefObject } from "react"
import { enterRef, laidOut, motionReady, playing, prefersReducedMotion } from "./useMotion.ts"
import type { Playing } from "./useMotion.ts"

/**
 * A shop list slides and fades in from the side the tab it replaces lies on (its `data-slide` is 1 when that tab is
 * further along the bar, -1 when it is behind). The shop's own scrolling and measuring act at once; this only moves it.
 */
export const listEnter = enterRef({
  fade: { in: 0.16, out: 0 },
  move: { from: (el) => ({ x: 12 * (el.dataset.slide === "-1" ? -1 : 1) }), to: {}, spring: { stiffness: 520, damping: 34, mass: 0.8 } },
})

type Placed = { x: number; width: number; color: string }
type BarState = { placed: Placed | null; running: Playing | null }

/** Puts the bar under the strip's active tab (see `useTabBar`), and keeps it there while the strip changes. Returns its cleanup. */
function slideBar(el: HTMLElement, state: BarState): (() => void) | undefined {
  const strip = el.parentElement
  if (!strip) return
  const measure = (): Placed | null => {
    const tab = strip.querySelector<HTMLElement>(".era-tab.active")
    if (!tab || !laidOut(tab)) return null
    // The tab's own colour, resolved: Motion cannot read a var().
    el.style.backgroundColor = tab.style.getPropertyValue("--tab-glow") || "var(--accent)"
    return { x: tab.offsetLeft, width: tab.offsetWidth, color: getComputedStyle(el).backgroundColor }
  }
  const put = (to: Placed) => {
    el.style.transform = `translateX(${to.x}px)`
    el.style.width = `${to.width}px`
    el.style.backgroundColor = to.color
    state.placed = to
  }
  // A strip that is not laid out yet (the docked sheet) has nothing to place: the observers below place the bar once it is.
  const to = measure()
  const from = state.placed
  const motion = motionReady()
  state.running?.finish()
  state.running = null
  if (to && (!from || !motion || prefersReducedMotion() || (from.x === to.x && from.width === to.width))) {
    put(to)
  } else if (to && motion) {
    el.style.backgroundColor = from!.color
    const slide = motion.animate(el, { x: [from!.x, to.x], width: [from!.width, to.width], backgroundColor: [from!.color, to.color] }, { type: "spring", stiffness: 520, damping: 38, mass: 0.9 })
    state.placed = to
    // The play leaves the end values in place, which is where the bar rests.
    state.running = { finish: () => slide.complete() }
  }
  // A strip that changes (the window resizes, a label gains a badge, a tab opens before this one) re-places the bar where
  // its tab now is. A resize observer reports once as it starts, which is not a change.
  const replace = () => {
    const now = measure()
    if (!now) return
    state.running?.finish()
    put(now)
  }
  let first = true
  const size = new ResizeObserver(() => {
    if (first) first = false
    else replace()
  })
  const tabs = new MutationObserver(replace)
  size.observe(strip)
  for (const tab of strip.querySelectorAll(".era-tab")) size.observe(tab)
  tabs.observe(strip, { childList: true })
  return () => {
    size.disconnect()
    tabs.disconnect()
  }
}

/**
 * The bar under a tab strip slides (a spring) to whichever tab is active, taking that tab's colour with it. `mark` is the
 * bar's element, inside the strip, which is its positioned parent; the active tab is the one with the `active` class.
 * It is placed at once on the first render, on a resize and under reduced motion, and without Motion it simply jumps.
 */
export function useTabBar(mark: RefObject<HTMLElement | null>, active: string) {
  const state = useRef<BarState>({ placed: null, running: null })
  useLayoutEffect(() => {
    const el = mark.current
    return el ? slideBar(el, state.current) : undefined
  }, [mark, active])
}

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
