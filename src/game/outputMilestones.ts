import { MILESTONE_FACTOR, OUTPUT_MILESTONES } from "../data/outputMilestones.ts"

/** Milestones a row with `count` copies has passed. */
export function milestonesPassed(count: number): number {
  let passed = 0
  for (const at of OUTPUT_MILESTONES) if (count >= at) passed += 1
  return passed
}

/** The row's output multiplier: ×2 per milestone passed. */
export function outputMult(count: number): number {
  return MILESTONE_FACTOR ** milestonesPassed(count)
}

/** What `count` copies make, in single copies' worth: the count times its multiplier. */
export function effectiveCopies(count: number): number {
  return count > 0 ? count * outputMult(count) : 0
}

/** The next copy count that doubles the row, or null past the last one. */
export function nextMilestone(count: number): number | null {
  for (const at of OUTPUT_MILESTONES) if (count < at) return at
  return null
}

/** The last milestone reached, or 0. */
export function lastMilestone(count: number): number {
  let reached = 0
  for (const at of OUTPUT_MILESTONES) if (count >= at) reached = at
  return reached
}

/** Where a row with `owned` copies stands against its next milestone. */
export type MilestoneStep = {
  owned: number
  /** The copy count that doubles the row. */
  at: number
  /** Copies still to buy. */
  left: number
  /** The multiplier the row reaches there. */
  mult: number
  /** How far the row is from its last milestone to this one, 0 to 1. */
  fill: number
}

/** The next milestone of a row with `owned` copies. Null before the first copy (that is the row's own unlock) and past the last. */
export function milestoneStep(owned: number): MilestoneStep | null {
  const at = nextMilestone(owned)
  if (owned <= 0 || at === null) return null
  const from = lastMilestone(owned)
  return { owned, at, left: at - owned, mult: outputMult(at), fill: (owned - from) / (at - from) }
}

/** Milestones crossed going from `before` to `after` copies, in order. */
export function milestonesCrossed(before: number, after: number): number[] {
  return OUTPUT_MILESTONES.filter((at) => before < at && after >= at)
}
