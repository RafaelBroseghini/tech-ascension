import { IDE_PACKS, packForTier } from "../data/idePacks.ts"
import type { IdePack } from "../data/idePacks.ts"
import { resolvePack } from "../data/ideProblems.ts"
import { stageOf } from "./phase.ts"
import type { Progress } from "./economy.ts"
import type { Stage } from "./phase.ts"

/** Tab count within a band follows career depth (jobs, gigs, skills), not just the stage art id. */
export function ideTabArtId(p: Pick<Progress, "skills" | "jobs" | "gigs">, stage: Stage | null): number {
  if (!stage) return 0
  const { artId, source } = stage
  if (source.kind === "capital") return artId
  if (source.kind === "job") return artId + source.id * 2
  if (source.kind === "gig") return artId + source.id
  const skillsOwned = Object.values(p.skills).filter((count) => count > 0).length
  return artId + skillsOwned
}

export type ExplorerFolder = {
  id: string
  label: string
  kind: IdePack["kind"]
  pack: IdePack
  /** True for a browsed era the player has not reached in progress yet. */
  previewOnly: boolean
}

function bandEndTier(fromTier: number): number {
  const next = IDE_PACKS.find((pack) => pack.fromTier > fromTier)
  return (next?.fromTier ?? 67) - 1
}

function packIndex(id: string): number {
  return IDE_PACKS.findIndex((pack) => pack.id === id)
}

/** Capital / career art id used for IDE band unlocks (same input as `packForTier`). */
export function ideBandArt(p: Pick<Progress, "skills" | "owned" | "jobs" | "gigs">): number {
  return stageOf(p)?.artId ?? 0
}

/** Packs whose band the player has entered at least once (`fromTier` ≤ current art). */
export function unlockedPackIds(bandArt: number): string[] {
  return IDE_PACKS.filter((pack) => pack.fromTier <= bandArt).map((pack) => pack.id)
}

/**
 * File tabs within a band freeze when the player moves on: earlier bands show their full pool
 * (up to the 20-tab cap); the active band still grows with `tabArtId`.
 */
export function resolvedFolderPack(
  meta: IdePack,
  restPack: IdePack,
  tabArtId: number,
): IdePack {
  if (meta.id === restPack.id) return restPack
  if (meta.kind !== "files") return meta
  const end = bandEndTier(meta.fromTier)
  if (packIndex(meta.id) < packIndex(restPack.id)) return resolvePack(meta, end, end)
  return resolvePack(meta, tabArtId, end)
}

type FolderInput = Pick<Progress, "skills" | "owned" | "jobs" | "gigs">

export function explorerFolders(
  p: FolderInput,
  opts?: { previewPack?: IdePack | null },
): ExplorerFolder[] {
  const stage = stageOf(p)
  const bandArt = ideBandArt(p)
  const tabArtId = ideTabArtId(p, stage)
  const restPack = packForTier(bandArt, tabArtId)
  const ids = unlockedPackIds(bandArt)
  const folders: ExplorerFolder[] = ids.map((id) => {
    const meta = IDE_PACKS.find((pack) => pack.id === id) as IdePack
    return {
      id: meta.id,
      label: meta.label,
      kind: meta.kind,
      pack: resolvedFolderPack(meta, restPack, tabArtId),
      previewOnly: false,
    }
  })
  const preview = opts?.previewPack
  if (preview && !ids.includes(preview.id)) {
    folders.push({
      id: preview.id,
      label: preview.label,
      kind: preview.kind,
      pack: preview,
      previewOnly: true,
    })
  }
  return folders
}

export function folderPackById(
  p: FolderInput,
  packId: string,
  previewPack?: IdePack | null,
): IdePack | null {
  const hit = explorerFolders(p, { previewPack }).find((folder) => folder.id === packId)
  return hit?.pack ?? null
}
