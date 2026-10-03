import type { ReactNode } from "react"
import { useSyncExternalStore } from "react"
import { getDeskPrefs, setDeskPref, subscribeDeskPrefs } from "../game/desk.ts"
import { isMobileViewport, subscribeMobileViewport } from "../game/mobileViewport.ts"

function useMobilePlayGate(): boolean {
  const mobile = useSyncExternalStore(subscribeMobileViewport, isMobileViewport, () => false)
  const acked = useSyncExternalStore(subscribeDeskPrefs, () => getDeskPrefs().mobilePlayAck, () => false)
  return mobile && !acked
}

export function MobilePlayGate({ children }: { children: ReactNode }) {
  const gated = useMobilePlayGate()

  if (gated) {
    return (
      <div className="mobile-play-scrim" data-testid="mobile-play-warning">
        <div
          className="mobile-play-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-play-warning-title"
          aria-describedby="mobile-play-warning-body"
        >
          <p id="mobile-play-warning-title" className="mobile-play-warning-kicker">Desktop recommended</p>
          <p id="mobile-play-warning-body" className="mobile-play-warning-body">
            Tech Ascension is best played on a computer. On a phone or tablet, layout and controls may not feel as
            responsive.
          </p>
          <button
            type="button"
            className="mobile-play-warning-btn"
            data-testid="mobile-play-warning-dismiss"
            onClick={() => setDeskPref("mobilePlayAck", true)}
          >
            Got it
          </button>
        </div>
      </div>
    )
  }

  return children
}
