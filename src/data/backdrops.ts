import type { BgKey } from "../pixel/backgrounds.ts"

export type Backdrop = { key: BgKey; hot: boolean }

/**
 * Era-shared stage backdrops, picked from the highest owned tier id (0 = nothing bought yet).
 * Ranges follow the era beats in TIERS: editor and desk inside early, office then lab across
 * mid into upper, saas and board for the company tiers, one scene each for scale, Earth infra,
 * orbit and Mars. First LLM (26) gets the hotter lab; Found your AI company (40) sits in saas.
 */
const RANGES: ReadonlyArray<readonly [lastTier: number, key: BgKey]> = [
  [8, "bg-editor"],
  [18, "bg-desk"],
  [25, "bg-office"],
  [36, "bg-lab"],
  [41, "bg-saas"],
  [44, "bg-board"],
  [53, "bg-fab"],
  [58, "bg-dc"],
  [62, "bg-orbit"],
  [Number.POSITIVE_INFINITY, "bg-mars"],
]

const FIRST_LLM_TIER = 26

export function backdropForTier(tierId: number): Backdrop {
  const row = RANGES.find(([last]) => tierId <= last)
  return { key: row?.[1] ?? "bg-mars", hot: tierId === FIRST_LLM_TIER }
}
