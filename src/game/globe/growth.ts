import { REGIONS, regionById } from "../../data/regions.ts"
import { FRESH_FOOTPRINT } from "./footprint.ts"
import type { Footprint } from "./footprint.ts"
import { capacityOf, demandOf, dropShareOf } from "./load.ts"
import {
  ceilingOf,
  GROWTH_PER_SEC,
  incidentRate,
  INCIDENT_KINDS,
  INCIDENT_MIN_USERS,
  liveRegions,
  MAX_INCIDENTS,
  MILESTONES,
  populationOf,
  reachOf,
  RESISTANCE_LAG_S,
  resistanceTarget,
  rollIncident,
  seedsOf,
  SPILL,
  stalls,
  surgeOf,
  totalUsers,
  WORLD_POPULATION,
} from "./world.ts"
import type { Incident } from "./world.ts"

/** A status day is one minute on the clock, so the bars fill as you play. Each one is a column on the status page. */
export const STATUS_DAY_MS = 60_000

/** How many days the status page keeps. */
export const STATUS_DAYS = 90

/** Dollars a second lost for each request a second the company drops. */
export const REVENUE_PER_DROPPED_RPS = 0.02

/** Lost to drops, per second and per unit of drop share. */
const DROP_CHURN_PER_SEC = 0.01
/** Users a block or a law bleeds a second, per unit of its strength. A server in the region halves it. */
const BLEED_PER_SEC = 0.002

/** Clients an offline stretch is walked in, so a long away still steps the model. */
export const STEP_MS = 60_000

export const HEALTH_CHAR = { operational: "o", degraded: "d", partial: "p", major: "m" } as const
export type HealthChar = (typeof HEALTH_CHAR)[keyof typeof HEALTH_CHAR]
const SEVERITY = "odpm"

/** The company's reach: users in each region, the world's resistance, what it has thrown, and one status character per day. */
export interface CompanyState {
  /** Users by region id. A region with nobody is left out. */
  readonly users: Readonly<Record<string, number>>
  /** How hard the world pushes back, 0 to 100. */
  readonly resistance: number
  readonly incidents: readonly Incident[]
  /** Incidents thrown so far, so ids never repeat. */
  readonly incidentSeq: number
  /** Latched once the company reaches `WORLD_TARGET` users. */
  readonly won: boolean
  /** One character per status day, oldest first: o operational, d degraded, p partial outage, m major outage. */
  readonly uptime: string
  /** The status day the last character belongs to, or -1 before the first step. */
  readonly day: number
}

export const FRESH_COMPANY: CompanyState = { users: {}, resistance: 0, incidents: [], incidentSeq: 0, won: false, uptime: "", day: -1 }

export interface GrowthNote {
  readonly type: "incident" | "world"
  readonly ref: string
  readonly data?: Record<string, number | string>
}

export interface GrowthFacts {
  /** Users each region is seeded with by the clients signed there. */
  readonly seeds: Readonly<Record<string, number>>
  /** How well the footprint reaches each region. */
  readonly reach: Readonly<Record<string, number>>
  /** Regions with a point of presence serving traffic. */
  readonly live: Readonly<Record<string, boolean>>
  readonly equipment: Readonly<Record<string, number>>
}

export interface GrowthStep {
  readonly state: CompanyState
  /** Dollars the drops cost over this step. */
  readonly lost: number
  readonly notes: readonly GrowthNote[]
}

/** Serving is judged on how much of the demand it drops; above 80% of capacity it is only slow. */
export function servingHealth(dropShare: number, demand: number, capacity: number): HealthChar {
  if (dropShare > 0.5) return HEALTH_CHAR.major
  if (dropShare > 0) return HEALTH_CHAR.partial
  if (capacity > 0 && demand / capacity > 0.8) return HEALTH_CHAR.degraded
  return HEALTH_CHAR.operational
}

/** The requests a second the users of a company send, with every DDoS surge counted. */
export function demandAt(users: Readonly<Record<string, number>>, incidents: readonly Incident[]): number {
  return REGIONS.reduce((sum, region) => sum + demandOf(users[region.id] ?? 0) * surgeOf(incidents, region.id), 0)
}

/**
 * Advances the company over `ms` (a short step, at most `STEP_MS`). `at` is when the step ends. `rand` is in [0, 1)
 * and drives what the world throws, so a test can pin it.
 */
