import { Dices } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { initialOf } from "../game/identity.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { useAdmin } from "./useExit.ts"

const STEPS = 3

/**
 * The first thing a new career sees, in three beats on one card: who you are (the handle it drew), what you are building
 * (the product named after its animal) and the bet. Each draw has its own Reroll; Start keeps both for good. Nothing is
 * typed. Esc and the backdrop keep what is on screen too.
 */
export function IdentityPicker() {
  const chosen = useGame((state) => state.profile.chosen)
  // After an Exit the headline comes first; the product beat opens when it is dismissed.
  const admin = useAdmin()
  const headline = useGame((state) => state.exitCard !== null) && admin
  // Mounted only while the profile is open, so a wipe starts the card again at its first step.
  return chosen || headline ? null : <IdentityCard />
}

function IdentityCard() {
  const profile = useGame((state) => state.profile)
  const reroll = useGame((state) => state.rerollProfile)
  const rerollProduct = useGame((state) => state.rerollProduct)
  const keep = useGame((state) => state.keepProfile)
  // A later career keeps the handle: its card opens on the product beat, with no handle to draw.
  const first = useGame((state) => (state.legacy.runs > 1 ? 1 : 0))
  const [step, setStep] = useState(first)
  const mainRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") keep()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [keep, step])

  const last = step === STEPS - 1
  return createPortal(
    <div className="event-backdrop" data-testid="identity-backdrop" onClick={keep}>
      <div
        className="event-modal identity-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="identity-title"
        data-testid="identity-picker"
        data-step={step + 1}
        onClick={(click) => click.stopPropagation()}
      >
        <p className="event-kicker">New career</p>
        {step === 0 ? (
          <>
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
          </>
        ) : null}
        {step === 1 ? (
          <>
            <h2 id="identity-title" className="event-title">
              What you're building
            </h2>
            <div className="identity-draw" aria-live="polite" key={profile.product}>
              <strong className="identity-handle identity-product" data-testid="identity-product">
                {profile.product}
              </strong>
            </div>
            <p className="event-flavor">
              Every career here builds one product. Gigs and jobs pay for it. Its users are the score. The goal is seven billion.
            </p>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h2 id="identity-title" className="event-title">
              The bet
            </h2>
            <p className="event-flavor identity-bet">
              One day you can quit and go full-time on {profile.product}: bigger upside, real risk. Or keep climbing the ladder and build
              it on nights and weekends.
            </p>
          </>
        ) : null}
        <div className="identity-dots" aria-label={`Step ${step - first + 1} of ${STEPS - first}`} role="img">
          {Array.from({ length: STEPS - first }, (_, i) => (
            <i key={i} className={i + first === step ? "is-on" : undefined} />
          ))}
        </div>
        <div className="event-actions">
          {step > first ? (
            <button type="button" className="event-choice event-no" data-testid="identity-back" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step < 2 ? (
            <button
              type="button"
              className="event-choice event-no identity-reroll"
              data-testid={step === 0 ? "identity-reroll" : "identity-product-reroll"}
              onClick={() => (step === 0 ? reroll() : rerollProduct())}
            >
              <Dices {...UI_ICON_SM} aria-hidden />
              Reroll
            </button>
          ) : null}
          {last ? (
            <button ref={mainRef} type="button" className="event-choice event-yes" data-testid="identity-keep" onClick={keep}>
              Start as @{profile.handle}
            </button>
          ) : (
            <button ref={mainRef} type="button" className="event-choice event-yes" data-testid="identity-next" onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
