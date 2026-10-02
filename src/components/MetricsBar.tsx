import { highestOwnedTier, production } from "../game/economy.ts"
import { formatMultiplier, formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

export function MetricsBar() {
  const money = useGame((state) => state.money)
  const xp = useGame((state) => state.xp)
  const owned = useGame((state) => state.owned)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const buyStamp = useGame((state) => state.buyStamp)
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
        <div>
          <dt>Money</dt>
          <dd data-testid="money" key={buyStamp} className={buyStamp > 0 ? "tick-up" : undefined}>
            ${formatNumber(money)}
          </dd>
        </div>
        <div>
          <dt>XP</dt>
          <dd data-testid="xp">{formatNumber(xp)}</dd>
        </div>
        <div>
          <dt>$/click</dt>
          <dd data-testid="per-click">${formatNumber(rates.click)}</dd>
        </div>
        <div>
          <dt>$/s</dt>
          <dd data-testid="per-sec">${formatNumber(rates.idle)}</dd>
        </div>
        <div>
          <dt>Click boost</dt>
          <dd data-testid="boost">
            ×{formatMultiplier(rates.mult)}
            {seconds > 0 ? ` · ${seconds}s` : ""}
          </dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd data-testid="stage-name">{stage?.name ?? "High school"}</dd>
        </div>
      </dl>
    </header>
  )
}
