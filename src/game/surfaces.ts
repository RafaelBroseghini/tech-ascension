/**
 * Asks one part of the desk to open itself: a reveal card's "Try it", a career log link. Each surface's owner
 * listens for its own name, so the caller never needs to know where the thing lives.
 */
export type Surface =
  | "careerLog"
  | "githug"
  | "linkedout"
  | "metrics"
  | "rosters"
  | "clickKits"
  | "themes"
  | "music"
  | "tenx"
  | "boardGear"
  | "studio"
  | "company"

const listeners = new Map<Surface, Set<() => void>>()

/** True when something on screen took the request. */
export function openSurface(id: Surface): boolean {
  const set = listeners.get(id)
  if (!set || set.size === 0) return false
  for (const listener of [...set]) listener()
  return true
}

export function onSurface(id: Surface, listener: () => void): () => void {
  let set = listeners.get(id)
  if (!set) listeners.set(id, (set = new Set()))
  set.add(listener)
  return () => {
    set.delete(listener)
  }
}
