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

/**
 * Asks the settings menu to open on one row. `targets` are its `data-settings-target` marks, most exact first: a
 * picked kit, then its section, then the switch that shows that section. False when no menu took the request.
 */
let settingsListener: ((targets: readonly string[]) => boolean) | null = null

export function openSettingsAt(targets: readonly string[]): boolean {
  return settingsListener ? settingsListener(targets) : false
}

export function onSettingsAt(listener: (targets: readonly string[]) => boolean): () => void {
  settingsListener = listener
  return () => {
    if (settingsListener === listener) settingsListener = null
  }
}
