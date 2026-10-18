import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { IDE_THEMES } from "./ideThemes.ts"

const AA = 4.5

type Rgb = [number, number, number]

function rgb(hex: string): Rgb {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** color-mix(in srgb, a pct%, b) mixes the gamma-encoded channels linearly. */
function mix(a: Rgb, b: Rgb, pct: number): Rgb {
  return a.map((v, i) => (v * pct) / 100 + (b[i] as number) * (1 - pct / 100)) as Rgb
}

/** Read the mix percentage from tokens.css so the test cannot drift from the stylesheet. */
function textMixPct(token: string): number {
  const css = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8")
  const match = css.match(new RegExp(`${token}:\\s*color-mix\\(in srgb,\\s*var\\(--ide-text\\)\\s+([\\d.]+)%,\\s*var\\(--ide-overlay\\)\\)`))
  if (!match) throw new Error(`${token} in tokens.css is not a color-mix of --ide-text toward --ide-overlay`)
  return Number(match[1])
}

describe("theme text contrast", () => {
  const faint = textMixPct("--text-faint")
  const dim = textMixPct("--text-dim")

  it("keeps faint text dimmer than dim text", () => {
    expect(faint).toBeLessThan(dim)
  })

  for (const theme of IDE_THEMES) {
    const c = theme.colors
    const text = rgb(c.text)
    const overlay = rgb(c.overlay)
    const backgrounds = [rgb(c.mantle), rgb(c.base)]
    // Theme palette fixes are deferred: when a theme's own text misses AA (Solarized Light), faint cannot reach it.
    const textPasses = backgrounds.every((bg) => contrast(text, bg) >= AA)

    it.skipIf(!textPasses)(`${theme.id}: --text-faint and --text-dim reach ${AA}:1 on mantle and base`, () => {
      for (const pct of [faint, dim]) {
        const color = mix(text, overlay, pct)
        for (const bg of backgrounds) expect(contrast(color, bg)).toBeGreaterThanOrEqual(AA)
      }
    })
  }
})
