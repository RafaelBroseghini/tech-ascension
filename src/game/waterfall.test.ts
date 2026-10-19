import { describe, expect, it } from "vitest"
import { fallDistance, FALL_MS, LOOT_RISE_SCALE, RISE_MIN, RISE_SPAN, toss, WATERFALL_CAP } from "./waterfall.ts"

describe("click fountain toss", () => {
  it("peaks between RISE_MIN and RISE_MIN + RISE_SPAN and alternates the side", () => {
    expect(toss(1, () => 0).rise).toBe(RISE_MIN)
    expect(toss(-1, () => 0.999999).rise).toBeCloseTo(RISE_MIN + RISE_SPAN, 3)
    expect(Math.sign(toss(1, () => 0.5).dx)).toBe(1)
    expect(Math.sign(toss(-1, () => 0.5).dx)).toBe(-1)
  })

  it("tosses well above the old 34-56 px peak", () => {
    expect(RISE_MIN).toBeGreaterThanOrEqual(34 * 1.6)
    expect(RISE_MIN + RISE_SPAN).toBeLessThanOrEqual(56 * 2 + 1)
  })

  it("falls to just past the viewport bottom from anywhere, and never backwards", () => {
    expect(fallDistance(800, 300, 24)).toBe(524)
    expect(fallDistance(800, 790, 24)).toBe(34)
    expect(fallDistance(800, 900, 24)).toBe(0)
  })

  it("lets payout text keep a lower arc than the logos", () => {
    expect(RISE_MIN * LOOT_RISE_SCALE).toBeLessThan(RISE_MIN)
  })

  it("keeps drops alive long enough to land and the cap above one click burst", () => {
    expect(FALL_MS).toBeGreaterThanOrEqual(1800)
    expect(WATERFALL_CAP).toBeGreaterThanOrEqual(12)
  })
})
