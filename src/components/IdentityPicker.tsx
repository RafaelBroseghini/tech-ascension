import { Dices } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { initialOf } from "../game/identity.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"

/**
 * The first thing a new career sees: the handle it drew, Reroll for another from the word lists, and Start, which
 * keeps it for good. Nothing is typed. Esc and the backdrop keep what is on screen too.
 */
export function IdentityPicker() {
  const profile = useGame((state) => state.profile)
  const reroll = useGame((state) => state.rerollProfile)
  const keep = useGame((state) => state.keepProfile)
  const startRef = useRef<HTMLButtonElement>(null)
  const chosen = profile.chosen

  useEffect(() => {
    if (chosen) return
    startRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") keep()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [chosen, keep])

  if (chosen) return null
  return createPortal(
    <div className="event-backdrop" data-testid="identity-backdrop" onClick={keep}>
      <div
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
        <p className="event-flavor">Your handle on GitHug and LinkedOut. Reroll as often as you like. Once you start, it stays.</p>
        <div className="event-actions">
          <button type="button" className="event-choice event-no identity-reroll" data-testid="identity-reroll" onClick={() => reroll()}>
            <Dices {...UI_ICON_SM} aria-hidden />
            Reroll
          </button>
          <button ref={startRef} type="button" className="event-choice event-yes" data-testid="identity-keep" onClick={keep}>
            Start as @{profile.handle}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
