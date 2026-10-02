import { itemsOf, packForTier, previewPackForEra } from "../data/idePacks.ts"
import type { IdePack } from "../data/idePacks.ts"
import type { Era } from "../data/tiers.ts"
import type { Progress } from "./economy.ts"
import { stageOf } from "./phase.ts"

/** A browsed era snaps back to the owned one this long after the last shop or IDE interaction. */
export const PREVIEW_HOLD_MS = 20_000

export type IdeSelection = { packId: string; index: number }

export type IdeView = {
  /** What the pane shows now. */
  pack: IdePack
  /** What progress alone would show: the canonical rest state. */
  restPack: IdePack
  /** Selected file, email or slide in `pack`. */
  index: number
  count: number
  /** True while the shop's era tab is showing another era's pack. */
  previewing: boolean
}

type ViewInput = Pick<Progress, "skills" | "owned" | "jobs" | "gigs"> & {
  ideSel: IdeSelection
  previewEra: Era | null
}

/**
 * The owned pack follows the furthest thing the player holds (the same art id the stage sprite
 * uses). A preview era swaps in that era's first pack until it snaps back; previewing the era the
 * player already rests in is a no-op.
 */
export function ideView(p: ViewInput): IdeView {
  const restPack = packForTier(stageOf(p)?.artId ?? 0)
  const previewing = p.previewEra !== null && p.previewEra !== restPack.era
  const pack = previewing && p.previewEra ? previewPackForEra(p.previewEra) : restPack
  const count = itemsOf(pack).length
  const wanted = p.ideSel.packId === pack.id ? p.ideSel.index : 0
  const index = Math.min(Math.max(0, Math.floor(wanted) || 0), count - 1)
  return { pack, restPack, index, count, previewing }
}
