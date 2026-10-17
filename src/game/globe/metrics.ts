import { CITIES } from "../../data/geo.ts"
import type { Company } from "./company.ts"
import type { CityRow } from "./tip.ts"

/** What the app is doing right now, in the numbers a status dashboard leads with. */
export interface AppMetrics {
  /** Requests a second the users send. */
  readonly demand: number
  /** Requests a second the gear can serve. */
  readonly capacity: number
  readonly served: number
  readonly dropped: number
  /** Share of requests answered, 0 to 1. */
  readonly servedShare: number
  /** Demand as a share of capacity; above 1 the app is dropping requests. */
  readonly load: number
  /** Round trip a request pays, averaged over every city by traffic share. */
  readonly avgMs: number
  /** The trip nine in ten requests beat. */
  readonly p95Ms: number
  readonly worst: { readonly city: string; readonly ms: number } | null
  readonly users: number
  readonly cities: number
  /** Users as a share of the target. */
  readonly share: number
  readonly resistance: number
  readonly pops: number
  readonly regions: number
  /** Dollars a second the dropped requests cost. */
  readonly lostPerSec: number
}

export function appMetrics(company: Company, rows: readonly CityRow[]): AppMetrics {
  const total = rows.reduce((n, r) => n + r.share, 0)
  const avgMs = total > 0 ? rows.reduce((n, r) => n + r.ms * r.share, 0) / total : 0
  let p95Ms = 0
  let seen = 0
  for (const row of [...rows].sort((a, b) => a.ms - b.ms)) {
    p95Ms = row.ms
    seen += row.share
    if (seen >= total * 0.95) break
  }
  const worst = rows.reduce<CityRow | null>((w, r) => (w && w.ms >= r.ms ? w : r), null)
  const dropped = company.demand * company.dropShare
  return {
    demand: company.demand,
    capacity: company.capacity,
    served: company.demand - dropped,
    dropped,
    servedShare: 1 - company.dropShare,
    load: company.capacity > 0 ? company.demand / company.capacity : 0,
    avgMs,
    p95Ms,
    worst: worst ? { city: worst.city, ms: worst.ms } : null,
    users: company.users,
    cities: rows.length,
    share: company.share,
    resistance: company.resistance,
    pops: company.pops.length,
    regions: company.regions.length,
    lostPerSec: company.lostPerSec,
  }
}

/** One point of presence and the cities routed to it. */
export interface PopRow {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly cities: number
  readonly share: number
  readonly rps: number
  readonly avgMs: number
}

/** Every deployed point of presence, busiest first, with what it serves. A server nobody is routed to still shows. */
export function popRows(rows: readonly CityRow[], pops: readonly string[]): PopRow[] {
  return pops
    .filter((id) => CITIES[id])
    .map((id) => {
      const served = rows.filter((r) => r.pop === id)
      const share = served.reduce((n, r) => n + r.share, 0)
      return {
        id,
        name: CITIES[id]!.name,
        country: CITIES[id]!.country,
        cities: served.length,
        share,
        rps: served.reduce((n, r) => n + r.rps, 0),
        avgMs: share > 0 ? served.reduce((n, r) => n + r.ms * r.share, 0) / share : 0,
      }
    })
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))
}
