import type { Era } from "./tiers.ts"
import { TIERS } from "./tiers.ts"

export type EraSection = {
  id: Era
  label: string
  hint: string
}

const ERA_COPY: Record<Era, { label: string; hint: string }> = {
  early: { label: "Early", hint: "Learn to ship" },
  mid: { label: "Mid", hint: "ML craft" },
  upper: { label: "Upper", hint: "Own the company" },
  q3: { label: "Scale", hint: "Models and silicon" },
  end: { label: "Endgame", hint: "Mars" },
}

/** Tab order follows first appearance in TIERS. New eras still get a tab. */
export function eraSections(): EraSection[] {
  const seen: Era[] = []
  for (const tier of TIERS) {
    if (!seen.includes(tier.era)) seen.push(tier.era)
  }
  return seen.map((id) => {
    const copy = ERA_COPY[id]
    return {
      id,
      label: copy?.label ?? id,
      hint: copy?.hint ?? "",
    }
  })
}

export function tiersInEra(era: Era) {
  return TIERS.filter((tier) => tier.era === era)
}
