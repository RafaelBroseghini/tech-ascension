import { useEffect } from "react"
import { useGame } from "../game/store.ts"

export function Toast() {
  const toast = useGame((state) => state.toast)
  const dismissToast = useGame((state) => state.dismissToast)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => dismissToast(), 5600)
    return () => window.clearTimeout(id)
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <button type="button" className="toast" data-testid="toast" onClick={dismissToast}>
      {toast.text}
    </button>
  )
}
