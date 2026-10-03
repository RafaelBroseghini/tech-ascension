/**
 * Editor palettes. Token roles match the IDE shell:
 * mauve is keywords and the status badge, green strings, peach numbers,
 * sky operators, rosewater types, blue functions.
 * onAccent is the ink that sits on the mauve and peach badges.
 */

export type IdeThemeId =
  | "mocha"
  | "dracula"
  | "tokyo-night"
  | "monokai"
  | "gruvbox"
  | "synthwave"
  | "github-light"
  | "latte"
  | "solarized-light"
  | "gruvbox-light"

export type IdeThemeKind = "dark" | "light"

export type IdePalette = {
  rosewater: string
  mauve: string
  green: string
  peach: string
  sky: string
  blue: string
  text: string
  overlay: string
  surface: string
  base: string
  mantle: string
  crust: string
  onAccent: string
  /** Danger, fight HP, and bad event lines. */
  red: string
}

export type IdeTheme = {
  id: IdeThemeId
  name: string
  kind: IdeThemeKind
  colors: IdePalette
}

export const IDE_THEMES: readonly IdeTheme[] = [
  {
    id: "mocha",
    name: "Catppuccin Mocha",
    kind: "dark",
    colors: {
      rosewater: "#f5e0dc",
      mauve: "#cba6f7",
      green: "#a6e3a1",
      peach: "#fab387",
      sky: "#89dceb",
      blue: "#89b4fa",
      text: "#cdd6f4",
      overlay: "#6c7086",
      surface: "#313244",
      base: "#1e1e2e",
      mantle: "#181825",
      crust: "#11111b",
      onAccent: "#11111b",
      red: "#f38ba8",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    kind: "dark",
    colors: {
      rosewater: "#8be9fd",
      mauve: "#ff79c6",
      green: "#f1fa8c",
      peach: "#bd93f9",
      sky: "#ff79c6",
      blue: "#50fa7b",
      text: "#f8f8f2",
      overlay: "#6272a4",
      surface: "#44475a",
      base: "#282a36",
      mantle: "#21222c",
      crust: "#191a21",
      onAccent: "#191a21",
      red: "#ff5555",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    kind: "dark",
    colors: {
      rosewater: "#2ac3de",
      mauve: "#9d7cd8",
      green: "#9ece6a",
      peach: "#ff9e64",
      sky: "#89ddff",
      blue: "#7aa2f7",
      text: "#c0caf5",
      overlay: "#565f89",
      surface: "#292e42",
      base: "#1a1b26",
      mantle: "#16161e",
      crust: "#13131a",
      onAccent: "#1a1b26",
      red: "#f7768e",
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    kind: "dark",
    colors: {
      rosewater: "#66d9ef",
      mauve: "#f92672",
      green: "#e6db74",
      peach: "#ae81ff",
      sky: "#f92672",
      blue: "#a6e22e",
      text: "#f8f8f2",
      overlay: "#75715e",
      surface: "#3e3d32",
      base: "#272822",
      mantle: "#1e1f1c",
      crust: "#171814",
      onAccent: "#272822",
      red: "#ff6188",
    },
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    kind: "dark",
    colors: {
      rosewater: "#fabd2f",
      mauve: "#fb4934",
      green: "#b8bb26",
      peach: "#d3869b",
      sky: "#fe8019",
      blue: "#8ec07c",
      text: "#ebdbb2",
      overlay: "#a89984",
      surface: "#3c3836",
      base: "#282828",
      mantle: "#1d2021",
      crust: "#1d2021",
      onAccent: "#1d2021",
      red: "#fb4934",
    },
  },
  {
    id: "synthwave",
    name: "Synthwave '84",
    kind: "dark",
    colors: {
      rosewater: "#fede5d",
      mauve: "#ff7edb",
      green: "#ff8b39",
      peach: "#f97e72",
      sky: "#36f9f6",
      blue: "#72f1b8",
      text: "#ffffff",
      overlay: "#848bbd",
      surface: "#34294f",
      base: "#262335",
      mantle: "#241b2f",
      crust: "#1a1528",
      onAccent: "#1a1528",
      red: "#fe4450",
    },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    kind: "light",
    colors: {
      rosewater: "#953800",
      mauve: "#cf222e",
      green: "#0a3069",
      peach: "#0550ae",
      sky: "#cf222e",
      blue: "#8250df",
      text: "#1f2328",
      overlay: "#656d76",
      surface: "#eaeef2",
      base: "#ffffff",
      mantle: "#f6f8fa",
      crust: "#f6f8fa",
      onAccent: "#ffffff",
      red: "#cf222e",
    },
  },
  {
    id: "latte",
    name: "Catppuccin Latte",
    kind: "light",
    colors: {
      rosewater: "#dc8a78",
      mauve: "#8839ef",
      green: "#40a02b",
      peach: "#fe640b",
      sky: "#04a5e5",
      blue: "#1e66f5",
      text: "#4c4f69",
      overlay: "#8c8fa1",
      surface: "#ccd0da",
      base: "#eff1f5",
      mantle: "#e6e9ef",
      crust: "#dce0e8",
      onAccent: "#eff1f5",
      red: "#d20f39",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    kind: "light",
    colors: {
      rosewater: "#b58900",
      mauve: "#859900",
      green: "#2aa198",
      peach: "#d33682",
      sky: "#cb4b16",
      blue: "#268bd2",
      text: "#657b83",
      overlay: "#93a1a1",
      surface: "#ddd6c1",
      base: "#fdf6e3",
      mantle: "#eee8d5",
      crust: "#e4ddc8",
      onAccent: "#002b36",
      red: "#dc322f",
    },
  },
  {
    id: "gruvbox-light",
    name: "Gruvbox Light",
    kind: "light",
    colors: {
      rosewater: "#b57614",
      mauve: "#9d0006",
      green: "#79740e",
      peach: "#8f3f71",
      sky: "#af3a03",
      blue: "#076678",
      text: "#3c3836",
      overlay: "#7c6f64",
      surface: "#d5c4a1",
      base: "#fbf1c7",
      mantle: "#f2e5bc",
      crust: "#ebdbb2",
      onAccent: "#fbf1c7",
      red: "#9d0006",
    },
  },
]

const THEME_IDS = new Set<string>(IDE_THEMES.map((theme) => theme.id))

export function isIdeThemeId(value: string): value is IdeThemeId {
  return THEME_IDS.has(value)
}

export function ideThemeById(id: string | null | undefined): IdeTheme {
  return IDE_THEMES.find((theme) => theme.id === id) ?? IDE_THEMES[0]!
}

export function ideThemesOf(kind: IdeThemeKind): IdeTheme[] {
  return IDE_THEMES.filter((theme) => theme.kind === kind)
}

/** Custom properties consumed by the IDE shell and the theme swatches. */
export function ideThemeStyle(theme: IdeTheme): Record<string, string> {
  const colors = theme.colors
  return {
    "--ide-rosewater": colors.rosewater,
    "--ide-mauve": colors.mauve,
    "--ide-green": colors.green,
    "--ide-peach": colors.peach,
    "--ide-sky": colors.sky,
    "--ide-blue": colors.blue,
    "--ide-text": colors.text,
    "--ide-overlay": colors.overlay,
    "--ide-surface": colors.surface,
    "--ide-base": colors.base,
    "--ide-mantle": colors.mantle,
    "--ide-crust": colors.crust,
    "--ide-on-accent": colors.onAccent,
    "--ide-red": colors.red,
  }
}
