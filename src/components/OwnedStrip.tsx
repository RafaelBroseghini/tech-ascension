import { SpriteTap } from "./SpriteView.tsx"
import { ownedSources } from "../game/economy.ts"
import type { OwnedSource } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"
import { useMemo } from "react"

function rateText(row: OwnedSource): string {
  if (row.idle > 0) return `$${formatNumber(row.idle)}/s`
  if (row.xpIdle > 0) return `${formatNumber(row.xpIdle)} XP/s`
  if (row.click > 0) return row.kind === "skill" ? `+${formatNumber(row.click)} XP/click` : `+$${formatNumber(row.click)}/click`
  return ""
}

export function OwnedStrip() {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const legacy = useGame((state) => state.legacy)
  const rows = useMemo(() => ownedSources({ skills, equipment, owned, jobs, gigs, legacy }), [skills, equipment, owned, jobs, gigs, legacy])

  if (rows.length === 0) return null

  return (
    <ul className="owned-strip" data-testid="owned-strip" aria-label="Owned">
      {rows.map((row) => (
        <li key={row.key} className="owned-row" data-kind={row.kind} data-tier={row.id}>
          <SpriteTap kind={row.kind} id={row.id} className="owned-thumb" size={32} label={row.name} />
          <span className="owned-name">{row.name}</span>
          {row.kind === "job" || row.kind === "gig" ? null : <span className="owned-count">×{formatNumber(row.count)}</span>}
          <span className="owned-rate">
            {rateText(row)}
          </span>
        </li>
      ))}
    </ul>
  )
}
