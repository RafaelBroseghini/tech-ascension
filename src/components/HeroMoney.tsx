import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

export function HeroMoney() {
  const money = useGame((state) => state.money)
  const buyStamp = useGame((state) => state.buyStamp)

  return (
    <div className="hero-money" aria-live="off">
      <span className="hero-money-label">Money</span>
      <span
        key={buyStamp}
        data-testid="money"
        className={buyStamp > 0 ? "hero-money-value tick-up" : "hero-money-value"}
      >
        ${formatNumber(money)}
      </span>
    </div>
  )
}
