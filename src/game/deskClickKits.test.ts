import { describe, expect, it } from "vitest"
import { CLICK_KIT_IDS, CLICK_KITS, clickKitById, parseClickKitId } from "./deskClickKits.ts"

describe("click kits", () => {
  it("offers four kits, with thock first and unchanged", () => {
    expect(CLICK_KIT_IDS).toEqual(["thock", "felt", "marimba", "pillow"])
    expect(clickKitById("thock")).toMatchObject({
      body: { min: 124, spread: 26 },
      wood: { attack: 0.005, decay: 0.08, release: 0.06, hold: 0.05, velocity: 0.2 },
      grain: { min: 1200, spread: 400, hold: 0.03, velocity: 0.08 },
    })
  })

  it("keeps every softer kit under the thock's loudness and slower to attack", () => {
    const thock = CLICK_KITS.thock
    for (const id of CLICK_KIT_IDS.filter((kit) => kit !== "thock")) {
      const kit = CLICK_KITS[id]
      expect(kit.wood.velocity).toBeLessThan(thock.wood.velocity)
      expect(kit.high.velocity).toBeLessThanOrEqual(thock.high.velocity)
      expect(kit.grain.velocity).toBeLessThan(thock.grain.velocity)
      expect(kit.wood.attack).toBeGreaterThan(thock.wood.attack)
    }
  })

  it("has finite, positive parameters and a label for each kit", () => {
    for (const id of CLICK_KIT_IDS) {
      const kit = CLICK_KITS[id]
      expect(kit.id).toBe(id)
      expect(kit.label.length).toBeGreaterThan(0)
      const numbers = [
        ...Object.values(kit.body),
        kit.wood.attack, kit.wood.decay, kit.wood.release, kit.wood.hold, kit.wood.velocity,
        kit.high.ratio, kit.high.attack, kit.high.decay, kit.high.release, kit.high.hold, kit.high.velocity,
        ...Object.values(kit.grain),
      ]
      for (const value of numbers) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThan(0)
      }
    }
  })

  it("falls back to thock", () => {
    expect(parseClickKitId("pillow")).toBe("pillow")
    expect(parseClickKitId("nope")).toBe("thock")
    expect(parseClickKitId(undefined)).toBe("thock")
  })
})
