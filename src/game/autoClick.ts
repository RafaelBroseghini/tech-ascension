/**
 * Ceiling for the hover clicker. Manual clicks are not capped.
 * 20/s is the sustained rate a hover on the stage emoji pays out once every catalog row is owned.
 * Gold hover skills (src/data/gold.ts) reach slower rates earlier; `hoverRate` in gold.ts picks the live one.
 */
export const MAX_CLICKS_PER_SEC = 20

export const HOVER_CLICK_STEP_MS = 1000 / MAX_CLICKS_PER_SEC

/** Milliseconds between hover clicks at `perSec` clicks a second. */
export function hoverStepMs(perSec: number): number {
  return 1000 / Math.max(1, Math.min(MAX_CLICKS_PER_SEC, perSec))
}

/** False on touch-only devices, where there is no pointer to rest on the emoji. */
export function canHover(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true
  return !window.matchMedia("(hover: none)").matches
}

/** The hover rate this device can use: the unlocked rate with a pointer, 0 on touch. */
export function usableHoverRate(unlocked: number): number {
  return canHover() ? unlocked : 0
}
