export type ClickKitId = "thock" | "felt" | "marimba" | "pillow"

export const CLICK_KIT_IDS: readonly ClickKitId[] = ["thock", "felt", "marimba", "pillow"]

export type ClickKit = {
  id: ClickKitId
  label: string
  /** Body pitch in Hz: `min` plus up to `spread` at random, so no two taps match. */
  body: { min: number; spread: number }
  /** The low wooden knock. */
  wood: { attack: number; decay: number; release: number; hold: number; velocity: number }
  /** A quiet overtone over the body. `ratio` is its pitch against the body. */
  high: { type: OscillatorType; ratio: number; attack: number; decay: number; release: number; hold: number; velocity: number }
  /** A breath of filtered noise for the wood grain. The filter Q and decay are shared with the room keys. */
  grain: { min: number; spread: number; hold: number; velocity: number }
}

/** All four stay in the soft wood family. `thock` is the original tap; the rest are rounder and quieter. */
export const CLICK_KITS: Record<ClickKitId, ClickKit> = {
  thock: {
    id: "thock",
    label: "Thock",
    body: { min: 124, spread: 26 },
    wood: { attack: 0.005, decay: 0.08, release: 0.06, hold: 0.05, velocity: 0.2 },
    high: { type: "triangle", ratio: 1.5, attack: 0.004, decay: 0.05, release: 0.04, hold: 0.04, velocity: 0.06 },
    grain: { min: 1200, spread: 400, hold: 0.03, velocity: 0.08 },
  },
  felt: {
    id: "felt",
    label: "Felt",
    body: { min: 104, spread: 18 },
    wood: { attack: 0.012, decay: 0.12, release: 0.1, hold: 0.06, velocity: 0.16 },
    high: { type: "sine", ratio: 1.5, attack: 0.01, decay: 0.07, release: 0.06, hold: 0.05, velocity: 0.03 },
    grain: { min: 800, spread: 250, hold: 0.025, velocity: 0.02 },
  },
  marimba: {
    id: "marimba",
    label: "Marimba",
    body: { min: 196, spread: 30 },
    wood: { attack: 0.008, decay: 0.18, release: 0.14, hold: 0.06, velocity: 0.13 },
    high: { type: "sine", ratio: 3, attack: 0.006, decay: 0.09, release: 0.08, hold: 0.05, velocity: 0.035 },
    grain: { min: 900, spread: 200, hold: 0.02, velocity: 0.015 },
  },
  pillow: {
    id: "pillow",
    label: "Pillow",
    body: { min: 92, spread: 14 },
    wood: { attack: 0.018, decay: 0.14, release: 0.12, hold: 0.06, velocity: 0.11 },
    high: { type: "sine", ratio: 1.5, attack: 0.014, decay: 0.08, release: 0.06, hold: 0.05, velocity: 0.02 },
    grain: { min: 700, spread: 150, hold: 0.02, velocity: 0.006 },
  },
}

export function parseClickKitId(raw: unknown): ClickKitId {
  return typeof raw === "string" && (CLICK_KIT_IDS as readonly string[]).includes(raw) ? (raw as ClickKitId) : "thock"
}

export function clickKitById(id: ClickKitId): ClickKit {
  return CLICK_KITS[id]
}
