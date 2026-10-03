/**
 * Ceiling for the endgame hover clicker. Manual clicks are not capped.
 * 20/s is the sustained rate a hover on the stage emoji pays out.
 */
export const MAX_CLICKS_PER_SEC = 20

export const HOVER_CLICK_STEP_MS = 1000 / MAX_CLICKS_PER_SEC
