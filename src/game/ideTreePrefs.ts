import { IDE_PACKS } from "../data/idePacks.ts"
import { readPref, writePref } from "./ledger.ts"

/** Explorer fold state; separate from the career save so a wipe keeps the tree layout. */

const VALID = new Set(IDE_PACKS.map((pack) => pack.id))

function folderIds(raw: unknown): string[] {
  let parsed: unknown = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((id): id is string => typeof id === "string" && VALID.has(id))
}

export function readCollapsedFolders(): Set<string> {
  return new Set(folderIds(readPref("treeFolds")))
}

export function writeCollapsedFolders(collapsed: ReadonlySet<string>): void {
  const ids = [...collapsed].filter((id) => VALID.has(id))
  writePref("treeFolds", ids)
}
