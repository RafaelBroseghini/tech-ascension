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
  void Promise.all(plays.map((play) => play.finished)).then(rest, rest)
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
