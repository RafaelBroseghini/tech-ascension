import { useEffect } from "react"
import { useGame } from "../game/store.ts"
import { presenceRef } from "./useMotion.ts"

/** Up from the foot of the screen, or down from the top where a phone keeps it (it would cover the shop buttons). */
const fromEdge = (el: HTMLElement) => ({ scale: 0.94, y: el.getBoundingClientRect().top < window.innerHeight / 2 ? -18 : 18 })
const toastPresence = presenceRef({
  fade: { in: 0.16, out: 0.16 },
  move: { from: fromEdge, to: (el) => ({ scale: 0.97, y: fromEdge(el).y / 3 }), spring: { stiffness: 480, damping: 26, mass: 0.8 } },
})

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
        // Keyed by the toast so a new one replaces the old with its own entrance rather than changing text in place.
        <button key={shown.id} ref={toastPresence} type="button" className="toast" data-testid="toast" onClick={dismissToast}>
          {shown.text}
        </button>
      ) : null}
    </div>
  )
}
