import { useGame } from "../game/store.ts"

/** The offline return, stuck to the editor instead of the bottom banner. */
export function StickyNote() {
  const toast = useGame((state) => state.toast)
  const dismissToast = useGame((state) => state.dismissToast)
  if (!toast?.note) return null

  return (
    <button type="button" className="sticky-note" data-testid="sticky-note" onClick={dismissToast}>
      <span className="sticky-note-kicker">While you were out</span>
      <span className="sticky-note-line">{toast.note}</span>
      <span className="sticky-note-credit">{toast.text}</span>
    </button>
  )
}
