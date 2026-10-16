import { GEAR } from "../../data/gear.ts"
import type { GearKind } from "../../data/gear.ts"

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
