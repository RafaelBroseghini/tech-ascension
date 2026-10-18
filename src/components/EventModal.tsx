import { useEffect, useMemo, useRef } from "react"
import { eventById, previewOffer } from "../game/events.ts"
import { production } from "../game/economy.ts"
import { modsOf } from "../game/mods.ts"
import { useGame } from "../game/store.ts"
import type { ActiveEvent } from "../game/store.ts"
import { useFocusTrap } from "./useFocusTrap.ts"

/**
 * One random event at a time. Nothing is applied until Yes. No, the backdrop, and Escape
 * decline. Focus stays on the dialog so a held Space from the stage cannot accept it.
 *
 * The offer is derived in render. A Zustand selector must not return a fresh object:
 * React 19 compares getSnapshot with Object.is, and a new object every read is an infinite loop.
 */
export function EventModal() {
  const event = useGame((state) => state.event)
  if (!event) return null
  return <EventDialog event={event} />
}

function EventDialog({ event }: { event: ActiveEvent }) {
  const money = useGame((state) => state.money)
  const xp = useGame((state) => state.xp)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const founder = useGame((state) => state.founder)
  const activeBoost = useGame((state) => state.activeBoost)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const legacy = useGame((state) => state.legacy)
  const now = useGame((state) => state.now)
  const accept = useGame((state) => state.acceptEvent)
  const dismiss = useGame((state) => state.dismissEvent)
  const view = useMemo(() => {
    const def = eventById(event.eventId)
    if (!def) return null
    const at = Math.max(Date.now(), now)
    const rates = production({ skills, equipment, owned, jobs, gigs, founder }, activeBoost, at, modsOf({ foreverMult, tempMults, legacy }))
    return {
      name: def.name,
      flavor: def.flavor,
      ask: def.offer.kind === "gift" ? "Take it?" : "Take the deal?",
      preview: previewOffer(
        def.offer,
        {
          cps: rates.idle,
          click: rates.click,
          xpPerSec: rates.xpIdle,
          xpPerClick: rates.xpClick * rates.mult,
        },
        money,
        xp,
      ),
    }
  }, [event, money, xp, skills, equipment, owned, jobs, gigs, founder, activeBoost, foreverMult, tempMults, legacy, now])
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const eventId = event.id

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") dismiss()
      if (key.key === "Enter" && view?.preview.canAccept) accept()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [eventId, dismiss, accept, view?.preview.canAccept])

  if (!view) return null

  return (
    <div className="event-backdrop" data-testid="event-backdrop" onClick={dismiss}>
      <div
        ref={dialogRef}
        key={event.id}
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        tabIndex={-1}
        data-testid="event-modal"
        data-event={event.eventId}
        onClick={(click) => click.stopPropagation()}
      >
        <p className="event-kicker">Random event</p>
        <h2 id="event-title" className="event-title">
          {view.name}
        </h2>
        <p className="event-flavor">{view.flavor}</p>
        <p className="event-ask">{view.ask}</p>
        <ul className="event-lines" data-testid="event-lines">
          {view.preview.lines.map((line) => (
            <li key={line.text} className={`event-line is-${line.tone}`}>
              {line.text}
            </li>
          ))}
          {view.preview.canAccept ? null : <li className="event-line is-neutral">You can't cover the cost.</li>}
        </ul>
        <div className="event-actions">
          <button
            type="button"
            className="event-choice event-yes"
            data-testid="event-yes"
            disabled={!view.preview.canAccept}
            onClick={accept}
          >
            Yes
          </button>
          <button type="button" className="event-choice event-no" data-testid="event-no" onClick={dismiss}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}
