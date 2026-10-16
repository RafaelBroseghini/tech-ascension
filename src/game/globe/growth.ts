import { CLIENT_CITIES } from "../../data/geo.ts"
import { capacityOf, demandOf, dropShareOf } from "./load.ts"

/** Popularity runs from 0 to this. */
export const POP_MAX = 100

/** A status day is one minute on the clock, so the bars fill as you play. Each one is a column on the status page. */
export const STATUS_DAY_MS = 60_000

/** How many days the status page keeps. */
export const STATUS_DAYS = 90

/** Dollars a second lost for each request a second the company drops. */
export const REVENUE_PER_DROPPED_RPS = 0.02

/** Popularity the company keeps growing with: the share served, the clients, and time. */
const GROWTH_PER_SEC = 0.04
const DRAG_PER_CLIENT = 0.1
/** Lost to drops and to slow decay, both per second. */
const DROP_DRAG_PER_SEC = 0.15
const IDLE_DECAY_PER_SEC = 0.005
const EMPTY_DECAY_PER_SEC = 0.02
/** A viral spike comes about once every this many milliseconds on average, while there are clients. */
const VIRAL_EVERY_MS = 8 * 60_000
const VIRAL_BUMP = 12

/** Clients an offline stretch is walked in, so a long away still steps the model. */
export const STEP_MS = 60_000

export const HEALTH_CHAR = { operational: "o", degraded: "d", partial: "p", major: "m" } as const
export type HealthChar = (typeof HEALTH_CHAR)[keyof typeof HEALTH_CHAR]
const SEVERITY = "odpm"

/** The company's growth: popularity, the clients it has signed by inbound lead, and one status character per day. */
export interface CompanyState {
  readonly popularity: number
  /** Inbound clients signed. Gig clients come on top of these. */
  readonly leads: number
  /** One character per status day, oldest first: o operational, d degraded, p partial outage, m major outage. */
  readonly uptime: string
  /** The status day the last character belongs to, or -1 before the first step. */
  readonly day: number
}

export const FRESH_COMPANY: CompanyState = { popularity: 0, leads: 0, uptime: "", day: -1 }

export interface GrowthNote {
  readonly type: "lead" | "buzz"
  readonly ref: string
  readonly data?: Record<string, number | string>
}

export interface GrowthFacts {
  readonly gigs: number
  readonly cap: number
  readonly equipment: Readonly<Record<string, number>>
  readonly cityAt: (index: number) => string
}

export interface GrowthStep {
  readonly state: CompanyState
  /** Dollars the drops cost over this step. */
  readonly lost: number
  readonly notes: readonly GrowthNote[]
}

export const leadThreshold = (clients: number): number => 2 + 1.5 * clients

/** Serving is judged on how much of the demand it drops; above 80% of capacity it is only slow. */
export function servingHealth(dropShare: number, demand: number, capacity: number): HealthChar {
  if (dropShare > 0.5) return HEALTH_CHAR.major
  if (dropShare > 0) return HEALTH_CHAR.partial
  if (capacity > 0 && demand / capacity > 0.8) return HEALTH_CHAR.degraded
  return HEALTH_CHAR.operational
}

/** Clients signed: the gig clients and the inbound leads, capped at the cities the company can reach. */
export const clientsOf = (facts: Pick<GrowthFacts, "gigs" | "cap">, leads: number): number => Math.min(facts.gigs + leads, facts.cap)

/**
 * Advances the company over `ms` (a short step, at most `STEP_MS`). `at` is when the step ends. `rand` is in [0, 1)
 * and drives the viral spikes, so a test can pin them.
 */
