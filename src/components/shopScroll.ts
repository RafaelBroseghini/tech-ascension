/**
 * Where a shop list rests: the very bottom. The newest row sits last (a gig board shows only the next gig, a skill
 * list appends what it opens), so a tab switch and a row appearing both land on the thing to act on next.
 */

/** Scrolls a shop list to its bottom, instantly or smoothly. */
export function scrollShopBottom(list: HTMLElement, behavior: ScrollBehavior = "auto"): void {
  const top = list.scrollHeight
  if (behavior === "smooth" && typeof list.scrollTo === "function") list.scrollTo({ top, behavior })
  else list.scrollTop = top
}

/**
 * Scrolls to the bottom now, and again as the phone sheet settles: its list is resized to three whole rows after this
 * runs (`useShopRows`), which moves the bottom. Returns the cancel for the follow-ups.
 */
export function pinShopBottom(list: HTMLElement): () => void {
  scrollShopBottom(list)
  const frame = requestAnimationFrame(() => scrollShopBottom(list))
  const settle = window.setTimeout(() => scrollShopBottom(list), 180)
  return () => {
    cancelAnimationFrame(frame)
    window.clearTimeout(settle)
  }
}
