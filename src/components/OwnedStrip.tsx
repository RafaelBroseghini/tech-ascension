import { spriteForTier } from "../data/sprites.ts"
import { ownedSources } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

export function OwnedStrip() {
  const owned = useGame((state) => state.owned)
  const rows = ownedSources(owned)

  if (rows.length === 0) return null

  return (
    <ul className="owned-strip" data-testid="owned-strip" aria-label="Owned generators">
      {rows.map(({ tier, count, idle }) => (
        <li key={tier.id} className="owned-row" data-tier={tier.id}>
          <img
            className="owned-thumb"
            src={spriteForTier(tier.id)}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            draggable={false}
          />
          <span className="owned-name">{tier.name}</span>
          <span className="owned-count">×{formatNumber(count)}</span>
          <span className="owned-rate">${formatNumber(idle)}/s</span>
        </li>
      ))}
    </ul>
  )
}
