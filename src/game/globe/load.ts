import { GEAR } from "../../data/gear.ts"
import type { GearKind } from "../../data/gear.ts"
import { REGIONS } from "../../data/regions.ts"
import { multiplierOf } from "./world.ts"
import type { Incident } from "./world.ts"

/** Requests a second one laptop serves before any gear is bought. */
export const BASE_RPS = 30

/** Requests a second each user sends: one every ten seconds. Seven billion users send 700 million a second. */
export const RPS_PER_USER = 0.1

/** Gear kinds that serve requests. Each copy serves `cps × RPS_PER_CPS` requests a second. */
export const SERVING_KINDS: readonly GearKind[] = ["cloud", "gpu", "rack", "orbit", "mars"]
export const RPS_PER_CPS = 12

/** Requests a second the company can serve with what it owns. */
export function capacityOf(equipment: Readonly<Record<string, number>>): number {
  const serving = GEAR.filter((item) => SERVING_KINDS.includes(item.kind))
  return serving.reduce((rps, item) => rps + (equipment[String(item.id)] ?? 0) * item.cps * RPS_PER_CPS, BASE_RPS)
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
  return { demand, capacity, dropShare, lostPerSec: demand * dropShare * REVENUE_PER_DROPPED_RPS, health }
}
