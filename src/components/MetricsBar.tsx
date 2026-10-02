import { highestOwnedTier, production } from "../game/economy.ts"
import { formatMultiplier, formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

export function MetricsBar() {
  const xp = useGame((state) => state.xp)
  const owned = useGame((state) => state.owned)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const rates = production(owned, activeBoost, now)
  const stage = highestOwnedTier(owned)
  const seconds =
    activeBoost && activeBoost.endsAt > now ? Math.ceil((activeBoost.endsAt - now) / 1000) : 0

  return (
    <header className="topbar">
      <div className="brand">
        <p className="eyebrow">Career clicker</p>
        <h1>Tech Ascension</h1>
      </div>
      <dl className="metrics">
        {rates.idle > 0 ? (
          <div className="metric-in m-rate">
            <dt>$/s</dt>
            <dd data-testid="per-sec">${formatNumber(rates.idle)}</dd>
          </div>
        ) : null}
        <div className="m-rate">
          <dt>$/click</dt>
          <dd data-testid="per-click">${formatNumber(rates.click)}</dd>
        </div>
        <div className="m-xp">
          <dt>XP</dt>
          <dd data-testid="xp">{formatNumber(xp)}</dd>
        </div>
        {seconds > 0 ? (
          <div className="m-boost">
            <dt>Click boost</dt>
            <dd data-testid="boost">
              ×{formatMultiplier(rates.mult)} · {seconds}s
            </dd>
          </div>
        ) : null}
        <div className="m-stage">
          <dt>Stage</dt>
          <dd data-testid="stage-name">{stage?.name ?? "High school"}</dd>
        </div>
      </dl>
    </header>
  )
}
