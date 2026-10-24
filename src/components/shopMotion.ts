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

/** The settle never starts faster than this many sheet-travels a second, whatever the finger did. */
const SETTLE_SPEED_CAP = 10

/**
 * After a drag, springs the phone shop sheet from the height the finger left it at to the height its class rests at,
 * carrying the finger's speed (px/s of height; a finger moving up is positive). The inline heights and the `is-dragging`
 * and `is-expanding` classes the drag set are cleared when it arrives. With no Motion, or under reduced motion, the
 * classes and heights go at once and the stylesheet's transition does the settling. `stop` leaves the sheet where it is.
 */
export function springSheet(sheet: HTMLElement, from: number, speed: number): { stop: () => void } {
  let run: { stop: () => void } | null = null
  const rest = () => {
    sheet.style.removeProperty("max-height")
    sheet.style.removeProperty("height")
    sheet.classList.remove("is-dragging", "is-expanding")
  }
  // After React has committed the class the release chose, which is what says where the sheet rests.
  const frame = requestAnimationFrame(() => {
    const motion = motionReady()
    if (!motion || prefersReducedMotion()) {
      rest()
      return
    }
    // The commit may have replaced the class list; no transition may run while the target is read.
    sheet.classList.add("is-dragging")
    sheet.style.removeProperty("max-height")
    sheet.style.removeProperty("height")
    sheet.classList.remove("is-expanding")
    const to = sheet.getBoundingClientRect().height
    if (Math.abs(to - from) < 1) {
      rest()
      return
    }
    const lo = Math.min(from, to)
    const hi = Math.max(from, to)
    // Never past either end: a spring that overshot would push the sheet off the screen or under its own bar.
    const write = (height: number) => {
      const h = Math.min(Math.max(height, lo), hi)
      sheet.style.maxHeight = `${h}px`
      sheet.style.height = `${h}px`
    }
    write(from)
    // Shrinking toward the three rows or the bar, the list keeps filling the sheet until it has arrived.
    if (from > to) sheet.classList.add("is-expanding")
    // A hard flick would cross the whole distance inside a frame or two; capping the speed keeps the settle readable.
    const cap = Math.abs(to - from) * SETTLE_SPEED_CAP
    const velocity = Math.min(Math.max(speed, -cap), cap)
    run = motion.animate(from, to, { type: "spring", stiffness: 520, damping: 38, velocity, restDelta: 0.5, restSpeed: 8, onUpdate: write, onComplete: rest })
  })
  return {
    stop: () => {
      cancelAnimationFrame(frame)
      run?.stop()
    },
  }
}
