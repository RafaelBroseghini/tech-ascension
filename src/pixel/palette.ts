/** Shared 16-colour sheet. Index 0 is transparent; palette colour n lives at index n + 1. */
export const PALETTE = [
  "#1a1c2c", // ink: outlines
  "#f4f0e6", // paper
  "#8b9bb4", // mid: metals
  "#41a6f6", // early accent
  "#38b764", // mid accent
  "#b13e53", // upper accent
  "#ffcd75", // q3 accent
  "#ef7d57", // end accent
  "#73eff7", // glow
  "#0d1117", // dark bg
  "#3dd68c", // terminal green
  "#7b5ea7", // late AI purple
  "#ffffff", // white
  "#000000", // void
  "#5a6988", // gray: shadows
  "#e86a73", // pink: heat
] as const

export const C = {
  ink: 1,
  paper: 2,
  mid: 3,
  blue: 4,
  green: 5,
  red: 6,
  gold: 7,
  rust: 8,
  glow: 9,
  deep: 10,
  term: 11,
  purple: 12,
  white: 13,
  void: 14,
  gray: 15,
  pink: 16,
} as const

/** Light, base, shade. Light always comes from the top-left. */
export type Ramp = readonly [hi: number, base: number, lo: number]

export const R = {
  metal: [C.paper, C.mid, C.gray],
  steel: [C.mid, C.gray, C.ink],
  paper: [C.white, C.paper, C.mid],
  dark: [C.gray, C.deep, C.void],
  blue: [C.glow, C.blue, C.gray],
  green: [C.term, C.green, C.gray],
  red: [C.pink, C.red, C.ink],
  gold: [C.paper, C.gold, C.rust],
  rust: [C.gold, C.rust, C.red],
  purple: [C.mid, C.purple, C.ink],
} as const satisfies Record<string, Ramp>

export type Era = "early" | "mid" | "upper" | "q3" | "end"

/** One accent per era, as a ramp. */
export const ERA_RAMP: Record<Era, Ramp> = {
  early: R.blue,
  mid: R.green,
  upper: R.red,
  q3: R.gold,
  end: R.rust,
}
