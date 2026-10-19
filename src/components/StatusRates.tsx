import { Timer } from "lucide-react"
import { formatNumber } from "../game/format.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { useLiveRates } from "./useLiveRates.ts"

/** The idle rates in the status bar: dollars and XP a second. The click rates are on the balance card. */
export function StatusRates() {
  const { perSec, xpPerSec } = useLiveRates()
  return (
    <>
      {perSec > 0 ? (
        <span className="ide-status-rate" title="Money per second">
          <Timer {...UI_ICON_SM} aria-label="Idle, per second" />
          <span data-testid="per-sec">${formatNumber(perSec)}/s</span>
        </span>
      ) : null}
      {xpPerSec > 0 ? (
        <span className="ide-status-rate" title="XP per second">
          <Timer {...UI_ICON_SM} aria-label="Idle, per second" />
          <span data-testid="xp-per-sec">{formatNumber(xpPerSec)} XP/s</span>
        </span>
      ) : null}
    </>
  )
}