export function stepCompany(state: CompanyState, facts: GrowthFacts, ms: number, at: number, rand: () => number): GrowthStep {
  const sec = Math.max(0, ms) / 1000
  const notes: GrowthNote[] = []
  const before = totalUsers(state.users)
  let incidents = state.incidents.filter((i) => i.until > at)
  let seq = state.incidentSeq

  const capacity = capacityOf(facts.equipment)
  const demand = demandAt(state.users, incidents)
  const dropShare = dropShareOf(demand, capacity)
  const served = 1 - dropShare

  const resistance = state.resistance + (resistanceTarget(before) - state.resistance) * (1 - Math.exp(-sec / RESISTANCE_LAG_S))
  const drag = 1 - (0.5 * resistance) / 100

  const users: Record<string, number> = {}
  for (const region of REGIONS) {
    const here = state.users[region.id] ?? 0
    const ceiling = ceilingOf(region.id)
    const stalled = stalls(incidents, region.id, facts.live[region.id] === true)
    const rival = incidents.filter((i) => i.kind === "rival" && i.region === region.id).reduce((mult, i) => mult * i.strength, 1)
    const seed = (facts.seeds[region.id] ?? 0) + SPILL * before * (populationOf(region.id) / WORLD_POPULATION)
    const growth = stalled ? 0 : GROWTH_PER_SEC * (facts.reach[region.id] ?? 0) * Math.max(here, seed) * Math.max(0, 1 - here / ceiling) * served * drag * rival
    const bleed = incidents
      .filter((i) => (i.kind === "block" || i.kind === "law") && i.region === region.id && stalled)
      .reduce((rate, i) => rate + BLEED_PER_SEC * i.strength * (facts.live[region.id] ? 0.5 : 1) * (1 + resistance / 100), 0)
    const churn = Math.min(0.9, (DROP_CHURN_PER_SEC * dropShare + bleed) * sec)
    const next = Math.min(ceiling, Math.max(0, (here + growth * sec) * (1 - churn)))
    if (next >= 0.5) users[region.id] = next
  }
  const total = totalUsers(users)
  const lost = demand * dropShare * REVENUE_PER_DROPPED_RPS * sec

  if (incidents.length < MAX_INCIDENTS && total >= INCIDENT_MIN_USERS && rand() < incidentRate(resistance) * sec) {
    const incident = rollIncident(users, facts.live, resistance, seq + 1, at, rand)
    if (incident) {
      seq += 1
      incidents = [...incidents, incident]
      notes.push({ type: "incident", ref: `incident:${incident.kind}`, data: { region: incident.region, id: incident.id } })
    }
  }

  let won = state.won
  for (const row of MILESTONES) {
    if (before < row.users && total >= row.users) {
      notes.push({ type: "world", ref: `world:${row.id}`, data: { users: Math.round(total) } })
      if (row.id === "won") won = true
    }
  }

  const nowDemand = demandAt(users, incidents)
  const nowDrop = dropShareOf(nowDemand, capacity)
  const health = total > 0 ? servingHealth(nowDrop, nowDemand, capacity) : HEALTH_CHAR.operational
  const { uptime, day } = recordDay(state, health, at)
  return { state: { users, resistance, incidents, incidentSeq: seq, won, uptime, day }, lost, notes }
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
export function growthFacts(gigs: readonly number[], equipment: Readonly<Record<string, number>>, footprint: Footprint = FRESH_FOOTPRINT): GrowthFacts {
  return { seeds: seedsOf(gigs), reach: reachOf(footprint), live: liveRegions(footprint), equipment }
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

/** A saved company, checked: anything malformed is dropped, so a bad block never breaks a load. A block from before users and regions is dropped whole. */
export function parseCompany(input: unknown): CompanyState | undefined {
  if (typeof input !== "object" || input === null) return undefined
  const raw = input as Record<string, unknown>
  if (typeof raw.users !== "object" || raw.users === null || Array.isArray(raw.users)) return undefined
  const users: Record<string, number> = {}
  for (const region of REGIONS) {
    const n = (raw.users as Record<string, unknown>)[region.id]
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) users[region.id] = Math.min(n, ceilingOf(region.id))
  }
  const resistance = typeof raw.resistance === "number" && Number.isFinite(raw.resistance) ? Math.max(0, Math.min(100, raw.resistance)) : undefined
  const incidentSeq = typeof raw.incidentSeq === "number" && Number.isInteger(raw.incidentSeq) && raw.incidentSeq >= 0 ? raw.incidentSeq : undefined
  const uptime = typeof raw.uptime === "string" && /^[odpm]*$/.test(raw.uptime) ? raw.uptime.slice(-STATUS_DAYS) : undefined
  const day = typeof raw.day === "number" && Number.isInteger(raw.day) && raw.day >= -1 ? raw.day : undefined
  if (resistance === undefined || incidentSeq === undefined || uptime === undefined || day === undefined) return undefined
  const incidents = Array.isArray(raw.incidents) ? raw.incidents.flatMap(parseIncident) : []
  return { users, resistance, incidents, incidentSeq, won: raw.won === true, uptime, day }
}

function parseIncident(input: unknown): Incident[] {
  if (typeof input !== "object" || input === null) return []
  const raw = input as Record<string, unknown>
  const kind = INCIDENT_KINDS.find((k) => k === raw.kind)
  if (!kind || typeof raw.region !== "string" || !regionById(raw.region)) return []
  if (typeof raw.id !== "number" || !Number.isInteger(raw.id) || typeof raw.until !== "number" || !Number.isFinite(raw.until) || typeof raw.strength !== "number" || !Number.isFinite(raw.strength)) return []
  return [{ id: raw.id, kind, region: raw.region, until: raw.until, strength: Math.max(0, Math.min(10, raw.strength)) }]
}
