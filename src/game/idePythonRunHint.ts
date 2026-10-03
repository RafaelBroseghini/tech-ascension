import { readPref, writePref } from "./ledger.ts"

/** Whether the IDE console run hint was dismissed; stored on ideLore beside lore unlock. */

type IdeLorePref = { lore?: boolean; runHintSeen?: boolean }

function body(): IdeLorePref {
  const raw = readPref("ideLore")
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as IdeLorePref
  return {}
}

export function readIdePythonRunHintSeen(): boolean {
  return body().runHintSeen === true
}

export function markIdePythonRunHintSeen(): void {
  if (readIdePythonRunHintSeen()) return
  writePref("ideLore", { ...body(), runHintSeen: true })
}
