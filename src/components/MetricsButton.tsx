import { ChartLine } from "lucide-react"
import { useState } from "react"
import { useGame } from "../game/store.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { MetricsModal } from "./MetricsModal.tsx"
import { useFeatureOpen, useSurface } from "./useFeature.ts"

/** Career telemetry, an activity-bar button. It arrives with the first job, when someone starts tracking the numbers. */
export function MetricsButton() {
  const [open, setOpen] = useState(false)
  const unlocked = useFeatureOpen("metrics")
  const seeFeature = useGame((state) => state.seeFeature)
  const show = () => {
    seeFeature("metrics")
    setOpen(true)
  }
  useSurface("metrics", show)

  if (!unlocked) {
    return (
      <FeatureGhost id="metrics" className="ide-activity-btn">
        <ChartLine className="ide-activity-icon" {...UI_ICON} aria-hidden />
      </FeatureGhost>
    )
  }

  return (
    <>
      <button
        type="button"
        className="ide-activity-btn"
        data-testid="metrics-button"
        data-feature-anchor="metrics"
        aria-label="Stats"
        title="Stats"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <ChartLine className="ide-activity-icon" {...UI_ICON} aria-hidden />
        <NewMark id="metrics" />
      </button>
      {open ? <MetricsModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}
