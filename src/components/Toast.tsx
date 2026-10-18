import { useEffect } from "react"
import { useGame } from "../game/store.ts"

export function Toast() {
  const toast = useGame((state) => state.toast)
  const dismissToast = useGame((state) => state.dismissToast)

  const note = Boolean(toast?.note)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => dismissToast(), note ? 9000 : 5600)
    return () => window.clearTimeout(id)
  }, [toast, note, dismissToast])

  const shown = toast && !note ? toast : null

  // The live region stays mounted: a region inserted together with its text is often not announced. It has no box
  // of its own (the toast is fixed), and focus never moves, so a typing player is not interrupted.
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {shown ? (
        <button type="button" className="toast" data-testid="toast" onClick={dismissToast}>
          {shown.text}
        </button>
      ) : null}
    </div>
  )
}
