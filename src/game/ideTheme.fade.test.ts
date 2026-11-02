// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ideThemeById } from "../data/ideThemes.ts"
import { clearIdeThemePreview, previewIdeTheme, PREVIEW_REST_MS, releaseIdeThemePreview, setIdeTheme } from "./ideTheme.ts"

const onScreen = () => document.documentElement.dataset.ideTheme

describe("theme switching is smooth", () => {
  let fades = 0
  let hover = false
  beforeEach(() => {
    vi.useFakeTimers()
    // A touch screen unless a test says otherwise: only those fade (a hovering pointer loses its hover to the fade).
    hover = false
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(hover: hover)" ? hover : false, media: query }))
    fades = 0
    ;(document as unknown as { startViewTransition?: unknown }).startViewTransition = (update: () => void) => {
      fades++
      update()
      // Every fade acts skipped (a newer one started), as Firefox reports it: the promises reject, and an unhandled one fails the run.
      const skipped = () => Promise.reject(new DOMException("Skipped ViewTransition", "AbortError"))
      return { ready: skipped(), finished: skipped(), updateCallbackDone: skipped() }
    }
    setIdeTheme("mocha")
    vi.runAllTimers()
    fades = 0
  })
  afterEach(() => {
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("sweeping across rows paints only the row the pointer rests on, without a fade (the fade's hit testing would end the hover)", () => {
    previewIdeTheme("latte")
    vi.advanceTimersByTime(30)
    previewIdeTheme("dracula")
    vi.advanceTimersByTime(30)
    previewIdeTheme("synthwave")
    expect(onScreen()).toBe("mocha")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    expect(onScreen()).toBe("synthwave")
    expect(fades).toBe(0)
  })

  it("a click on the row being previewed does not repaint, and closing the menu fades back once", () => {
    previewIdeTheme("latte")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    setIdeTheme("latte")
    expect(onScreen()).toBe("latte")
    expect(fades).toBe(0)
    previewIdeTheme("dracula")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    clearIdeThemePreview()
    expect(onScreen()).toBe("latte")
    expect(fades).toBe(1)
  })

  it("moving from one row to the next never shows the saved palette in between", () => {
    previewIdeTheme("dracula")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    expect(onScreen()).toBe("dracula")
    fades = 0
    // The pointer leaves one row and enters the next: leave first, enter right after.
    releaseIdeThemePreview()
    previewIdeTheme("synthwave")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    expect(onScreen()).toBe("synthwave")
    // Leaving the list for good still goes back, after the rest delay.
    releaseIdeThemePreview()
    expect(onScreen()).toBe("synthwave")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    expect(onScreen()).toBe("mocha")
    expect(fades).toBe(0)
  })

  it("a tap (preview then click at once) fades straight to the choice", () => {
    previewIdeTheme("dracula")
    setIdeTheme("dracula")
    expect(onScreen()).toBe("dracula")
    vi.runAllTimers()
    expect(fades).toBe(1)
  })

  it("never fades for a pointer that hovers, even on a quick click", () => {
    hover = true
    setIdeTheme("dracula")
    expect(onScreen()).toBe("dracula")
    previewIdeTheme("latte")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    clearIdeThemePreview()
    expect(onScreen()).toBe("dracula")
    expect(fades).toBe(0)
  })

  it("tints the browser bar with the painted theme's mantle", () => {
    const meta = document.createElement("meta")
    meta.name = "theme-color"
    meta.content = "#000000"
    document.head.append(meta)
    try {
      setIdeTheme("latte")
      expect(meta.content).toBe(ideThemeById("latte").colors.mantle)
      previewIdeTheme("dracula")
      vi.advanceTimersByTime(PREVIEW_REST_MS)
      expect(meta.content).toBe(ideThemeById("dracula").colors.mantle)
      clearIdeThemePreview()
      expect(meta.content).toBe(ideThemeById("latte").colors.mantle)
    } finally {
      meta.remove()
    }
  })
})
