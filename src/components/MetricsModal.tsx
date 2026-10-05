import { ChevronRight, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CatRosterModal } from "./CatRosterModal.tsx"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import { CAT_ROSTER } from "../game/catRoster.ts"
import { formatNumber } from "../game/format.ts"
import { formatIdleStreak, formatPlayTime } from "../game/stats.ts"
import type { GameStats } from "../game/stats.ts"
import { useGame } from "../game/store.ts"

type Row = { label: string; value: string }

function buildRows(stats: GameStats, peakMoney: number, gigs: number, jobs: number): Row[] {
  return [
    { label: "Total clicks", value: formatNumber(stats.totalClicks) },
    { label: "Longest click streak", value: formatNumber(stats.longestClickStreak) },
    { label: "Longest idle streak", value: formatIdleStreak(stats.longestIdleMs) },
    { label: "Highest balance held", value: `$${formatNumber(peakMoney)}` },
    { label: "Lifetime earnings", value: `$${formatNumber(stats.lifetimeEarned)}` },
    { label: "From clicking", value: `$${formatNumber(stats.moneyFromClicks)}` },
    { label: "From idle & offline", value: `$${formatNumber(stats.moneyFromIdle)}` },
    { label: "Gigs cleared", value: formatNumber(gigs) },
    { label: "Jobs held", value: formatNumber(jobs) },
    { label: "Time played", value: formatPlayTime(stats.playTimeMs) },
  ]
}

export function MetricsModal({ onClose }: { onClose: () => void }) {
  const stats = useGame((state) => state.stats)
  const peakMoney = useGame((state) => state.peakMoney)
  const gigs = useGame((state) => state.gigs.length)
  const jobs = useGame((state) => state.jobs.length)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [roster, setRoster] = useState(false)
  const rows = buildRows(stats, peakMoney, gigs, jobs)

  useEffect(() => {
    if (roster) return
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, roster])

  // Escape in the roster goes back to the metrics, not out of both.
  if (roster) return <CatRosterModal onClose={() => setRoster(false)} />

  return createPortal(
    <div className="stats-backdrop" data-testid="stats-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="stats-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        tabIndex={-1}
        data-testid="stats-modal"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="stats-head">
          <div>
            <p className="event-kicker">Career telemetry</p>
            <h2 id="stats-title" className="stats-title">
              Metrics
            </h2>
          </div>
          <button type="button" className="stats-x" aria-label="Close metrics" onClick={onClose}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>
        <dl className="stats-grid">
          {rows.map((row) => (
            <div key={row.label} className="stats-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
          <div className="stats-row">
            <dt>Cats discovered</dt>
            <dd data-testid="stats-cats">
              {formatNumber(stats.catsFound.length)} / {formatNumber(CAT_ROSTER.length)}
            </dd>
          </div>
        </dl>
        <button type="button" className="stats-roster" data-testid="open-cat-roster" onClick={() => setRoster(true)}>
          Cat roster
          <ChevronRight {...UI_ICON_SM} aria-hidden />
        </button>
      </div>
    </div>,
    document.body,
  )
}
