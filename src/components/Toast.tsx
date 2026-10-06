import { useEffect } from "react"
import { useGame } from "../game/store.ts"

export function Toast() {
  const toast = useGame((state) => state.toast)
  const dismissToast = useGame((state) => state.dismissToast)
  const openHackathon = useGame((state) => state.openHackathon)

  const note = Boolean(toast?.note)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => dismissToast(), note ? 9000 : 5600)
    return () => window.clearTimeout(id)
  }, [toast, note, dismissToast])

  if (!toast || note) return null

  const action = toast.action
  return (
    <button
      type="button"
      className={action ? "toast has-action" : "toast"}
      data-testid="toast"
      onClick={() => {
        if (action === "hackathon") openHackathon()
        dismissToast()
      }}
    >
      {toast.text}
      {action ? <span className="toast-go">Open</span> : null}
    </button>
  )
}
