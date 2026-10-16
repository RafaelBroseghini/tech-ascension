import { CITIES, distanceKm, networkMs } from "../../data/geo.ts"
import type { AudienceShare } from "../../data/geo.ts"
import { nearestPop } from "./footprint.ts"
import type { Wave } from "./wave.ts"

/** One city of the audience as the globe and its list show it. */
export interface CityRow {
  readonly city: string
  readonly name: string
  readonly country: string
  readonly share: number
  /** The point of presence that serves it: the nearest deployed city. */
  readonly pop: string
  /** Round trip to the region that serves it, in ms. */
  readonly ms: number
  readonly km: number
  /** Requests a second at the first phase's traffic. */
  readonly rps: number
}

export interface CityTally {
  readonly sent: number
  readonly dropped: number
}

/** The audience, biggest first, with what each city pays to reach the region that serves it. */
export function cityRows(audience: readonly AudienceShare[], rps: number, pops: readonly string[]): CityRow[] {
  const regions = pops.map((pop) => CITIES[pop]!)
  return [...audience]
    .filter((a) => CITIES[a.city])
    .sort((a, b) => b.share - a.share)
    .map((a) => {
      const km = Math.min(...regions.map((region) => distanceKm(CITIES[a.city], region)))
      return { city: a.city, name: CITIES[a.city].name, country: CITIES[a.city].country, share: a.share, pop: nearestPop(a.city, pops), ms: Math.round(networkMs(km)), km: Math.round(km), rps: Math.round(rps * a.share) }
    })
}

/** How many requests each city sent in a wave and how many of them were dropped. */
export function tallyByCity(wave: Wave): Map<string, CityTally> {
  const tally = new Map<string, { sent: number; dropped: number }>()
  for (const phase of wave.phases) {
    for (const unit of phase.units) {
      const row = tally.get(unit.city) ?? { sent: 0, dropped: 0 }
      row.sent++
      if (unit.fate.kind === "dropped") row.dropped++
      tally.set(unit.city, row)
    }
  }
  return tally
}

/** The share of each city's requests that were dropped, for the cities that lost any. */
export function dropShares(tally: ReadonlyMap<string, CityTally>): Map<string, number> {
  return new Map([...tally].filter(([, t]) => t.dropped > 0).map(([city, t]) => [city, t.dropped / t.sent]))
}

export interface Tip {
  readonly title: string
  /** Country code of the city the tip is about, for its flag. */
  readonly country?: string
  readonly lines: readonly string[]
}

const count = (n: number) => n.toLocaleString("en-US")
const percent = (share: number) => `${Math.round(share * 100)}%`

function lastRun(tally: CityTally | null): string {
  if (!tally) return "No traffic run yet."
  const lost = tally.dropped === 0 ? "none dropped" : `${count(tally.dropped)} dropped (${percent(tally.dropped / tally.sent)})`
  return `Last run: ${count(tally.sent)} sent, ${lost}.`
}

/** What the tooltip says for a dot or an edge: who is there, how long the trip takes, and how the last wave went. */
export function describe(target: { readonly kind: "city" | "edge" | "home" | "pop"; readonly city: string }, rows: readonly CityRow[], tally: ReadonlyMap<string, CityTally> | null, home: string): Tip | null {
  if (target.kind === "home" || target.kind === "pop") {
    const served = rows.filter((r) => r.pop === target.city)
    const sums = served.flatMap((r) => tally?.get(r.city) ?? [])
    const total = sums.length > 0 ? { sent: sums.reduce((n, t) => n + t.sent, 0), dropped: sums.reduce((n, t) => n + t.dropped, 0) } : null
    const name = target.kind === "home" ? home : (CITIES[target.city]?.name ?? target.city)
    const reach = served.length === 0 ? 0 : served.reduce((n, r) => n + r.ms * r.share, 0) / served.reduce((n, r) => n + r.share, 0)
    return {
      title: target.kind === "home" ? `${name}, the home region` : `${name}, point of presence`,
      country: CITIES[target.city]?.country,
      lines: [
        served.length === 0 ? "No clients are routed here yet." : `Serves ${served.length} ${served.length === 1 ? "city" : "cities"}, ${percent(served.reduce((n, r) => n + r.share, 0))} of traffic.`,
        `About ${count(served.reduce((n, r) => n + r.rps, 0))} requests a second, ${Math.round(reach)} ms on average.`,
        lastRun(total),
      ],
    }
  }
  const row = rows.find((r) => r.city === target.city)
  if (!row) return null
  const server = CITIES[row.pop]?.name ?? home
  const trip = row.km === 0 ? `${row.ms} ms: the server is in this city.` : `${row.ms} ms to ${server}, ${count(row.km)} km away.`
  const traffic = `${percent(row.share)} of traffic, about ${count(row.rps)} requests a second.`
  const last = lastRun(tally?.get(row.city) ?? null)
  return target.kind === "edge" ? { title: `${row.name} to ${server}`, country: row.country, lines: [traffic, trip, last] } : { title: row.name, country: row.country, lines: [traffic, trip, last] }
}
