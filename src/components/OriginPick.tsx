import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ORIGINS } from "../data/origins.ts"
import type { OriginId } from "../data/origins.ts"
import { originDue } from "../game/build.ts"
import { useGame } from "../game/store.ts"
import { useFocusTrap } from "./useFocusTrap.ts"
import { ModalBackdrop } from "./ModalBackdrop.tsx"

/**
 * The career's first real choice: a minute in, once the first skill is learned and a pick means something, where you
 * came from. It cannot be waved away, the three paths price the early game against each other, and it is kept for
 * the whole career. A career that never kept its handle (an agent's bare `keepProfile`) is not asked until it does.
 */
export function OriginPick() {
  const due = useGame((state) => originDue(state))
  return due ? <OriginCard /> : null
}

function OriginCard() {
  const pickOrigin = useGame((state) => state.pickOrigin)
  const [chosen, setChosen] = useState<OriginId | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLButtonElement>(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
  }, [])

  const pick = ORIGINS.find((row) => row.id === chosen)
  return createPortal(
    <ModalBackdrop className="event-backdrop" data-testid="origin-backdrop">
      <div
        ref={dialogRef}
        className="event-modal identity-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="origin-title"
        tabIndex={-1}
        data-testid="origin-pick"
      >
        <p className="event-kicker">Your first choice</p>
        <h2 id="origin-title" className="event-title">
          Where did you come from?
        </h2>
        <p className="event-flavor">Each path makes one part of the early game cheaper and charges you somewhere else. It stays with you for the whole career.</p>
        <div className="identity-origins" role="radiogroup" aria-label="Origin" data-testid="identity-origins">
          {ORIGINS.map((row) => (
            <button
              key={row.id}
              type="button"
              role="radio"
              aria-checked={chosen === row.id}
              className={chosen === row.id ? "identity-origin is-on" : "identity-origin"}
              data-testid={`identity-origin-${row.id}`}
              onClick={() => setChosen(row.id)}
            >
              <strong>{row.name}</strong>
              <span>{row.blurb}</span>
              <small className="identity-origin-up">{row.upside}</small>
              <small className="identity-origin-cost">{row.cost}</small>
              <small className="identity-origin-leans">{`Leans toward ${row.leans}`}</small>
            </button>
          ))}
        </div>
        <div className="event-actions">
          <button
            ref={mainRef}
            type="button"
            className="event-choice event-yes"
            data-testid="origin-confirm"
            disabled={pick === undefined}
            onClick={() => chosen && pickOrigin(chosen)}
          >
            {pick ? `Take the ${pick.name} path` : "Pick a path"}
          </button>
        </div>
      </div>
    </ModalBackdrop>,
    document.body,
  )
}
