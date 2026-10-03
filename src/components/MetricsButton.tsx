import { ChartLine } from "lucide-react"
import { useState } from "react"
import { UI_ICON } from "./icons/ui.tsx"
import { MetricsModal } from "./MetricsModal.tsx"

export function MetricsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="ide-settings"
        data-testid="metrics-button"
        aria-label="Metrics"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ChartLine {...UI_ICON} aria-hidden />
      </button>
      {open ? <MetricsModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}
