import { bandForTier, previewBandForEra } from "../data/idePacks.ts"
import type { IdeBand } from "../data/idePacks.ts"
import type { Era } from "../data/capital.ts"
import type { Progress } from "./economy.ts"
import { stageOf } from "./phase.ts"

/** A browsed era snaps back to the owned one this long after the last shop or desk interaction. */
export const PREVIEW_HOLD_MS = 20_000

export type IdeView = {
  /** What the status bar names now. */
  band: IdeBand
  /** True while the shop's era tab is showing another era. */
  previewing: boolean
}

/**
 * The band follows the furthest thing the player holds (the same art id the stage sprite uses). A preview era swaps
 * in that era's first band until it snaps back; previewing the era the player already rests in is a no-op.
 */
export function ideView(p: Pick<Progress, "skills" | "owned" | "jobs" | "gigs"> & { previewEra: Era | null }): IdeView {
  const rest = bandForTier(stageOf(p)?.artId ?? 0)
  const previewing = p.previewEra !== null && p.previewEra !== rest.era
  return { band: previewing && p.previewEra ? previewBandForEra(p.previewEra) : rest, previewing }
}
