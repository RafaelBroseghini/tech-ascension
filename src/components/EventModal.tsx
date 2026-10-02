import { useEffect, useRef } from "react"
import { eventById } from "../game/events.ts"
import { useGame } from "../game/store.ts"

/**
 * One random event at a time. The effects are already applied when this opens, so closing it
 * (button, backdrop or Escape) can never undo or skip anything, and a player who walks away is
 * not penalised. Focus lands on the dialog, not the button, so a held Space from clicking the
 * stage cannot dismiss it before it is read.
 */
export function EventModal() {
  const event = useGame((state) => state.event)
  const dismiss = useGame((state) => state.dismissEvent)
  const dialogRef = useRef<HTMLDivElement>(null)
  const eventId = event?.id

  useEffect(() => {
    if (eventId === undefined) return
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [eventId, dismiss])

  if (!event) return null
  const def = eventById(event.eventId)
  if (!def) return null

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
        data-event={def.id}
        onClick={(click) => click.stopPropagation()}
      >
        <p className="event-kicker">Random event</p>
        <h2 id="event-title" className="event-title">
          {def.name}
        </h2>
        <p className="event-flavor">{def.flavor}</p>
        <ul className="event-lines" data-testid="event-lines">
          {event.lines.length === 0 ? <li className="event-line is-neutral">Nothing to lose this time.</li> : null}
          {event.lines.map((line) => (
            <li key={line.text} className={`event-line is-${line.tone}`}>
              {line.text}
            </li>
          ))}
        </ul>
        <button type="button" className="event-dismiss" data-testid="event-dismiss" onClick={dismiss}>
          Continue
        </button>
      </div>
    </div>
  )
}
