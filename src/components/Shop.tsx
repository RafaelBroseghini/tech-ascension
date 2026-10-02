import { useState } from "react"
import { eraSections, tiersInEra } from "../data/eras.ts"
import { spriteForTier } from "../data/sprites.ts"
import type { Era } from "../data/tiers.ts"
import { canAfford, highestOwnedTier, nextCost, ownedCount } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

function OwnedCount({ value }: { value: number }) {
  const [initial] = useState(value)
  return (
    <span key={value} className={value !== initial ? "tick-up" : undefined}>
      {formatNumber(value)}
    </span>
  )
}

export function Shop() {
  const money = useGame((state) => state.money)
  const owned = useGame((state) => state.owned)
  const buy = useGame((state) => state.buy)
  const wipe = useGame((state) => state.wipe)
  const sections = eraSections()
  const [era, setEra] = useState<Era>(
    () => highestOwnedTier(useGame.getState().owned)?.era ?? "early",
  )
  const [flashId, setFlashId] = useState<number | null>(null)
  const rows = tiersInEra(era)
  const current = sections.find((section) => section.id === era)

  function onBuy(id: number, mode: "one" | "max") {
    setFlashId(id)
    buy(id, mode)
    window.setTimeout(() => {
      setFlashId((currentId) => (currentId === id ? null : currentId))
    }, 240)
  }

  return (
    <aside className="shop" data-testid="shop">
      <div className="shop-head">
        <div>
          <p className="eyebrow">Shop</p>
          <h2>Buy the next rung</h2>
        </div>
        <p className="era-hint">{current?.hint}</p>
      </div>
      <div className="era-tabs" role="tablist" aria-label="Career eras">
        {sections.map((section) => {
          const affordable = tiersInEra(section.id).some((tier) =>
            canAfford(money, nextCost(tier.baseCost, ownedCount(owned, tier.id))),
          )
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={section.id === era}
              className={section.id === era ? "era-tab active" : "era-tab"}
              onClick={() => setEra(section.id)}
            >
              {section.label}
              {affordable ? <i className="deal-dot" aria-label="Something is affordable" /> : null}
            </button>
          )
        })}
      </div>
      <div className="shop-list">
        {rows.map((tier) => {
          const have = ownedCount(owned, tier.id)
          const cost = nextCost(tier.baseCost, have)
          const afford = canAfford(money, cost)
          return (
            <article
              key={tier.id}
              className={[
                "offer",
                afford ? "afford" : "",
                flashId === tier.id ? "flash" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <img src={spriteForTier(tier.id)} alt="" width={48} height={48} />
              <div className="offer-copy">
                <h3>{tier.name}</h3>
                <p>
                  +{formatNumber(tier.cps)}/s
                  {tier.clickBonus > 0 ? ` · +${formatNumber(tier.clickBonus)} click` : ""}
                  {" · owned "}
                  <OwnedCount value={have} />
                </p>
              </div>
              <div className="offer-actions">
                <button type="button" disabled={!afford} onClick={() => onBuy(tier.id, "one")}>
                  Buy ${formatNumber(cost)}
                </button>
                <button type="button" className="ghost" disabled={!afford} onClick={() => onBuy(tier.id, "max")}>
                  Max
                </button>
              </div>
            </article>
          )
        })}
      </div>
      <button
        type="button"
        className="wipe"
        onClick={() => {
          if (window.confirm("Wipe this save? Your career restarts at high school.")) wipe()
        }}
      >
        Wipe save
      </button>
    </aside>
  )
}
