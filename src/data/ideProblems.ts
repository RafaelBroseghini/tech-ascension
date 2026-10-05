import type { FilePack, IdeFile, IdePack } from "./idePacks.ts"
import { PROBLEM_POOLS } from "./ideProblemPools.ts"
import { styleIdeFile } from "./ideScriptStyle.ts"

export const MAX_IDE_TABS = 20

/** How many editor tabs to show within a pack band (1–20) from progress inside that band. */
export function visibleTabCount(fromTier: number, bandEndTier: number, artId: number, poolSize: number): number {
  const cap = Math.min(poolSize, MAX_IDE_TABS)
  if (cap <= 1) return cap
  const start = fromTier
  const end = bandEndTier
  const t = Math.min(Math.max(start, artId), end)
  const span = end - start + 1
  if (span <= 1) return cap
  const step = (t - start) / (span - 1)
  return 1 + Math.floor(step * (cap - 1))
}

// Styling a file is pure and costs a regex pass over the whole body, so each one is done once.
const styled = new WeakMap<IdeFile, Map<string, IdeFile>>()
// Same pack and tab count is the same strip: callers re-resolve on every render.
const resolved = new WeakMap<FilePack, Map<number, FilePack>>()

function styledFile(packId: string, file: IdeFile): IdeFile {
  let byPack = styled.get(file)
  if (!byPack) styled.set(file, (byPack = new Map()))
  let hit = byPack.get(packId)
  if (!hit) byPack.set(packId, (hit = styleIdeFile(packId, file)))
  return hit
}

export function resolveFilePack(pack: FilePack, artId: number, bandEndTier: number): FilePack {
  const pool = PROBLEM_POOLS[pack.id]
  if (!pool?.length) return pack
  const n = visibleTabCount(pack.fromTier, bandEndTier, artId, pool.length)
  let byCount = resolved.get(pack)
  if (!byCount) resolved.set(pack, (byCount = new Map()))
  let hit = byCount.get(n)
  if (!hit) byCount.set(n, (hit = { ...pack, files: pool.slice(0, n).map((file) => styledFile(pack.id, file)) }))
  return hit
}

/** File-era packs become a LeetCode-style tab strip; inbox and deck stay as authored. */
export function resolvePack(pack: IdePack, artId: number, bandEndTier: number): IdePack {
  if (pack.kind !== "files") return pack
  return resolveFilePack(pack, artId, bandEndTier)
}

export function allProblemFiles(): IdeFile[] {
  return Object.values(PROBLEM_POOLS).flat()
}
