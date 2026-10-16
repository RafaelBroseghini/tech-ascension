import { GEAR } from "../../data/gear.ts"
import type { GearKind } from "../../data/gear.ts"

/** Requests a second one laptop serves before any gear is bought. */
export const BASE_RPS = 30

/** Requests a second each client sends before the app is popular. */
export const RPS_PER_CLIENT = 10

/** Gear kinds that serve requests. Each copy serves `cps × RPS_PER_CPS` requests a second. */
export const SERVING_KINDS: readonly GearKind[] = ["cloud", "gpu", "rack", "orbit", "mars"]
export const RPS_PER_CPS = 12

/** Requests a second the company can serve with what it owns. */
export function capacityOf(equipment: Readonly<Record<string, number>>): number {
  const serving = GEAR.filter((item) => SERVING_KINDS.includes(item.kind))
  return serving.reduce((rps, item) => rps + (equipment[String(item.id)] ?? 0) * item.cps * RPS_PER_CPS, BASE_RPS)
}

/** How many times its base load a client sends at a popularity of 0 to 100: about 1× at the start, 30× at 50, three million × at 100. */
export function popularityLoad(popularity: number): number {
  const p = Math.max(0, Math.min(100, popularity)) / 100
  return (1 + p * 2) * 10 ** (6 * p * p)
}

/** Requests a second the clients send: their base load, times how popular the app is. A fully popular app with a client in every city sends billions. */
export function demandOf(clients: number, popularity: number): number {
  return clients * RPS_PER_CLIENT * popularityLoad(popularity)
}

/** The share of demand that capacity cannot serve, from 0 (all served) up to 1. */
export function dropShareOf(demand: number, capacity: number): number {
  if (demand <= 0 || demand <= capacity) return 0
  return 1 - capacity / demand
}
