import { Cat } from "lucide-react"
import { useState } from "react"
import { CatRosterModal } from "./CatRosterModal.tsx"
import { UI_ICON } from "./icons/ui.tsx"
import { useGame } from "../game/store.ts"

/** Top-bar door to the cat roster. Hidden until the desk cat has turned into its first cat. */
export function CatRosterButton() {
  const any = useGame((state) => state.stats.catsFound.length > 0)
  const [open, setOpen] = useState(false)

  if (!any) return null

  return (
    <>
      <button
        type="button"
        className="ide-settings"
        data-testid="cat-roster-button"
        aria-label="Cat roster"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Cat {...UI_ICON} aria-hidden />
      </button>
      {open ? <CatRosterModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}
