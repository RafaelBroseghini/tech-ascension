import { LayoutGrid, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { setOpenRoster } from "../game/rosterModal.ts"
import { useGame } from "../game/store.ts"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { UI_ICON } from "./icons/ui.tsx"
import { RosterButtons } from "./IdeStatusDock.tsx"
import { ModalBackdrop } from "./ModalBackdrop.tsx"
import { useFeatureOpen } from "./useFeature.ts"
import { useFocusTrap } from "./useFocusTrap.ts"

/**
 * The door to every roster in the activity bar, at any width. It opens with the rosters on the career timeline (the
 * first gig); the status bar's chip and the settings menu lead to the same list.
 */
export function RostersButton() {
  const unlocked = useFeatureOpen("rosters")
  const seeFeature = useGame((state) => state.seeFeature)
  const [open, setOpen] = useState(false)

  if (!unlocked) {
    return (
      <FeatureGhost id="rosters" className="ide-activity-btn">
        <LayoutGrid className="ide-activity-icon" {...UI_ICON} aria-hidden />
      </FeatureGhost>
    )
  }
  return (
    <>
      <button
        type="button"
        className="ide-activity-btn"
        data-testid="rosters-open"
        aria-label="Rosters"
        title="Rosters"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          seeFeature("rosters")
          setOpen(true)
        }}
      >
        <LayoutGrid className="ide-activity-icon" {...UI_ICON} aria-hidden />
        <NewMark id="rosters" />
      </button>
      {open ? <RostersMenu onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function RostersMenu({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <ModalBackdrop className="stats-backdrop" data-testid="rosters-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="stats-modal owned-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rosters-title"
        tabIndex={-1}
        data-testid="rosters-menu"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="stats-head">
          <div>
            <p className="event-kicker">Everything you own</p>
            <h2 id="rosters-title" className="stats-title">
              Rosters
            </h2>
          </div>
          <button type="button" className="stats-x" aria-label="Close rosters" onClick={onClose}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>
        <div style={{ padding: "var(--sp-3)" }}>
          <RosterButtons
            withCats
            onPick={(kind) => {
              onClose()
              setOpenRoster(kind)
            }}
          />
        </div>
      </div>
    </ModalBackdrop>,
    document.body,
  )
}
