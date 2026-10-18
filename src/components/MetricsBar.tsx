import { memo } from "react"
import { MousePointerClick, Timer, Users } from "lucide-react"
import { CornerActions } from "./CornerActions.tsx"
import { formatMult, TARGET_LABEL } from "../game/events.ts"
import { TEMP_TARGETS } from "../game/mods.ts"
import { formatNumber } from "../game/format.ts"
import { totalUsers, WORLD_TARGET } from "../game/globe/world.ts"
import { PHASE_NAME } from "../game/phase.ts"
import { openSurface } from "../game/surfaces.ts"
import { useGame } from "../game/store.ts"
import { FullTimeCell } from "./FullTime.tsx"
import { useFeatureOpen } from "./useFeature.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { useLiveRates } from "./useLiveRates.ts"

// The bar follows XP and the clock every tick; the buttons on its right do not.
const CornerActionsMemo = memo(CornerActions)

export function MetricsBar() {
  const phase = useGame((state) => state.phase)
  const now = useGame((state) => state.now)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const { rates, perSec, clickPays, perClick, xpPerClick, money } = useLiveRates()
  const worldOpen = useFeatureOpen("studio")
  const company = useGame((state) => state.company)
  const users = totalUsers(company.users)
  const incidents = company.incidents.length
  const product = useGame((state) => state.profile.product)

  // Currency slots: money and XP, each with its click rate (pointer) and its idle rate (timer). The XP total is in the metrics modal,
  // and on a phone the slots move there too.
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">TA</span>
        <h1 className="sr-only">Tech Ascension</h1>
      </div>
      <dl className="metrics">
        <div className="m-phase">
          <dt>Phase {phase}</dt>
          <dd data-testid="phase">{PHASE_NAME[phase]}</dd>
        </div>
        {money ? (
          <div className="m-slot m-money">
            <dt>Money</dt>
            {perSec > 0 ? (
              <dd className="m-line metric-in">
                <Timer {...UI_ICON_SM} aria-label="Idle, per second" />
                <span data-testid="per-sec">${formatNumber(perSec)}/s</span>
              </dd>
            ) : null}
            {clickPays ? (
              <dd className="m-line metric-in">
                <MousePointerClick {...UI_ICON_SM} aria-label="Per click" />
                <span data-testid="per-click">${formatNumber(perClick)}</span>
              </dd>
            ) : null}
          </div>
        ) : null}
        <div className="m-slot m-xp">
          <dt>XP</dt>
          <dd className="m-line">
            <MousePointerClick {...UI_ICON_SM} aria-label="Per click" />
            <span data-testid="xp-per-click">{formatNumber(xpPerClick)}</span>
          </dd>
          {rates.xpIdle > 0 ? (
            <dd className="m-line metric-in">
              <Timer {...UI_ICON_SM} aria-label="Idle, per second" />
              <span data-testid="xp-per-sec">{formatNumber(rates.xpIdle)}/s</span>
            </dd>
          ) : null}
        </div>
        {foreverMult !== 1 ? (
          <div className="m-boost">
            <dt>Event bonus</dt>
            <dd data-testid="forever-mult">x{formatMult(foreverMult)}</dd>
          </div>
        ) : null}
        {TEMP_TARGETS.map((target) => {
          const entry = tempMults[target]
          if (!entry || !(entry.endsAt > now)) return null
          return (
            <div key={target} className="m-boost">
              <dt>{TARGET_LABEL[target]}</dt>
              <dd data-testid={`temp-${target}`}>
                x{formatMult(entry.mult)} · {Math.ceil((entry.endsAt - now) / 1000)}s
              </dd>
            </div>
          )
        })}
        {worldOpen ? (
          <div className={incidents > 0 ? "m-world is-hot" : "m-world"}>
            <dt>{incidents > 0 ? `${product} · ${incidents} incident${incidents === 1 ? "" : "s"}` : product}</dt>
            <dd>
              <button type="button" className="m-world-open" data-testid="world-users" title={product} onClick={() => openSurface("studio")}>
                <Users {...UI_ICON_SM} aria-hidden />
                {users > 0 ? formatNumber(Math.floor(users), 1000) : "0"}
                <small> / {formatNumber(WORLD_TARGET, 1000)}</small>
                <span className="m-world-bar" aria-hidden>
                  <i style={{ width: `${Math.min(100, Math.max(users > 0 ? 2 : 0, (users / WORLD_TARGET) * 100))}%` }} />
                </span>
              </button>
            </dd>
          </div>
        ) : null}
        <FullTimeCell />
      </dl>
      <CornerActionsMemo />
    </header>
  )
}
