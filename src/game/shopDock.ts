/**
 * The phone shop's bottom sheet has three resting heights: docked to a bar, two whole rows, and expanded (any height
 * from just above the two rows up to the top of the screen). Drag the grip down from the two rows to dock, up to
 * expand; tap a docked bar to open it, tap an expanded grip to return to two rows. Pure, so the drag rules run under
 * the node tests; `ShopGrip.tsx` feeds it the pointer and commits the answer.
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

/** Whether the sheet ends docked once the finger lifts. Taps are the button's click, not a drag. */
export function settleDock({ docked, dy, ms, travel }: DockDrag): boolean {
  // A drag that comes back to where it began changes nothing.
  if (isDockTap(dy)) return docked
  const speed = dy / Math.max(ms, 1)
  if (Math.abs(speed) >= DOCK_FLICK_SPEED) return speed > 0
  const moved = dockOffset(docked, dy, travel)
  return moved >= Math.max(travel, 0) * DOCK_SETTLE_SHARE ? !docked : docked
}

export type SheetMode = "docked" | "rows" | "expanded"

/** A sheet dragged up by less than this many px beyond the two rows is not an expansion; it springs back. */
export const EXPAND_MIN = 24
/** While expanded, the finger can pull the sheet down to this share of the two rows before it is clamped; release there snaps to two rows. */
export const EXPAND_FLOOR_SHARE = 0.7

export interface SheetDrag {
  /** Where the sheet started. */
  readonly mode: SheetMode
  /** The sheet's height at the press, in px. */
  readonly height: number
  /** Finger travel since the press; positive is down. */
  readonly dy: number
  /** Time since the press, in ms. */
  readonly ms: number
  /** Height of the sheet at two whole rows. */
  readonly rowsHeight: number
  /** The tallest the sheet may be: the room above its foot. */
  readonly maxHeight: number
  /** Height of the docked bar. */
  readonly dockHeight: number
}

export interface SheetSettle {
  readonly mode: SheetMode
  /** The resting height, only for `expanded`. */
  readonly height?: number
}

/** The tallest sheet that fits, never below the two rows (a tiny screen keeps its two rows). */
export const clampExpanded = (height: number, rowsHeight: number, maxHeight: number): number =>
  Math.min(Math.max(height, rowsHeight), Math.max(maxHeight, rowsHeight))

/** The sheet's height under the finger, in px, while dragging. */
export function sheetHeight(d: SheetDrag): number {
  const travel = Math.max(d.rowsHeight - d.dockHeight, 0)
  if (d.mode === "docked") return d.dockHeight + dockOffset(true, d.dy, travel)
  if (d.mode === "rows" && d.dy > 0) return d.rowsHeight - dockOffset(false, d.dy, travel)
  const top = Math.max(d.maxHeight, d.rowsHeight)
  const floor = d.rowsHeight * EXPAND_FLOOR_SHARE
  return Math.min(Math.max(d.height - d.dy, floor), top)
}

/**
 * Where the sheet rests once the finger lifts. Docking only happens from the two rows (or stays docked); from expanded a
 * pull down below the two rows, or a downward flick, returns to two rows rather than docking.
 */
export function settleSheet(d: SheetDrag): SheetSettle {
  const travel = Math.max(d.rowsHeight - d.dockHeight, 0)
  if (d.mode === "docked") return { mode: settleDock({ docked: true, dy: d.dy, ms: d.ms, travel }) ? "docked" : "rows" }
  if (isDockTap(d.dy)) return d.mode === "expanded" ? { mode: "expanded", height: clampExpanded(d.height, d.rowsHeight, d.maxHeight) } : { mode: "rows" }
  if (d.mode === "rows" && d.dy > 0) return { mode: settleDock({ docked: false, dy: d.dy, ms: d.ms, travel }) ? "docked" : "rows" }
  if (d.mode === "expanded" && d.dy / Math.max(d.ms, 1) >= DOCK_FLICK_SPEED) return { mode: "rows" }
  const height = clampExpanded(sheetHeight(d), d.rowsHeight, d.maxHeight)
  return height - d.rowsHeight < EXPAND_MIN ? { mode: "rows" } : { mode: "expanded", height }
}
