import { describe, expect, it } from "vitest"
import type { SheetDrag } from "./shopDock.ts"
import { clampExpanded, DOCK_FLICK_SPEED, DOCK_SETTLE_SHARE, DOCK_TAP_SLOP, dockOffset, EXPAND_FLOOR_SHARE, EXPAND_MIN, isDockTap, settleDock, settleSheet, sheetHeight } from "./shopDock.ts"

const travel = 300
const slow = (dy: number) => Math.ceil(Math.abs(dy) / DOCK_FLICK_SPEED) * 4
const past = Math.ceil(travel * DOCK_SETTLE_SHARE) + 1
const short = Math.floor(travel * DOCK_SETTLE_SHARE) - 1

describe("shop dock", () => {
  it("leaves the sheet where it was when a drag comes back to where it began", () => {
    expect(isDockTap(DOCK_TAP_SLOP - 1)).toBe(true)
    expect(isDockTap(DOCK_TAP_SLOP)).toBe(false)
    expect(settleDock({ docked: true, dy: 0, ms: 600, travel })).toBe(true)
    expect(settleDock({ docked: false, dy: 2, ms: 600, travel })).toBe(false)
  })

  it("docks a slow drag down past the settle share, and springs back from a short one", () => {
    expect(settleDock({ docked: false, dy: past, ms: slow(past), travel })).toBe(true)
    expect(settleDock({ docked: false, dy: short, ms: slow(short), travel })).toBe(false)
  })

  it("opens a docked sheet on a slow drag up past the settle share", () => {
    expect(settleDock({ docked: true, dy: -past, ms: slow(past), travel })).toBe(false)
    expect(settleDock({ docked: true, dy: -short, ms: slow(short), travel })).toBe(true)
  })

  it("settles a flick in its direction however short", () => {
    const dy = DOCK_TAP_SLOP + 4
    const ms = Math.floor(dy / DOCK_FLICK_SPEED) - 1
    expect(settleDock({ docked: false, dy, ms, travel })).toBe(true)
    expect(settleDock({ docked: true, dy: -dy, ms, travel })).toBe(false)
  })

  it("does not dock a sheet dragged up, or open one dragged down", () => {
    expect(settleDock({ docked: false, dy: -past, ms: slow(past), travel })).toBe(false)
    expect(settleDock({ docked: true, dy: past, ms: slow(past), travel })).toBe(true)
  })

  it("clamps the offset to the travel", () => {
    expect(dockOffset(false, travel * 2, travel)).toBe(travel)
    expect(dockOffset(false, -40, travel)).toBe(0)
    expect(dockOffset(true, -40, travel)).toBe(40)
  })
})

describe("shop sheet expansion", () => {
  const rowsHeight = 300
  const dockHeight = 46
  const maxHeight = 600
  const drag = (over: Partial<SheetDrag>): SheetDrag => ({ mode: "rows", height: rowsHeight, dy: 0, ms: 800, rowsHeight, maxHeight, dockHeight, ...over })
  const expanded = (height: number, over: Partial<SheetDrag> = {}) => drag({ mode: "expanded", height, ...over })

  it("grows live under a finger dragged up, never past the top of the screen", () => {
    expect(sheetHeight(drag({ dy: -100 }))).toBe(rowsHeight + 100)
    expect(sheetHeight(drag({ dy: -5000 }))).toBe(maxHeight)
  })

  it("still docks live from the three rows when dragged down, and stops at the bar", () => {
    expect(sheetHeight(drag({ dy: 60 }))).toBe(rowsHeight - 60)
    expect(sheetHeight(drag({ dy: 5000 }))).toBe(dockHeight)
  })

  it("keeps an upward drag from the three rows expanded at that height", () => {
    expect(settleSheet(drag({ dy: -150 }))).toEqual({ mode: "expanded", height: rowsHeight + 150 })
    expect(settleSheet(drag({ dy: -5000, ms: 4000 }))).toEqual({ mode: "expanded", height: maxHeight })
  })

  it("springs back to three rows from a drag up that barely moved", () => {
    expect(settleSheet(drag({ dy: -(EXPAND_MIN - 1), ms: 800 }))).toEqual({ mode: "rows" })
    expect(settleSheet(drag({ dy: -2 }))).toEqual({ mode: "rows" })
  })

  it("docks from the three rows exactly as before", () => {
    const travel = rowsHeight - dockHeight
    const dy = Math.ceil(travel * DOCK_SETTLE_SHARE) + 1
    expect(settleSheet(drag({ dy, ms: slow(dy) }))).toEqual({ mode: "docked" })
    expect(settleSheet(drag({ dy: 10, ms: slow(10) }))).toEqual({ mode: "rows" })
  })

  it("opens a docked bar to three rows, never past them", () => {
    expect(settleSheet(drag({ mode: "docked", height: dockHeight, dy: -200, ms: 800 }))).toEqual({ mode: "rows" })
    expect(settleSheet(drag({ mode: "docked", height: dockHeight, dy: -5, ms: 800 }))).toEqual({ mode: "docked" })
    expect(sheetHeight(drag({ mode: "docked", height: dockHeight, dy: -5000 }))).toBe(rowsHeight)
  })

  it("adjusts an expanded sheet freely in both directions", () => {
    expect(settleSheet(expanded(450, { dy: -100 }))).toEqual({ mode: "expanded", height: 550 })
    expect(settleSheet(expanded(450, { dy: 80, ms: 800 }))).toEqual({ mode: "expanded", height: 370 })
    expect(settleSheet(expanded(450, { dy: -5000, ms: 4000 }))).toEqual({ mode: "expanded", height: maxHeight })
  })

  it("leaves an expanded sheet alone when the finger comes back to where it began", () => {
    expect(settleSheet(expanded(450, { dy: 1 }))).toEqual({ mode: "expanded", height: 450 })
  })

  it("snaps an expanded sheet released near or below the three rows back to three rows", () => {
    expect(settleSheet(expanded(450, { dy: 450 - rowsHeight + 10, ms: 2000 }))).toEqual({ mode: "rows" })
    expect(settleSheet(expanded(450, { dy: 450 - rowsHeight * EXPAND_FLOOR_SHARE + 80, ms: 2000 }))).toEqual({ mode: "rows" })
  })

  it("never docks from expanded, even on a hard flick or a pull far below the three rows", () => {
    expect(settleSheet(expanded(450, { dy: 80, ms: Math.floor(80 / DOCK_FLICK_SPEED) - 1 }))).toEqual({ mode: "rows" })
    expect(settleSheet(expanded(450, { dy: 5000, ms: 20000 }))).toEqual({ mode: "rows" })
  })

  it("holds the live height of an expanded sheet above the floor", () => {
    expect(sheetHeight(expanded(450, { dy: 5000 }))).toBe(rowsHeight * EXPAND_FLOOR_SHARE)
  })

  it("clamps a stored height to the new room, and never below the three rows", () => {
    expect(clampExpanded(700, rowsHeight, 500)).toBe(500)
    expect(clampExpanded(200, rowsHeight, 500)).toBe(rowsHeight)
    expect(clampExpanded(400, rowsHeight, 250)).toBe(rowsHeight)
  })
})
