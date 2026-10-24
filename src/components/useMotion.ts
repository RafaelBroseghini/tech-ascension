export type MotionModule = typeof import("motion")

export const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

// Motion is its own chunk. Nothing waits on it: a caller that needs it right now asks `motionReady()` and, when the
// chunk has not landed (or never will, offline), plays no animation and changes state all the same.
let loading: Promise<MotionModule> | null = null
let loaded: MotionModule | null = null

export function loadMotion(): Promise<MotionModule> {
  loading ??= import("motion").then(
    (module) => (loaded = module),
    (error) => {
      loading = null
      throw error
    },
  )
  return loading
}

/** Motion if it has already loaded, else null. Never waits and never starts a load: this is for the click path, and `preloadMotion` has long since started one. */
export const motionReady = (): MotionModule | null => loaded

/** Starts the download once the page has settled (from `startApp`), so the first click and the first dialog already find it. */
export function preloadMotion(): void {
  const start = () => void loadMotion().catch(() => {})
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 2000 })
  else window.setTimeout(start, 1200)
}

/** Motion commits an animation's end values as inline styles; once the element is back at rest the stylesheet takes over again. */
export function release(el: HTMLElement, names: readonly string[] = ["transform", "opacity", "text-shadow", "color"]) {
  for (const name of names) el.style.removeProperty(name)
}

/** What a caller keeps so the next animation on the same element can take over from the last. */
export type Playing = { finish: () => void }

const turns = new WeakMap<Element, number>()

/**
 * Marks a new animation on an element. The returned check says whether it is still the newest, so a stopped animation
 * that settles late cannot strip the styles of the one that replaced it.
 */
export function claim(el: Element): () => boolean {
  const turn = (turns.get(el) ?? 0) + 1
  turns.set(el, turn)
  return () => turns.get(el) === turn
}

type Play = { finished: Promise<unknown>; complete: () => void }

/**
 * Keeps hold of animations running on an element. They clear the element's inline styles when the last of them ends,
 * or at once when finished early (a cancelled animation leaves its first frame behind, so they jump to their end instead), unless a newer animation has
 * claimed the element in between.
 */
export function playing(el: HTMLElement, plays: readonly Play[], names?: readonly string[]): Playing {
  const current = claim(el)
  const rest = () => {
    if (current()) release(el, names)
  }
  // Motion commits an animation's end values around the time `finished` settles; release a frame later so it cannot write over us.
  const later = () => void requestAnimationFrame(rest)
  void Promise.all(plays.map((play) => play.finished)).then(later, later)
  return {
    finish: () => {
      for (const play of plays) play.complete()
      rest()
    },
  }
}

/** A number that just changed: its digits roll up from below and flash the accent, then rest on whatever colour the stylesheet gives them. */
export function tickUp(el: HTMLElement): Playing | null {
  const motion = motionReady()
  if (!motion || prefersReducedMotion()) return null
  const roll = motion.animate(el, { y: ["45%", "0%"], opacity: [0.2, 1] }, { duration: 0.32, ease: "easeOut" })
  const flash = motion.animate(el, { color: ["var(--accent)", "var(--accent)", ""] }, { duration: 0.32, times: [0, 0.6, 1], ease: "linear" })
  return playing(el, [roll, flash], ["transform", "opacity", "color"])
}

type Move = { scale?: number; x?: number; y?: number }
/** A fixed movement, or one worked out from the element when it arrives or leaves (a toast at the top of the screen comes from above). */
type MoveOf = Move | ((el: HTMLElement) => Move)
type Spring = { stiffness: number; damping: number; mass?: number }

/**
 * How a thing arrives and leaves. It fades on its own element; `move` is the movement that goes with it, on the element
 * itself or on a part of it (a dialog's card, while its backdrop only fades). In, the movement is a spring from `from`
 * to rest. Out, it is an ease toward `to`, because an exit should be short and should not bounce.
 */
export type Presence = {
  fade: { in: number; out: number }
  move?: { part?: (root: HTMLElement) => HTMLElement | null; from: MoveOf; to: MoveOf; spring: Spring }
}

const RESTING = { scale: 1, x: 0, y: 0 }
/** A copy still on screen after this long is removed whatever its animation says. */
const GHOST_LIMIT_MS = 700

/** Whether the element is laid out at all. Without a layout (a test DOM, a hidden tab) there is nothing to animate. */
export const laidOut = (el: Element) => el.getClientRects().length > 0

const movement = (presence: Presence) => (presence.move && !prefersReducedMotion() ? presence.move : null)

