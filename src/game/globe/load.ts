import { GEAR } from "../../data/gear.ts"
import type { GearKind } from "../../data/gear.ts"
import { REGIONS } from "../../data/regions.ts"
import { multiplierOf, totalUsers } from "./world.ts"
import type { Incident } from "./world.ts"

/** Requests a second one laptop serves before any gear is bought. */
export const BASE_RPS = 10

/** Requests a second each user sends: one every ten seconds. Eight billion users send 800 million a second. */
export const RPS_PER_USER = 0.1

/** Gear kinds that serve requests. Each copy serves `cps × RPS_PER_CPS` requests a second. */
export const SERVING_KINDS: readonly GearKind[] = ["cloud", "gpu", "rack", "orbit", "mars"]
export const RPS_PER_CPS = 12

/** Whether a gear row serves requests: the Cloud, GPU, Rack, Orbit and Mars sections. Desk, home lab and storage do not. */
export const isServingKind = (kind: GearKind): boolean => SERVING_KINDS.includes(kind)

/** Requests a second one copy of a gear row serves. 0 for gear that does not serve. */
export const servedRpsOf = (item: { readonly kind: GearKind; readonly cps: number }): number => (isServingKind(item.kind) ? item.cps * RPS_PER_CPS : 0)

/** Users one copy of a gear row keeps served: its requests a second over what each user sends. */
export const servedUsersOf = (item: { readonly kind: GearKind; readonly cps: number }): number => servedRpsOf(item) / RPS_PER_USER

/** The gear that serves, with the key it is held under and what one copy serves; the game asks for the capacity every tick. */
const SERVING_ROWS = GEAR.flatMap((item) => (servedRpsOf(item) > 0 ? [{ key: String(item.id), rps: servedRpsOf(item) }] : []))

/** Requests a second the company can serve with what it owns. */
export function capacityOf(equipment: Readonly<Record<string, number>>): number {
  let rps = BASE_RPS
  for (const row of SERVING_ROWS) rps += (equipment[row.key] ?? 0) * row.rps
  return rps
}

/** Requests a second the users send. A DDoS surge multiplies a region's share, so callers pass the surged total. */
export function demandOf(users: number): number {
  return Math.max(0, users) * RPS_PER_USER
}

/** The share of demand that capacity cannot serve, from 0 (all served) up to 1. */
export function dropShareOf(demand: number, capacity: number): number {
  if (demand <= 0 || demand <= capacity) return 0
  return 1 - capacity / demand
}

/** Dollars a second lost for each request a second the company drops. */
export const REVENUE_PER_DROPPED_RPS = 0.02

/** Dollars a second each served user pays at the scale of a big crowd. */
export const ARPU_BASE = 0.0002
/** How many times `ARPU_BASE` the first users pay, so a small crowd is worth a salary. It fades as the crowd grows. */
export const ARPU_EARLY = 80
/** Users at which the early bonus has halved. */
export const ARPU_KNEE = 1000

/** Dollars a second each served user pays when the product has this many users. Falls with scale: a thousand users pay an internship, a million a Senior SWE. */
export function arpuOf(users: number): number {
  return ARPU_BASE * (1 + ARPU_EARLY / (1 + Math.max(0, users) / ARPU_KNEE))
}

/** How serving went, one character per status day: operational, degraded, partial outage, major outage. */
export const HEALTH_CHAR = { operational: "o", degraded: "d", partial: "p", major: "m" } as const
export type HealthChar = (typeof HEALTH_CHAR)[keyof typeof HEALTH_CHAR]

/** How the company's serving stands: what the users ask, what the gear serves, what it drops and what that costs. */
export interface Serving {
  /** Requests a second the users send, with every DDoS surge counted. */
  readonly demand: number
  /** Requests a second the owned gear can serve. */
  readonly capacity: number
  /** The share of demand over capacity, which the company cannot serve. 0 when it keeps up. */
  readonly dropShare: number
  /** Dollars a second the dropped requests cost. */
  readonly lostPerSec: number
  /** Dollars a second the users who are served pay. Dropped users pay nothing. */
  readonly revenuePerSec: number
  /** Judged on the share dropped; above 80% of capacity it is only slow. Operational with nobody to serve. */
  readonly health: HealthChar
}

export function servingOf(users: Readonly<Record<string, number>>, incidents: readonly Incident[], equipment: Readonly<Record<string, number>>): Serving {
  const demand = REGIONS.reduce((sum, region) => sum + demandOf(users[region.id] ?? 0) * multiplierOf(incidents, region.id, "surge"), 0)
  const capacity = capacityOf(equipment)
  const dropShare = dropShareOf(demand, capacity)
  const health =
    demand <= 0 ? HEALTH_CHAR.operational
    : dropShare > 0.5 ? HEALTH_CHAR.major
    : dropShare > 0 ? HEALTH_CHAR.partial
    : capacity > 0 && demand / capacity > 0.8 ? HEALTH_CHAR.degraded
    : HEALTH_CHAR.operational
  const everyone = totalUsers(users)
  const revenuePerSec = everyone * (1 - dropShare) * arpuOf(everyone)
  return { demand, capacity, dropShare, lostPerSec: demand * dropShare * REVENUE_PER_DROPPED_RPS, revenuePerSec, health }
}
