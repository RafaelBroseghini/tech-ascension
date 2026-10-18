import type { RosterKind } from "./rosters.ts"

/** Which roster modal is open: the cats, one catalog roster, or none. Shared by the status dock and the settings menu. */
export type OpenRoster = "cats" | RosterKind | null

let current: OpenRoster = null
const listeners = new Set<() => void>()

export function getOpenRoster(): OpenRoster {
  return current
}

export function setOpenRoster(next: OpenRoster): void {
  if (next === current) return
  current = next
  for (const listener of listeners) listener()
}

export function subscribeOpenRoster(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
