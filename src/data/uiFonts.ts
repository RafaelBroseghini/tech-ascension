/**
 * Faces the player can set the UI in. The stack is the CSS `font-family` painted onto `--font-display`.
 * `scale` multiplies the type tokens (`--fs-*`) so a face that runs wide or small sets to about the same
 * footprint as Chakra Petch and the shop rows, bars and chips keep their layout.
 * Metrics keep the system mono stack whichever face is picked.
 */

export type UiFontId = "chakra-petch" | "jetbrains-mono" | "space-grotesk" | "pixelify-sans" | "atkinson"

export type UiFont = {
  id: UiFontId
  name: string
  stack: string
  scale: number
}

export const UI_FONTS: readonly UiFont[] = [
  {
    id: "chakra-petch",
    name: "Chakra Petch",
    stack: '"Chakra Petch", "Eurostile", "Bahnschrift", system-ui, sans-serif',
    scale: 1,
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    scale: 0.9,
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    stack: '"Space Grotesk", "Helvetica Neue", Arial, system-ui, sans-serif',
    scale: 0.96,
  },
  {
    id: "pixelify-sans",
    name: "Pixelify Sans",
    stack: '"Pixelify Sans", "Chakra Petch", system-ui, sans-serif',
    scale: 0.94,
  },
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible Next",
    stack: '"Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif',
    scale: 0.96,
  },
]

export const DEFAULT_UI_FONT_ID: UiFontId = "chakra-petch"

const FONT_IDS: ReadonlySet<string> = new Set(UI_FONTS.map((font) => font.id))

export function isUiFontId(value: string): value is UiFontId {
  return FONT_IDS.has(value)
}

export function uiFontById(id: string | null | undefined): UiFont {
  return UI_FONTS.find((font) => font.id === id) ?? UI_FONTS[0]!
}
