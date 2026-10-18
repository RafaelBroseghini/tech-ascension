import { useSyncExternalStore } from "react"

/** Phones and narrow windows: the desk's bottom bar folds into the settings menu below this width. */
export const NARROW_QUERY = "(max-width: 860px)"

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const isNarrow = () => window.matchMedia(NARROW_QUERY).matches

export function useNarrow(): boolean {
  return useSyncExternalStore(subscribe, isNarrow, () => false)
}
