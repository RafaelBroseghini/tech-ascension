import { CLIENT_CITIES } from "../../data/geo.ts"
import type { Company } from "./company.ts"
import { HEALTH_CHAR, STATUS_DAY_MS, uptimePercent } from "./growth.ts"
import type { HealthChar } from "./growth.ts"

/** The four states a real status page uses. */
export type Health = "operational" | "degraded" | "partial" | "major"

export const HEALTH_OF: Readonly<Record<HealthChar, Health>> = { o: "operational", d: "degraded", p: "partial", m: "major" }

export const HEALTH_LABEL: Readonly<Record<Health, string>> = {
  operational: "Operational",
  degraded: "Degraded Performance",
  partial: "Partial Outage",
  major: "Major Outage",
}

const WORST_FIRST: readonly Health[] = ["major", "partial", "degraded", "operational"]

export interface Component {
  readonly id: string
  readonly name: string
  readonly health: Health
  /** One character per status day, oldest first, for the bars. */
  readonly bars: string
  readonly uptime: number
  readonly detail: string
}

export interface IncidentUpdate {
  readonly state: "Investigating" | "Identified" | "Monitoring"
  readonly text: string
}

export interface Incident {
  readonly title: string
  readonly updates: readonly IncidentUpdate[]
}

export interface PastIncident {
  /** How many status days ago it started, so the page can say when without a calendar. */
  readonly daysAgo: number
  readonly health: Health
  readonly duration: string
}

export interface Board {
  readonly banner: string
  readonly health: Health
  readonly components: readonly Component[]
  /** Open while anything is off, null while everything runs. */
  readonly incident: Incident | null
  readonly past: readonly PastIncident[]
  /** How many days of bars the page has, so it can draw the empty ones. */
  readonly days: number
  readonly popularity: number
}

export interface StatusFacts {
  readonly company: Company
  /** Retainer gigs cleared, and what they pay a second in total. */
  readonly retainers: { readonly count: number; readonly perSec: number }
  /** The company's uptime bars, one character per day. */
  readonly uptime: string
  /** How a dollar amount reads on the board. */
  readonly money: (n: number) => string
  /** Dollars a second the drops are costing right now. */
  readonly lostPerSec: number
}

const ROUND = (n: number) => Math.round(n).toLocaleString("en-US")

export function statusOf(facts: StatusFacts): Board {
  const { company, retainers, money, uptime } = facts
  const clients = company.clients
  const serving = HEALTH_OF[company.health]
  const flat = HEALTH_CHAR.operational.repeat(uptime.length)
  const popularity = Math.round(company.popularity)
  const lost = facts.lostPerSec > 0 ? ` Dropped requests cost ${money(facts.lostPerSec)} a second.` : ""

  const components: Component[] = [
    {
      id: "intake",
      name: "Client intake",
      health: "operational",
      bars: flat,
      uptime: uptimePercent(flat),
      detail: clients > 0 ? `${clients} of ${CLIENT_CITIES.length} client cities signed` : "Open for signups. No clients yet.",
    },
    {
      id: "serving",
      name: "Request serving",
      health: serving,
      bars: uptime,
      uptime: uptimePercent(uptime),
      detail:
        clients > 0
          ? `${ROUND(company.demand)} requests a second asked, ${ROUND(company.capacity)} provisioned. Popularity ${popularity}/100.${lost}`
          : `${ROUND(company.capacity)} requests a second provisioned.`,
    },
    {
      id: "retainers",
      name: "Retainers",
      health: "operational",
      bars: flat,
      uptime: uptimePercent(flat),
      detail: retainers.count > 0 ? `${retainers.count} on retainer, ${money(retainers.perSec)} a second` : "No retainers yet. Keep a client for the long haul.",
    },
    {
      id: "regions",
      name: "Regions",
      health: "operational",
      bars: flat,
      uptime: uptimePercent(flat),
      detail: `${company.pops.length} point${company.pops.length === 1 ? "" : "s"} of presence in ${company.regions.length} region${company.regions.length === 1 ? "" : "s"}`,
    },
  ]

  const health = WORST_FIRST.find((h) => components.some((c) => c.health === h)) ?? "operational"
  const incident = serving === "operational" ? null : incidentOf(serving, company)
  return {
    banner: health === "operational" ? "All Systems Operational" : HEALTH_LABEL[health],
    health,
    components,
    incident,
    past: pastIncidents(uptime),
    days: uptime.length,
    popularity,
  }
}

function incidentOf(serving: Health, company: Company): Incident {
  const dropped = Math.round(company.dropShare * 100)
  const ratio = company.capacity > 0 ? company.demand / company.capacity : 0
  const updates: IncidentUpdate[] = [{ state: "Investigating", text: "Request volume is above what the serving tier was provisioned for." }]
  if (dropped > 0) {
    updates.push({ state: "Identified", text: `Demand is ${ratio.toFixed(1)}× capacity. ${dropped}% of requests are being dropped.` })
    updates.push({ state: "Monitoring", text: "Buying serving capacity in the Gear tab resolves this." })
  } else {
    updates.push({ state: "Identified", text: `Demand is ${Math.round(ratio * 100)}% of capacity. Queues are growing.` })
    updates.push({ state: "Monitoring", text: "Latency is elevated. No requests are being dropped." })
  }
  const title = serving === "degraded" ? "Elevated latency on request serving" : "Requests failing on request serving"
  return { title, updates }
}

/** Each run of bad days on the bars, newest first, with its worst state and how long it lasted. */
export function pastIncidents(uptime: string): PastIncident[] {
  const out: PastIncident[] = []
  let i = uptime.length - 1
  while (i >= 0 && out.length < 5) {
    if (uptime[i] === HEALTH_CHAR.operational) {
      i--
      continue
    }
    let worst = uptime[i]!
    let start = i
    while (start > 0 && uptime[start - 1] !== HEALTH_CHAR.operational) {
      start--
      if ("odpm".indexOf(uptime[start]!) > "odpm".indexOf(worst)) worst = uptime[start]!
    }
    const days = i - start + 1
    out.push({
      daysAgo: uptime.length - 1 - i,
      health: HEALTH_OF[worst as HealthChar],
      duration: `${Math.round((days * STATUS_DAY_MS) / 60_000)} min on the clock`,
    })
    i = start - 1
  }
  return out
}
