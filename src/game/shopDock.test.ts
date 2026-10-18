import { describe, expect, it } from "vitest"
import { DOCK_FLICK_SPEED, DOCK_SETTLE_SHARE, DOCK_TAP_SLOP, dockOffset, isDockTap, settleDock } from "./shopDock.ts"

const travel = 300
const slow = (dy: number) => Math.ceil(Math.abs(dy) / DOCK_FLICK_SPEED) * 4
const past = Math.ceil(travel * DOCK_SETTLE_SHARE) + 1
const short = Math.floor(travel * DOCK_SETTLE_SHARE) - 1

describe("shop dock", () => {
  it("treats a press under the slop as a tap that flips the sheet", () => {
    expect(isDockTap(DOCK_TAP_SLOP - 1)).toBe(true)
    expect(isDockTap(DOCK_TAP_SLOP)).toBe(false)
    expect(settleDock({ docked: true, dy: 0, ms: 80, travel })).toBe(false)
    expect(settleDock({ docked: false, dy: 2, ms: 80, travel })).toBe(true)
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
