import { HIDDEN_LORE_FILE, HIDDEN_LORE_PATH, LORE_PACK_MIN_FROM_TIER } from "../data/ideHiddenLore.ts"
import { itemsOf, packForTier, previewPackForEra } from "../data/idePacks.ts"
import type { IdePack } from "../data/idePacks.ts"
import { readIdeLoreUnlocked } from "./ideSecrets.ts"
import type { Era } from "../data/capital.ts"
import type { Progress } from "./economy.ts"
import { explorerFolders, folderPackById, ideTabArtId } from "./ideExplorer.ts"
import type { ExplorerFolder } from "./ideExplorer.ts"
import { stageOf } from "./phase.ts"

export { ideTabArtId } from "./ideExplorer.ts"
export type { ExplorerFolder } from "./ideExplorer.ts"
export { explorerFolders, folderPackById, ideBandArt, unlockedPackIds } from "./ideExplorer.ts"

/** A browsed era snaps back to the owned one this long after the last shop or IDE interaction. */
export const PREVIEW_HOLD_MS = 20_000

export type IdeSelection = { packId: string; index: number }

export function packWithHiddenLore(pack: IdePack, unlocked = readIdeLoreUnlocked()): IdePack {
  if (!unlocked || pack.kind !== "files" || pack.fromTier < LORE_PACK_MIN_FROM_TIER) return pack
  if (pack.files.some((file) => file.path === HIDDEN_LORE_PATH)) return pack
  return { ...pack, files: [...pack.files, HIDDEN_LORE_FILE] }
}

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
  /** Unlocked problem / inbox / deck folders that persist across eras. */
  folders: ExplorerFolder[]
}

type ViewInput = Pick<Progress, "skills" | "owned" | "jobs" | "gigs"> & {
  ideSel: IdeSelection
  previewEra: Era | null
  /** Subscribers pass this so a lore unlock re-renders the explorer. */
  loreUnlocked?: boolean
}

/**
 * The owned pack follows the furthest thing the player holds (the same art id the stage sprite
 * uses). A preview era swaps in that era's first pack until it snaps back; previewing the era the
 * player already rests in is a no-op. Any unlocked folder can stay open via `ideSel`.
 */
export function ideView(p: ViewInput): IdeView {
  const stage = stageOf(p)
  const bandArt = stage?.artId ?? 0
  const restPack = packForTier(bandArt, ideTabArtId(p, stage))
  const previewing = p.previewEra !== null && p.previewEra !== restPack.era
  const previewPack = previewing && p.previewEra ? previewPackForEra(p.previewEra) : null
  const folders = explorerFolders(p, { previewPack })
  const fallback = previewPack ?? restPack

  let pack = fallback
  if (!previewing && p.ideSel.packId) {
    const picked = folderPackById(p, p.ideSel.packId, previewPack)
    if (picked) pack = picked
  } else if (previewing && p.ideSel.packId === fallback.id) {
    pack = fallback
  }

  pack = packWithHiddenLore(pack, p.loreUnlocked ?? readIdeLoreUnlocked())
  const count = itemsOf(pack).length
  const wanted = p.ideSel.packId === pack.id ? p.ideSel.index : 0
  const index = count > 0 ? Math.min(Math.max(0, Math.floor(wanted) || 0), count - 1) : 0
  return { pack, restPack, index, count, previewing, folders }
}
