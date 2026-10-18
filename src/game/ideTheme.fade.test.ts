// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ideThemeById } from "../data/ideThemes.ts"
import { clearIdeThemePreview, previewIdeTheme, PREVIEW_REST_MS, setIdeTheme } from "./ideTheme.ts"

const onScreen = () => document.documentElement.dataset.ideTheme

describe("theme switching is smooth", () => {
  let fades = 0
  beforeEach(() => {
    vi.useFakeTimers()
    fades = 0
    ;(document as unknown as { startViewTransition?: unknown }).startViewTransition = (update: () => void) => {
      fades++
      update()
      return {}
    }
    setIdeTheme("mocha")
    vi.runAllTimers()
    fades = 0
  })
  afterEach(() => {
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition
    vi.useRealTimers()
  })

  it("sweeping across rows paints only the row the pointer rests on, cross-faded", () => {
    previewIdeTheme("latte")
    vi.advanceTimersByTime(30)
    previewIdeTheme("dracula")
    vi.advanceTimersByTime(30)
    previewIdeTheme("synthwave")
    expect(onScreen()).toBe("mocha")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    expect(onScreen()).toBe("synthwave")
    expect(fades).toBe(1)
  })

  it("a click on the row being previewed does not repaint, and leaving fades back once", () => {
    previewIdeTheme("latte")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    setIdeTheme("latte")
    expect(fades).toBe(1)
    previewIdeTheme("dracula")
    vi.advanceTimersByTime(PREVIEW_REST_MS)
    clearIdeThemePreview()
    expect(onScreen()).toBe("latte")
    expect(fades).toBe(3)
  })

  it("a tap (preview then click at once) fades straight to the choice", () => {
    previewIdeTheme("dracula")
    setIdeTheme("dracula")
    expect(onScreen()).toBe("dracula")
    vi.runAllTimers()
    expect(fades).toBe(1)
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
