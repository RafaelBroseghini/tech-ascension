import { Dices } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { initialOf } from "../game/identity.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"

/**
 * The first thing a new career sees: the name it drew (the same on every profile) and a web handle that has nothing to
 * do with it, each with its own reroll from the word lists, and Start, which keeps both for good. Nothing is typed.
 * Esc and the backdrop keep what is on screen too.
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
        <div className="identity-draw" aria-live="polite">
          {/* Each line is keyed by its value, so a reroll lands with a small bounce on the line that changed. */}
          <span className="githug-avatar identity-avatar" aria-hidden="true" key={`avatar-${profile.name}`}>
            {initialOf(profile.name)}
          </span>
          <div className="identity-row">
            <span className="identity-label">Name</span>
            <strong key={profile.name} data-testid="identity-name">
              {profile.name}
            </strong>
            <button type="button" className="identity-dice" aria-label="Draw another name" data-testid="identity-reroll-name" onClick={() => reroll("name")}>
              <Dices {...UI_ICON_SM} aria-hidden />
            </button>
          </div>
          <div className="identity-row">
            <span className="identity-label">Handle</span>
            <span key={profile.handle} className="identity-handle" data-testid="identity-handle">
              @{profile.handle}
            </span>
            <button type="button" className="identity-dice" aria-label="Draw another handle" data-testid="identity-reroll-handle" onClick={() => reroll("handle")}>
              <Dices {...UI_ICON_SM} aria-hidden />
            </button>
          </div>
        </div>
        <p className="event-flavor">Your name is the same on every profile; your handle is how GitHug knows you. Reroll either as often as you like. Once you start, they stay.</p>
        <div className="event-actions">
          <button type="button" className="event-choice event-no identity-reroll" data-testid="identity-reroll" onClick={() => reroll()}>
            <Dices {...UI_ICON_SM} aria-hidden />
            Reroll both
          </button>
          <button ref={startRef} type="button" className="event-choice event-yes" data-testid="identity-keep" onClick={keep}>
            Start as {profile.name}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
