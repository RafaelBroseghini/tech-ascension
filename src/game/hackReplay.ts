import { formatNumber } from "./format.ts"
import type { HackShot } from "./hackathon.ts"

/**
 * The scoring cascade after a ship, as beats the overlay plays one after another: the hand's base, each scoring
 * card with the swag it fires, flat swag, multiplying swag, the score landing, the round total climbing and, when
 * the ship ends the round, a banner. Beats speed up as they go so a big ship never drags.
 */
export type ReplayPhase = "base" | "card" | "perk" | "total" | "count" | "banner"

export type ReplayFrame = {
  phase: ReplayPhase
  ms: number
  /** Running totals on this beat. */
  chips: number
  mult: number
  /** Position in `shot.cards` lit on this beat, or -1. */
  card: number
  /** Swag tile that fires on this beat, or 0. */
  perk: number
  /** Floating text over the lit card or tile. */
  label: string | null
  tone: "chips" | "mult" | "x" | "muted" | null
  /** 0-based count of scoring beats so far, for a rising pitch. */
  beat: number
}

export const REPLAY_MS = { base: 180, cardFirst: 170, cardMin: 100, cardStep: 14, perk: 210, x: 280, total: 300, count: 440, banner: 950 } as const

export function replayFrames(shot: HackShot): ReplayFrame[] {
  const frames: ReplayFrame[] = []
  let beat = 0
  let cardBeats = 0
  for (const step of shot.steps) {
    if (step.kind === "base") {
      frames.push({ phase: "base", ms: REPLAY_MS.base, chips: step.chips, mult: step.mult, card: -1, perk: 0, label: null, tone: null, beat })
      continue
    }
    if (step.kind === "card") {
      const ms = Math.max(REPLAY_MS.cardMin, REPLAY_MS.cardFirst - REPLAY_MS.cardStep * cardBeats)
      cardBeats += 1
      if (step.muted) {
        frames.push({ phase: "card", ms, chips: step.chips, mult: step.mult, card: step.card, perk: 0, label: "Muted", tone: "muted", beat })
        continue
      }
      frames.push({ phase: "card", ms, chips: step.chips, mult: step.mult - step.addMult, card: step.card, perk: 0, label: `+${formatNumber(step.addChips)}`, tone: "chips", beat: beat++ })
      // Swag that fires on the card gets its own beat, so +mult reads apart from +chips.
      if (step.addMult > 0) {
        frames.push({ phase: "card", ms: Math.round(ms * 0.75), chips: step.chips, mult: step.mult, card: step.card, perk: step.perks[0] ?? 0, label: `+${formatNumber(step.addMult)} mult`, tone: "mult", beat: beat++ })
      }
      continue
    }
    const x = step.x !== 1
    const label = x ? `×${formatNumber(step.x)} mult` : step.addChips > 0 ? `+${formatNumber(step.addChips)}` : `+${formatNumber(step.addMult)} mult`
    frames.push({
      phase: "perk",
      ms: x ? REPLAY_MS.x : REPLAY_MS.perk,
      chips: step.chips,
      mult: step.mult,
      card: -1,
      perk: step.perk,
      label,
      tone: x ? "x" : step.addChips > 0 ? "chips" : "mult",
      beat: beat++,
    })
  }
  const last = frames[frames.length - 1]
  const chips = last?.chips ?? shot.chips
  const mult = last?.mult ?? shot.mult
  frames.push({ phase: "total", ms: REPLAY_MS.total, chips, mult, card: -1, perk: 0, label: shot.repeat ? "Repeat" : null, tone: shot.repeat ? "muted" : null, beat })
  frames.push({ phase: "count", ms: REPLAY_MS.count, chips, mult, card: -1, perk: 0, label: null, tone: null, beat })
  if (shot.outcome !== "continue") {
    frames.push({ phase: "banner", ms: REPLAY_MS.banner, chips, mult, card: -1, perk: 0, label: null, tone: null, beat })
  }
  return frames
}

export function replayLength(frames: readonly ReplayFrame[]): number {
  return frames.reduce((sum, frame) => sum + frame.ms, 0)
}
