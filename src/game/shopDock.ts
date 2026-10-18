/**
 * The phone shop's bottom sheet: drag the grip down to dock it to a bar, tap or drag up to bring it back. Pure, so the
 * gesture rules run under the node tests; `ShopGrip.tsx` feeds it the pointer and commits the answer.
 */

/** Under this many pixels a press is a tap, not a drag. */
export const DOCK_TAP_SLOP = 8
/** A drag past this share of the travel settles on the far side. */
export const DOCK_SETTLE_SHARE = 1 / 3
/** A flick this fast (px per ms) settles in its direction, however short. */
export const DOCK_FLICK_SPEED = 0.5

export interface DockDrag {
  /** Where the sheet started. */
  readonly docked: boolean
  /** Finger travel since the press; positive is down. */
  readonly dy: number
  /** Time since the press, in ms. */
  readonly ms: number
  /** Pixels between the docked bar and the open sheet. */
  readonly travel: number
}

export function isDockTap(dy: number): boolean {
  return Math.abs(dy) < DOCK_TAP_SLOP
}

/** How far the sheet has moved toward the other state, in px, clamped to the travel. */
export function dockOffset(docked: boolean, dy: number, travel: number): number {
  const toward = docked ? -dy : dy
  return Math.min(Math.max(toward, 0), Math.max(travel, 0))
}

/** Whether the sheet ends docked once the finger lifts. A tap flips it. */
export function settleDock({ docked, dy, ms, travel }: DockDrag): boolean {
  if (isDockTap(dy)) return !docked
  const speed = dy / Math.max(ms, 1)
  if (Math.abs(speed) >= DOCK_FLICK_SPEED) return speed > 0
  const moved = dockOffset(docked, dy, travel)
  return moved >= Math.max(travel, 0) * DOCK_SETTLE_SHARE ? !docked : docked
}