/** Plays an element in. Null when Motion has not loaded or there is no layout: then it is simply there. */
function enter(el: HTMLElement, presence: Presence): Playing | null {
  const motion = motionReady()
  if (!motion || !laidOut(el)) return null
  const move = movement(presence)
  const part = move ? (move.part?.(el) ?? el) : null
  // The first frame is painted before Motion's own tick, so the element starts hidden and the animation takes it over.
  el.style.opacity = "0"
  const fade = motion.animate(el, { opacity: [0, 1] }, { duration: presence.fade.in, ease: "easeOut" })
  const runs: Playing[] = []
  if (move && part) {
    const start = typeof move.from === "function" ? move.from(part) : move.from
    const from = Object.fromEntries(Object.entries(start).map(([key, value]) => [key, [value, RESTING[key as keyof Move]]]))
    const slide = motion.animate(part, from, { type: "spring", ...move.spring })
    if (part === el) runs.push(playing(el, [fade, slide]))
    else runs.push(playing(el, [fade]), playing(part, [slide]))
  } else {
    runs.push(playing(el, [fade]))
  }
  return { finish: () => runs.forEach((run) => run.finish()) }
}

/** A copy that is safe to leave on screen while it fades: no ids, test hooks, roles or focus, and nothing it can be clicked through. */
function scrubbed(el: HTMLElement): HTMLElement {
  const ghost = el.cloneNode(true) as HTMLElement
  for (const node of [ghost, ...ghost.querySelectorAll<HTMLElement>("*")]) {
    for (const attr of [...node.attributes]) {
      if (attr.name === "id" || attr.name === "role" || attr.name === "tabindex" || attr.name === "for" || attr.name.startsWith("aria-") || attr.name.startsWith("data-testid")) {
        node.removeAttribute(attr.name)
      }
    }
  }
  ghost.setAttribute("aria-hidden", "true")
  ghost.setAttribute("inert", "")
  ghost.style.pointerEvents = "none"
  return ghost
}

/**
 * Plays an element out after React has already removed it: a still copy is put back where it was and fades, then goes.
 * The state change that closed the thing is never held up, so there is nothing to wait on or to time out; the copy only
 * lingers for `presence.fade.out` (and is dropped after `GHOST_LIMIT_MS` whatever happens). Returns a cancel for a copy
 * not yet placed.
 */
function exit(el: HTMLElement, presence: Presence): () => void {
  const motion = motionReady()
  const parent = el.parentNode
  if (!motion || !parent || !laidOut(el)) return () => {}
  const ghost = scrubbed(el)
  const next = el.nextSibling
  let cancelled = false
  // React's dev double-run of a ref unmounts and remounts it within one task. Placing the copy a microtask later lets that
  // remount cancel it, so a dialog never flashes a ghost of itself as it opens.
  queueMicrotask(() => {
    if (cancelled || !parent.isConnected) return
    parent.insertBefore(ghost, next && next.parentNode === parent ? next : null)
    const limit = window.setTimeout(() => ghost.remove(), GHOST_LIMIT_MS)
    const gone = () => {
      window.clearTimeout(limit)
      ghost.remove()
    }
    try {
      const move = movement(presence)
      const part = move ? (move.part?.(ghost) ?? ghost) : null
      const plays = [motion.animate(ghost, { opacity: 0 }, { duration: presence.fade.out, ease: "easeIn" })]
      if (move && part) plays.push(motion.animate(part, { ...(typeof move.to === "function" ? move.to(part) : move.to) }, { duration: presence.fade.out, ease: "easeIn" }))
      void Promise.all(plays.map((play) => play.finished)).then(gone, gone)
    } catch {
      gone()
    }
  })
  return () => {
    cancelled = true
  }
}

const leaving = new WeakMap<HTMLElement, () => void>()

/**
 * A ref callback that gives an element its entrance on mount and its exit on unmount. Build it once per preset, at module
 * level, so its identity is stable across renders. Nothing here holds up a render, a state change or an unmount.
 */
export function presenceRef(presence: Presence): (el: HTMLElement | null) => (() => void) | void {
  return (el) => {
    if (!el) return
    leaving.get(el)?.()
    leaving.delete(el)
    const arriving = enter(el, presence)
    return () => {
      arriving?.finish()
      leaving.set(el, exit(el, presence))
    }
  }
}

/** The card inside a dialog's backdrop. */
const dialogCard = (backdrop: HTMLElement) =>
  backdrop.querySelector<HTMLElement>("[role='dialog'], [role='alertdialog'], [aria-modal='true']") ?? (backdrop.firstElementChild as HTMLElement | null)

/** A dialog's backdrop fades and its card springs up from a little below and a little small; closing is the reverse, quicker. */
export const dialogPresence = presenceRef({
  fade: { in: 0.18, out: 0.14 },
  move: { part: dialogCard, from: { scale: 0.94, y: 14 }, to: { scale: 0.97, y: 8 }, spring: { stiffness: 520, damping: 32, mass: 0.8 } },
})
