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

  if (!toast || note) return null

  return (
    <button type="button" className="toast" data-testid="toast" onClick={dismissToast}>
      {toast.text}
    </button>
  )
}
