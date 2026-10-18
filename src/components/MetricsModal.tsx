import { X } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { UI_ICON } from "./icons/ui.tsx"
import { CAT_ROSTER } from "../game/catRoster.ts"
import { formatNumber } from "../game/format.ts"
import { formatIdleStreak, formatPlayTime } from "../game/stats.ts"
import type { GameStats } from "../game/stats.ts"
import { useGame } from "../game/store.ts"
import { useLiveRates } from "./useLiveRates.ts"

type Row = { label: string; value: string }

function buildRows(stats: GameStats, peakMoney: number, gigs: number, jobs: number): Row[] {
  return [
    { label: "Longest idle streak", value: formatIdleStreak(stats.longestIdleMs) },
    { label: "Highest balance held", value: `$${formatNumber(peakMoney)}` },
    { label: "Lifetime earnings", value: `$${formatNumber(stats.lifetimeEarned)}` },
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
  const rows = buildRows(stats, peakMoney, gigs, jobs)
  const live = useLiveRates()
  // On a phone the top bar has no room for the money and XP slots, so they are here instead. On a wide screen this group is hidden.
  const rates: Row[] = [
    ...(live.perSec > 0 ? [{ label: "Money a second", value: `$${formatNumber(live.perSec)}/s` }] : []),
    ...(live.clickPays ? [{ label: "Money a click", value: `$${formatNumber(live.perClick)}` }] : []),
    { label: "XP a click", value: formatNumber(live.xpPerClick) },
    ...(live.xpPerSec > 0 ? [{ label: "XP a second", value: `${formatNumber(live.xpPerSec)}/s` }] : []),
  ]

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

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
        <dl className="stats-grid stats-rates" data-testid="stats-rates" aria-label="Right now">
          {rates.map((row) => (
            <div key={row.label} className="stats-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
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
      </div>
    </div>,
    document.body,
  )
}
