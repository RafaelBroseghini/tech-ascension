import { memo, useMemo } from "react"
import { CITIES } from "../../data/geo.ts"
import { CityFlag } from "./CityFlag.tsx"
import type { Company } from "../../game/globe/company.ts"
import { formatNumber } from "../../game/format.ts"
import { appMetrics, popRows } from "../../game/globe/metrics.ts"
import { cityRows } from "../../game/globe/tip.ts"

/** The numbers behind the globe on the desk: the app's dashboard, the points of presence, the busiest client cities and the fleet. */
export interface FleetRow {
  readonly id: number
  readonly name: string
  readonly count: number
  readonly rps: number
}

const count = (n: number) => formatNumber(Math.round(n))
const percent = (n: number) => `${Math.round(n * 100)}%`

/** One figure of the app's dashboard: what it is, its value, and a line under it. `tone` colours the value when the app is struggling. */
function Metric({ id, label, value, sub, tone }: { id: string; label: string; value: string; sub: string; tone?: "warn" | "bad" | "good" }) {
  return (
    <div className={`globe-metric${tone ? ` is-${tone}` : ""}`} data-metric={id}>
      <small>{label}</small>
      <b>{value}</b>
      <span>{sub}</span>
    </div>
  )
}

export const GlobePane = memo(function GlobePane({ company, fleet }: { company: Company; fleet: readonly FleetRow[] }) {
  const rows = useMemo(() => cityRows(company.audience, company.demand, company.pops), [company])
  const metrics = useMemo(() => appMetrics(company, rows), [company, rows])
  const servers = useMemo(() => popRows(rows, company.pops), [rows, company.pops])
  const stress = metrics.dropped > 0 ? "bad" : metrics.load > 0.8 ? "warn" : "good"
  return (
    <section className="globe" data-testid="company-globe" aria-label="Where the clients are">
      <header className="globe-metrics" data-testid="company-metrics">
        <Metric id="requests" label="Requests" value={`${count(metrics.demand)}/s`} sub={`${count(metrics.capacity)}/s capacity`} tone={metrics.load > 0.8 ? "warn" : undefined} />
        <Metric id="served" label="Served" value={percent(metrics.servedShare)} sub={metrics.dropped > 0 ? `${count(metrics.dropped)}/s dropped` : "none dropped"} tone={stress} />
        <Metric id="latency" label="Latency" value={`${Math.round(metrics.avgMs)} ms`} sub={`p95 ${Math.round(metrics.p95Ms)} ms`} />
        <Metric id="clients" label="Clients" value={count(metrics.clients)} sub={`${metrics.cities} cities, ${Math.round(metrics.popularity)}% popular`} />
        <Metric id="footprint" label="Footprint" value={`${metrics.pops} PoP${metrics.pops === 1 ? "" : "s"}`} sub={`${metrics.regions} region${metrics.regions === 1 ? "" : "s"}`} />
        <Metric id="lost" label="Revenue lost" value={metrics.lostPerSec > 0 ? `$${formatNumber(metrics.lostPerSec)}/s` : "$0/s"} sub={metrics.worst ? `slowest ${CITIES[metrics.worst.city]?.name ?? ""} ${metrics.worst.ms} ms` : "no clients yet"} tone={metrics.lostPerSec > 0 ? "bad" : undefined} />
        <div className={`globe-load is-${stress}`} role="img" aria-label={`Load is ${percent(metrics.load)} of capacity`}>
          <i style={{ width: `${Math.min(100, metrics.load * 100)}%` }} />
        </div>
      </header>
      <div className="globe-body">
        <div className="globe-lists">
          <h4>Points of presence</h4>
          <ul className="globe-pops" data-testid="company-globe-pops">
            {servers.map((row) => (
              <li key={row.id} data-pop={row.id} data-idle={row.cities === 0 ? "true" : undefined}>
                <span>
                  <em aria-hidden />
                  <CityFlag country={row.country} />
                  {row.name}
                </span>
                <i style={{ width: `${Math.max(4, row.share * 100)}%` }} aria-hidden />
                <b>{percent(row.share)}</b>
                <small>{row.cities === 0 ? "idle" : `${count(row.rps)}/s, ${Math.round(row.avgMs)} ms`}</small>
              </li>
            ))}
          </ul>
          <h4>Clients</h4>
        </div>
        <ul className="globe-cities" data-testid="company-globe-cities">
          {rows.slice(0, 8).map((row) => (
            <li key={row.city} data-city={row.city} title={`Served from ${CITIES[row.pop]?.name ?? row.pop}`}>
              <span>
                <CityFlag country={row.country} />
                {row.name}
                {row.pop === row.city ? <em className="globe-local" aria-label="server in this city" /> : null}
              </span>
              <i style={{ width: `${Math.max(6, row.share * 100)}%` }} aria-hidden />
              <b>{`${Math.round(row.share * 100)}%`}</b>
              <small>{`${row.ms} ms`}</small>
            </li>
          ))}
        </ul>
        <div className="globe-fleet" data-testid="company-fleet">
          <h4>Fleet</h4>
          {fleet.length === 0 ? <p>No serving gear yet. One laptop serves {count(company.capacity)} requests a second.</p> : null}
          <ul>
            {fleet.map((row) => (
              <li key={row.id}>
                <span>{row.name}</span>
                <b>{`× ${row.count}`}</b>
                <small>{`${count(row.rps)} req/s`}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
})
