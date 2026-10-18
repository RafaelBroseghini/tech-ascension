import { describe, expect, it } from "vitest"
import { DEFAULT_UI_FONT_ID, UI_FONTS, isUiFontId, uiFontById } from "./uiFonts.ts"

describe("UI fonts", () => {
  it("has unique ids and a stack and a sane scale for every row", () => {
    expect(new Set(UI_FONTS.map((font) => font.id)).size).toBe(UI_FONTS.length)
    for (const font of UI_FONTS) {
      expect(font.name.length).toBeGreaterThan(0)
      expect(font.stack).toMatch(/,\s*(sans-serif|monospace)$/)
      expect(font.scale).toBeGreaterThan(0.7)
      expect(font.scale).toBeLessThanOrEqual(1.1)
    }
  })

  it("defaults to Chakra Petch at scale 1, the face the layout was drawn in", () => {
    expect(UI_FONTS[0]!.id).toBe(DEFAULT_UI_FONT_ID)
    expect(uiFontById(DEFAULT_UI_FONT_ID).scale).toBe(1)
  })

  it("answers the default for an unknown or missing id", () => {
    expect(uiFontById("comic-sans").id).toBe(DEFAULT_UI_FONT_ID)
    expect(uiFontById(null).id).toBe(DEFAULT_UI_FONT_ID)
    expect(isUiFontId("comic-sans")).toBe(false)
    for (const font of UI_FONTS) expect(isUiFontId(font.id)).toBe(true)
  })
})
