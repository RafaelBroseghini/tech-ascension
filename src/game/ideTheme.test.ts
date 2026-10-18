import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readPref } from "./ledger.ts"
import {
  clearIdeThemePreview,
  getIdeTheme,
  getSavedIdeTheme,
  parseIdeThemeId,
  previewIdeTheme,
  setIdeTheme,
  subscribeIdeTheme,
} from "./ideTheme.ts"

describe("editor theme", () => {
  beforeEach(() => {
    setIdeTheme("mocha")
  })

  it("falls back to Mocha for an empty or unknown id", () => {
    expect(parseIdeThemeId(null)).toBe("mocha")
    expect(parseIdeThemeId("comic-sans")).toBe("mocha")
  })

  it("persists a known theme and ignores anything else", () => {
    setIdeTheme("synthwave")
    expect(getIdeTheme().id).toBe("synthwave")
    expect(readPref("theme")).toBe("synthwave")

    setIdeTheme("not-a-theme")
    expect(getIdeTheme().id).toBe("synthwave")
    expect(readPref("theme")).toBe("synthwave")
  })

  it("previews on hover without saving, and a click keeps the palette", () => {
    const heard = vi.fn()
    const stop = subscribeIdeTheme(heard)

    previewIdeTheme("dracula")
    expect(getIdeTheme().id).toBe("dracula")
    expect(getSavedIdeTheme().id).toBe("mocha")
    expect(readPref("theme")).toBe("mocha")
    expect(heard).not.toHaveBeenCalled()

    previewIdeTheme("nope")
    expect(getIdeTheme().id).toBe("dracula")

    previewIdeTheme("mocha")
    expect(getIdeTheme().id).toBe("mocha")

    previewIdeTheme("latte")
    setIdeTheme("latte")
    expect(getIdeTheme().id).toBe("latte")
    expect(getSavedIdeTheme().id).toBe("latte")
    expect(readPref("theme")).toBe("latte")
    expect(heard).toHaveBeenCalledTimes(1)

    clearIdeThemePreview()
    expect(getIdeTheme().id).toBe("latte")
    stop()
  })

  it("tells subscribers when the choice changes", () => {
    const heard = vi.fn()
    const stop = subscribeIdeTheme(heard)
    setIdeTheme("latte")
    setIdeTheme("latte")
    expect(heard).toHaveBeenCalledTimes(1)
    stop()
  })

  it("reads a theme that was already stored", async () => {
    vi.resetModules()
    const ledger = await import("./ledger.ts")
    ledger.writePref("theme", "dracula")
    const fresh = await import("./ideTheme.ts")
    expect(fresh.getIdeTheme().id).toBe("dracula")
    expect(fresh.parseIdeThemeId("nope")).toBe("mocha")
  })

  describe("first run", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "window")

    const withOsScheme = (light: boolean) => {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { matchMedia: (query: string) => ({ matches: light && query === "(prefers-color-scheme: light)" }) },
      })
    }

    afterEach(() => {
      if (original) Object.defineProperty(globalThis, "window", original)
      else delete (globalThis as { window?: unknown }).window
    })

    it("follows a light OS when no theme is stored, without storing it", async () => {
      withOsScheme(true)
      vi.resetModules()
      const ledger = await import("./ledger.ts")
      const fresh = await import("./ideTheme.ts")
      expect(fresh.getIdeTheme().id).toBe("latte")
      expect(ledger.readPref("theme")).toBeNull()
    })

    it("starts on Mocha for a dark OS", async () => {
      withOsScheme(false)
      vi.resetModules()
      const fresh = await import("./ideTheme.ts")
      expect(fresh.getIdeTheme().id).toBe("mocha")
    })

    it("starts on Mocha where matchMedia is missing", async () => {
      Object.defineProperty(globalThis, "window", { configurable: true, value: {} })
      vi.resetModules()
      const fresh = await import("./ideTheme.ts")
      expect(fresh.getIdeTheme().id).toBe("mocha")
    })

    it("keeps a stored theme over the OS", async () => {
      withOsScheme(true)
      vi.resetModules()
      const ledger = await import("./ledger.ts")
      ledger.writePref("theme", "dracula")
      const fresh = await import("./ideTheme.ts")
      expect(fresh.getIdeTheme().id).toBe("dracula")
    })
  })
})