export function stepCompany(state: CompanyState, facts: GrowthFacts, ms: number, at: number, rand: () => number): GrowthStep {
  const sec = Math.max(0, ms) / 1000
  let popularity = state.popularity
  let leads = state.leads
  const notes: GrowthNote[] = []
  let lost = 0

  let clients = clientsOf(facts, leads)
  let demand = demandOf(clients, popularity)
  let capacity = capacityOf(facts.equipment)
  let dropShare = dropShareOf(demand, capacity)
  if (clients === 0) {
    popularity -= EMPTY_DECAY_PER_SEC * sec
  } else {
    const served = 1 - dropShare
    popularity += sec * (GROWTH_PER_SEC * served * (1 + DRAG_PER_CLIENT * clients) - DROP_DRAG_PER_SEC * dropShare - IDLE_DECAY_PER_SEC)
    if (rand() < ms / VIRAL_EVERY_MS) {
      popularity += VIRAL_BUMP
      notes.push({ type: "buzz", ref: "viral", data: { popularity: Math.round(popularity) } })
    }
  }
  popularity = Math.max(0, Math.min(POP_MAX, popularity))
  lost = demand * dropShare * REVENUE_PER_DROPPED_RPS * sec

  // Inbound leads land in the next city once popularity clears the bar for the clients already signed, and only when the
  // gear can serve the new client too. Out of capacity, the company stops signing until it buys more.
  for (let guard = 0; guard < 4 && clients < facts.cap && popularity >= leadThreshold(clients); guard++) {
    if (demandOf(clients + 1, popularity) > capacityOf(facts.equipment)) break
    const city = facts.cityAt(clients)
    leads += 1
    notes.push({ type: "lead", ref: `lead:${city}`, data: { clients: clients + 1 } })
    clients = clientsOf(facts, leads)
  }
  demand = demandOf(clients, popularity)
  capacity = capacityOf(facts.equipment)
  dropShare = dropShareOf(demand, capacity)

  const health = clients > 0 ? servingHealth(dropShare, demand, capacity) : HEALTH_CHAR.operational
  const { uptime, day } = recordDay(state, health, at)
  return { state: { popularity, leads, uptime, day }, lost, notes }
}

/** Writes this step's health into today's bar, opening a new bar for each day that has passed. */
function recordDay(state: CompanyState, health: HealthChar, at: number): { uptime: string; day: number } {
  const today = Math.floor(at / STATUS_DAY_MS)
  if (state.day < 0) return { uptime: health, day: today }
  let uptime = state.uptime
  if (today > state.day) uptime += HEALTH_CHAR.operational.repeat(Math.min(STATUS_DAYS, today - state.day - 1)) + HEALTH_CHAR.operational
  const last = uptime.slice(-1) || HEALTH_CHAR.operational
  const worst = SEVERITY[Math.max(SEVERITY.indexOf(last), SEVERITY.indexOf(health))]!
  return { uptime: (uptime.slice(0, -1) + worst).slice(-STATUS_DAYS), day: today }
}

/** The uptime of the bars recorded, as a percentage to two places. 100 with no history. */
export function uptimePercent(uptime: string): number {
  if (uptime.length === 0) return 100
  const up = [...uptime].filter((c) => c === HEALTH_CHAR.operational).length
  return Math.round((up / uptime.length) * 10000) / 100
}

/** The growth facts the game has right now, for `stepCompany`. */
export function growthFacts(gigs: readonly number[], equipment: Readonly<Record<string, number>>): GrowthFacts {
  return { gigs: gigs.length, cap: CLIENT_CITIES.length, equipment, cityAt: (i) => CLIENT_CITIES[i] ?? CLIENT_CITIES[0]! }
}

/**
 * Walks the company from `from` to `to` in steps of `STEP_MS`, so a long stretch away still plays out. Returns the
 * state at `to`, the dollars drops cost over the stretch, and every journal note it raised.
 */
export function advanceCompany(state: CompanyState, facts: GrowthFacts, from: number, to: number, rand: () => number): GrowthStep {
  let current = state
  let lost = 0
  const notes: GrowthNote[] = []
  for (let at = from; at < to; at += STEP_MS) {
    const end = Math.min(to, at + STEP_MS)
    const step = stepCompany(current, facts, end - at, end, rand)
    current = step.state
    lost += step.lost
    notes.push(...step.notes)
  }
  return { state: current, lost, notes }
}

/** A saved company, checked: anything malformed is dropped, so a bad block never breaks a load. */
export function parseCompany(input: unknown): CompanyState | undefined {
  if (typeof input !== "object" || input === null) return undefined
  const raw = input as Record<string, unknown>
  const popularity = typeof raw.popularity === "number" && Number.isFinite(raw.popularity) ? Math.max(0, Math.min(POP_MAX, raw.popularity)) : undefined
  const leads = typeof raw.leads === "number" && Number.isInteger(raw.leads) && raw.leads >= 0 ? raw.leads : undefined
  const uptime = typeof raw.uptime === "string" && /^[odpm]*$/.test(raw.uptime) ? raw.uptime.slice(-STATUS_DAYS) : undefined
  const day = typeof raw.day === "number" && Number.isInteger(raw.day) && raw.day >= -1 ? raw.day : undefined
  if (popularity === undefined || leads === undefined || uptime === undefined || day === undefined) return undefined
  return { popularity, leads, uptime, day }
}
