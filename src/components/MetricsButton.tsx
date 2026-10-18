import { ChartLine } from "lucide-react"
import { useState } from "react"
import { useGame } from "../game/store.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { MetricsModal } from "./MetricsModal.tsx"
import { useFeatureOpen, useSurface } from "./useFeature.ts"
import { useNarrow } from "./useNarrow.ts"

/** Career telemetry. It arrives with the first job, when someone starts tracking the numbers. */
export function MetricsButton() {
  const [open, setOpen] = useState(false)
  const narrow = useNarrow()
  const unlocked = useFeatureOpen("metrics")
  const seeFeature = useGame((state) => state.seeFeature)
  const show = () => {
    seeFeature("metrics")
    setOpen(true)
  }
  useSurface("metrics", show)

  if (!unlocked) {
    return (
      <FeatureGhost id="metrics" place="below" className="ide-settings desktop-only">
        <ChartLine {...UI_ICON} aria-hidden />
      </FeatureGhost>
    )
  }

  return (
    <>
      <button
        type="button"
        className="ide-settings desktop-only"
        data-testid="metrics-button"
        data-feature-anchor={narrow ? undefined : "metrics"}
        aria-label="Metrics"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <ChartLine {...UI_ICON} aria-hidden />
        <NewMark id="metrics" />
      </button>
      {open ? <MetricsModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}
