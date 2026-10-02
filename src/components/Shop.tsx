import { useMemo, useState } from "react"
import { eraSections, tiersInEra } from "../data/eras.ts"
import { ERA_ACCENT, spriteForTier } from "../data/sprites.ts"
import type { Era } from "../data/tiers.ts"
import { canAfford, highestOwnedTier, isRevealed, nextCost, ownedCount } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

function OwnedCount({ value }: { value: number }) {
  const [initial] = useState(value)
  return (
    <span key={value} className={value !== initial ? "own tick-up" : "own"}>
      {formatNumber(value)}
    </span>
  )
}

export function Shop() {
  const money = useGame((state) => state.money)
  const peakMoney = useGame((state) => state.peakMoney)
  const owned = useGame((state) => state.owned)
  const buy = useGame((state) => state.buy)
  const wipe = useGame((state) => state.wipe)
  const [pickedEra, setPickedEra] = useState<Era | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())

  const revealedByEra = useMemo(() => {
    const map = new Map<Era, ReturnType<typeof tiersInEra>>()
    for (const section of eraSections()) {
      const rows = tiersInEra(section.id).filter((tier) => isRevealed(tier, owned, peakMoney))
      if (rows.length > 0) map.set(section.id, rows)
    }
    return map
  }, [owned, peakMoney])

  const sections = eraSections().filter((section) => revealedByEra.has(section.id))
  const fallbackEra = highestOwnedTier(owned)?.era ?? sections[sections.length - 1]?.id ?? "early"
  const era = pickedEra && revealedByEra.has(pickedEra) ? pickedEra : fallbackEra
  const rows = revealedByEra.get(era) ?? []
  const current = sections.find((section) => section.id === era)

  const revealedIds = [...revealedByEra.values()].flat().map((tier) => tier.key)
  const [known, setKnown] = useState<ReadonlySet<string>>(() => new Set(revealedIds))
  if (revealedIds.length !== known.size || revealedIds.some((id) => !known.has(id))) {
    const added = revealedIds.filter((id) => !known.has(id))
    setKnown(new Set(revealedIds))
    setFresh((current) => (revealedIds.length === 0 ? new Set() : new Set([...current, ...added])))
  }

  function onBuy(id: string, mode: "one" | "max") {
    setFlashId(id)
    buy(id, mode)
    setFresh((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
    window.setTimeout(() => {
      setFlashId((currentId) => (currentId === id ? null : currentId))
    }, 440)
  }

  return (
    <aside className="shop" data-testid="shop">
      <div className="shop-head">
        <div>
          <p className="eyebrow">Shop</p>
          <h2>Buy the next rung</h2>
        </div>
        {current ? <p className="era-hint">{current.hint}</p> : null}
      </div>
      {sections.length > 1 ? (
        <div className="era-tabs" role="tablist" aria-label="Career eras">
          {sections.map((section) => {
            const eraRows = revealedByEra.get(section.id) ?? []
            const affordable = eraRows.some((tier) =>
              canAfford(money, nextCost(tier.baseCost, ownedCount(owned, tier.key))),
            )
            const hasFresh = section.id !== era && eraRows.some((tier) => fresh.has(tier.key))
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={section.id === era}
                className={[
                  "era-tab",
                  section.id === era ? "active" : "",
                  hasFresh ? "has-fresh" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ ["--tab-glow" as string]: ERA_ACCENT[section.id].glow }}
                onClick={() => setPickedEra(section.id)}
              >
                {section.label}
                {affordable ? <i className="deal-dot" aria-label="Something is affordable" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="shop-list" key={era}>
        {rows.length === 0 ? (
          <p className="shop-empty">Nothing within reach yet. Keep clicking.</p>
        ) : null}
        {rows.map((tier, index) => {
          const have = ownedCount(owned, tier.key)
          const cost = nextCost(tier.baseCost, have)
          const afford = canAfford(money, cost)
          const isFresh = fresh.has(tier.key)
          return (
            <article
              key={tier.key}
              className={[
                "offer",
                afford ? "afford" : "",
                flashId === tier.key ? "flash" : "",
                isFresh ? "fresh" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ ["--offer-glow" as string]: ERA_ACCENT[tier.era].glow, ["--i" as string]: index }}
            >
              <img src={spriteForTier(tier.key)} alt="" width={48} height={48} />
              <div className="offer-copy">
                <h3>
                  {tier.name}
                  {isFresh ? <span className="new-tag">New</span> : null}
                </h3>
                <p>
                  +{formatNumber(tier.cps)}/s
                  {tier.clickBonus > 0 ? ` · +${formatNumber(tier.clickBonus)} click` : ""}
                  {" · owned "}
                  <OwnedCount value={have} />
                </p>
              </div>
              <div className="offer-actions">
                <button type="button" disabled={!afford} onClick={() => onBuy(tier.key, "one")}>
                  Buy ${formatNumber(cost)}
                </button>
                <button type="button" className="ghost" disabled={!afford} onClick={() => onBuy(tier.key, "max")}>
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
