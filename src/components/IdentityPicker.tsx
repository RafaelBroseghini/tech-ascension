import { Dices } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { initialOf } from "../game/identity.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { useFocusTrap } from "./useFocusTrap.ts"
import { ModalBackdrop } from "./ModalBackdrop.tsx"

/**
 * The first thing a new career sees: the handle it drew, with a Reroll, and Start, which keeps it for good. Nothing is
 * typed. Esc and the backdrop keep what is on screen too.
 */
export function IdentityPicker() {
  const chosen = useGame((state) => state.profile.chosen)
  // Mounted only while the profile is open, so a wipe starts the card again.
  return chosen ? null : <IdentityCard />
}

function IdentityCard() {
  const profile = useGame((state) => state.profile)
  const reroll = useGame((state) => state.rerollProfile)
  const keep = useGame((state) => state.keepProfile)
  const mainRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") keep()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [keep])

  return createPortal(
    <ModalBackdrop className="event-backdrop" data-testid="identity-backdrop" onClick={keep}>
      <div
        ref={dialogRef}
        className="event-modal identity-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="identity-title"
        data-testid="identity-picker"
        onClick={(click) => click.stopPropagation()}
      >
        <p className="event-kicker">New career</p>
        <h2 id="identity-title" className="event-title">
          Who's starting out?
        </h2>
        {/* Keyed by the handle, so a reroll lands with a small bounce. */}
        <div className="identity-draw" aria-live="polite" key={profile.handle}>
          <span className="githug-avatar identity-avatar" aria-hidden="true">
            {initialOf(profile.handle)}
          </span>
          <strong className="identity-handle" data-testid="identity-handle">
            @{profile.handle}
          </strong>
        </div>
        <p className="event-flavor">High school. A used laptop. Big plans. This is your handle on GitHug and LinkedOut; reroll as often as you like. Once you start, it stays.</p>
        <div className="event-actions">
          <button type="button" className="event-choice event-no identity-reroll" data-testid="identity-reroll" onClick={() => reroll()}>
            <Dices {...UI_ICON_SM} aria-hidden />
            Reroll
          </button>
          <button ref={mainRef} type="button" className="event-choice event-yes" data-testid="identity-keep" onClick={keep}>
            Start as @{profile.handle}
          </button>
        </div>
      </div>
    </ModalBackdrop>,
    document.body,
  )
}
