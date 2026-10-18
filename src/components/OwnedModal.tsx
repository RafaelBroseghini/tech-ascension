import { Briefcase, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { UI_ICON } from "./icons/ui.tsx"
import { OwnedStrip } from "./OwnedStrip.tsx"
import { Skills } from "./Skills.tsx"

/** On a narrow screen the owned list and skill icons do not fit under the art, so a briefcase opens them in a modal. */
export function OwnedButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="owned-open"
        data-testid="owned-open"
        aria-label="Owned"
        title="Owned"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Briefcase {...UI_ICON} aria-hidden />
      </button>
      {open ? <OwnedModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function OwnedModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div className="stats-backdrop" data-testid="owned-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="stats-modal owned-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="owned-title"
        tabIndex={-1}
        data-testid="owned-modal"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="stats-head">
          <div>
            <p className="event-kicker">What you have</p>
            <h2 id="owned-title" className="stats-title">
              Owned
            </h2>
          </div>
          <button type="button" className="stats-x" aria-label="Close owned" onClick={onClose}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>
        <OwnedStrip />
        <Skills />
      </div>
    </div>,
    document.body,
  )
}
