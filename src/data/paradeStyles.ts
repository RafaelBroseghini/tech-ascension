/** How the cat parade moves. The paths themselves are in `src/game/catParade.ts`. */

export type ParadeStyleId =
  | "bounce"
  | "rain"
  | "bubbles"
  | "wave"
  | "orbit"
  | "conga"
  | "spiral"
  | "eight"
  | "fireflies"
  | "pendulum"
  | "zigzag"
  | "tornado"
  | "heart"
  | "snake"

export type ParadeStyle = { id: ParadeStyleId; label: string; blurb: string }

export const PARADE_STYLES: readonly ParadeStyle[] = [
  { id: "bounce", label: "DVD", blurb: "Drift and bounce off the edges, hoping for the corner" },
  { id: "rain", label: "Waterfall", blurb: "Fall from the top and come round again" },
  { id: "bubbles", label: "Bubbles", blurb: "Float up from the bottom, swaying" },
  { id: "wave", label: "Wavy", blurb: "Ride a sine wave across" },
  { id: "orbit", label: "Orbit", blurb: "Three rings round the middle, turning both ways" },
  { id: "conga", label: "Conga", blurb: "Hop along the bottom in a row" },
  { id: "spiral", label: "Spiral", blurb: "Breathe in and out while they spin" },
  { id: "eight", label: "Figure 8", blurb: "Chase each other round an infinity loop" },
  { id: "fireflies", label: "Fireflies", blurb: "Wander about at their own pace" },
  { id: "pendulum", label: "Pendulum", blurb: "Swing from the top, slowly falling out of step" },
  { id: "zigzag", label: "Zigzag", blurb: "Sawtooth across the screen" },
  { id: "tornado", label: "Tornado", blurb: "Get swept up a widening funnel" },
  { id: "heart", label: "Heart", blurb: "Trace a heart, round and round" },
  { id: "snake", label: "Snake", blurb: "One long cat train winding about" },
]

export const DEFAULT_PARADE_STYLE: ParadeStyleId = "bounce"

const IDS = new Set<string>(PARADE_STYLES.map((style) => style.id))

export function parseParadeStyleId(value: unknown): ParadeStyleId {
  return typeof value === "string" && IDS.has(value) ? (value as ParadeStyleId) : DEFAULT_PARADE_STYLE
}
