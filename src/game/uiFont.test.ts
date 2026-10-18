// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_UI_FONT_ID, uiFontById } from "../data/uiFonts.ts"
import { readPref } from "./ledger.ts"
import { clearUiFontPreview, FONT_PREVIEW_REST_MS, getSavedUiFont, getUiFont, parseUiFontId, previewUiFont, setUiFont, subscribeUiFont } from "./uiFont.ts"

const root = () => document.documentElement

describe("UI font", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setUiFont(DEFAULT_UI_FONT_ID)
    vi.runAllTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("falls back to Chakra Petch for an empty or unknown id", () => {
    expect(parseUiFontId(null)).toBe(DEFAULT_UI_FONT_ID)
    expect(parseUiFontId("comic-sans")).toBe(DEFAULT_UI_FONT_ID)
  })

  it("persists a known face under the font pref and ignores anything else", () => {
    setUiFont("space-grotesk")
    expect(getUiFont().id).toBe("space-grotesk")
    expect(readPref("font")).toBe("space-grotesk")

    setUiFont("not-a-font")
    expect(getUiFont().id).toBe("space-grotesk")
    expect(readPref("font")).toBe("space-grotesk")
  })

  it("paints the face and its scale onto the root", () => {
    setUiFont("jetbrains-mono")
    const font = uiFontById("jetbrains-mono")
    expect(root().style.getPropertyValue("--font-display")).toBe(font.stack)
    expect(root().style.getPropertyValue("--font-scale")).toBe(String(font.scale))
    expect(root().dataset.uiFont).toBe("jetbrains-mono")
  })

  it("previews once the pointer rests, without saving; leaving paints the saved face back", () => {
    const heard = vi.fn()
    const stop = subscribeUiFont(heard)

    previewUiFont("pixelify-sans")
    expect(root().dataset.uiFont).toBe(DEFAULT_UI_FONT_ID)
    vi.advanceTimersByTime(FONT_PREVIEW_REST_MS)
    expect(root().dataset.uiFont).toBe("pixelify-sans")
    expect(getUiFont().id).toBe("pixelify-sans")
    expect(getSavedUiFont().id).toBe(DEFAULT_UI_FONT_ID)
    expect(readPref("font")).toBe(DEFAULT_UI_FONT_ID)
    expect(heard).not.toHaveBeenCalled()

    previewUiFont("nope")
    expect(getUiFont().id).toBe("pixelify-sans")

    clearUiFontPreview()
    expect(root().dataset.uiFont).toBe(DEFAULT_UI_FONT_ID)
    expect(readPref("font")).toBe(DEFAULT_UI_FONT_ID)
    stop()
  })

  it("sweeping across rows paints only the one the pointer rests on", () => {
    previewUiFont("space-grotesk")
    vi.advanceTimersByTime(30)
    previewUiFont("atkinson")
    vi.advanceTimersByTime(FONT_PREVIEW_REST_MS)
    expect(root().dataset.uiFont).toBe("atkinson")
  })

  it("a click on the previewed row keeps the face and tells subscribers once", () => {
    const heard = vi.fn()
    const stop = subscribeUiFont(heard)
    previewUiFont("atkinson")
    vi.advanceTimersByTime(FONT_PREVIEW_REST_MS)
    setUiFont("atkinson")
    setUiFont("atkinson")
    expect(getSavedUiFont().id).toBe("atkinson")
    expect(readPref("font")).toBe("atkinson")
    expect(heard).toHaveBeenCalledTimes(1)
    stop()
  })

  it("reads a face that was already stored", async () => {
    vi.resetModules()
    const ledger = await import("./ledger.ts")
    ledger.writePref("font", "atkinson")
    const fresh = await import("./uiFont.ts")
    expect(fresh.getUiFont().id).toBe("atkinson")
  })
})
