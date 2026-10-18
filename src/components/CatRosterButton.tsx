import { Cat } from "lucide-react"
import { useState } from "react"
import { CatRosterModal } from "./CatRosterModal.tsx"
import { UI_ICON } from "./icons/ui.tsx"
import { useGame } from "../game/store.ts"

/**
 * Door to the cat roster, hidden until the desk cat has turned into its first cat. It sits in the top bar, and on a
 * phone in the activity bar under the inventory, where the top bar has no room.
 */
export function CatRosterButton({ place = "top" }: { place?: "top" | "activity" }) {
  const any = useGame((state) => state.stats.catsFound.length > 0)
  const [open, setOpen] = useState(false)

  if (!any) return null

  return (
    <>
      <button
        type="button"
        className={place === "top" ? "ide-settings desktop-only" : "ide-activity-btn cat-roster-open"}
        data-testid="cat-roster-button"
        aria-label="Cat roster"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Cat {...(place === "top" ? {} : { className: "ide-activity-icon" })} {...UI_ICON} aria-hidden />
      </button>
      {open ? <CatRosterModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}
