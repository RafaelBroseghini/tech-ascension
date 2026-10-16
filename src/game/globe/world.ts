import { CITIES, CLIENT_CITIES, distanceKm, networkMs } from "../../data/geo.ts"
import { HOME_REGION_ID, REGIONS, regionById, regionOfCity } from "../../data/regions.ts"
import { activePops, nearestPop } from "./footprint.ts"
import type { Footprint } from "./footprint.ts"

/** Users the company needs to win. Past it the game keeps going. */
export const WORLD_TARGET = 7_000_000_000

/** People in each region, in millions. They sum to about 8 billion, so the target takes most of the world. */
const POPULATION_M: Readonly<Record<string, number>> = {
  "americas-east": 330,
  "americas-west": 350,
  "south-america": 440,
  europe: 750,
  africa: 1400,
  asia: 4750,
  oceania: 45,
}

/** The share of a region's people the app can reach: the rest have no phone, no line, or no wish to sign up. */
export const REACH_CEILING = 0.93

export const populationOf = (regionId: string): number => (POPULATION_M[regionId] ?? 0) * 1_000_000
export const ceilingOf = (regionId: string): number => populationOf(regionId) * REACH_CEILING

/** People in the world the regions cover. */
export const WORLD_POPULATION: number = REGIONS.reduce((sum, region) => sum + populationOf(region.id), 0)

export const WORLD_CEILING: number = REGIONS.reduce((sum, region) => sum + ceilingOf(region.id), 0)

/** Users a cleared gig seeds in its client's region. */
export const SEED_PER_GIG = 40
/** Share of all users that spill over into every region, by its population, through travel and word of mouth. */
export const SPILL = 0.0004
/** Growth a second, per unit of reach, at full health. */
export const GROWTH_PER_SEC = 0.006

/** Growth in a region the company has not bought: the app is reachable, just badly. */
const UNBOUGHT_REACH = 0.15
/** Points of presence a region needs for full coverage (or all its cities, if fewer). */
const FULL_COVERAGE_POPS = 3

export const MILESTONES: readonly { readonly id: string; readonly users: number; readonly label: string }[] = [
  { id: "1m", users: 1_000_000, label: "One million users" },
  { id: "100m", users: 100_000_000, label: "One hundred million users" },
  { id: "1b", users: 1_000_000_000, label: "One billion users" },
  { id: "won", users: WORLD_TARGET, label: "Seven billion users" },
]

/** The permanent multiplier on everything the company earns, once it has the world. */
export const WIN_MULT = 1.25

export type IncidentKind = "ddos" | "block" | "law" | "rival"

export const INCIDENT_KINDS: readonly IncidentKind[] = ["ddos", "block", "law", "rival"]

/** One thing the world has thrown at a region. It runs until `until`, or until the player pays to end it. */
export interface Incident {
  readonly id: number
  readonly kind: IncidentKind
  readonly region: string
  /** Epoch ms it ends on its own. */
  readonly until: number
  /** How hard it bites: ddos multiplies the region's traffic by it, a block and a law bleed users by it, a rival drags growth by it. */
  readonly strength: number
}

export const INCIDENT_LABEL: Readonly<Record<IncidentKind, { name: string; line: (region: string) => string }>> = {
  ddos: { name: "DDoS surge", line: (region) => `Botnets are hammering ${region}. Traffic there has multiplied.` },
  block: { name: "Censorship block", line: (region) => `${region} has blocked the app. Users there stall and drift away.` },
  law: { name: "Data-residency law", line: (region) => `${region} demands a local point of presence. Without one the app is cut off.` },
  rival: { name: "Rival app", line: (region) => `A local rival is eating ${region}'s signups.` },
}

/** The most incidents live at once. */
export const MAX_INCIDENTS = 3
/** Users the company needs before the world pays it any attention. */
export const INCIDENT_MIN_USERS = 1000
const BASE_INCIDENT_EVERY_S = 420
/** Seconds the resistance meter takes to close most of the gap to its target. */
export const RESISTANCE_LAG_S = 120
/** Resistance a paid-off incident takes with it. */
export const RELIEF = 3
const INCIDENT_BASE_MS = 4 * 60_000

/** Resistance the world settles at for a given number of users: slow at first, then it climbs as the company nears the target. */
export function resistanceTarget(total: number): number {
  return 100 * Math.min(1, Math.max(0, total) / WORLD_TARGET) ** 0.6
}

/** Chance a second that the world throws something new at the company. */
export const incidentRate = (resistance: number): number => (0.4 + (1.6 * resistance) / 100) / BASE_INCIDENT_EVERY_S

export const totalUsers = (users: Readonly<Record<string, number>>): number => Object.values(users).reduce((sum, n) => sum + n, 0)

/** The region a cleared gig's client sits in. Gig ids walk the client cities in order. */
export function gigRegion(gigId: number): string {
  const city = CLIENT_CITIES[(Math.max(1, gigId) - 1) % CLIENT_CITIES.length]!
  return regionOfCity(city)?.id ?? HOME_REGION_ID
}

/** Users each region is seeded with by the clients signed there. */
export function seedsOf(gigs: readonly number[]): Record<string, number> {
  const seeds: Record<string, number> = {}
  for (const id of gigs) {
    const region = gigRegion(id)
    seeds[region] = (seeds[region] ?? 0) + SEED_PER_GIG
  }
  return seeds
}

/** How well the company can reach each region: owning it, how many live points of presence it has, and how near the nearest one is. */
export function reachOf(fp: Footprint): Record<string, number> {
  const live = activePops(fp)
  const reach: Record<string, number> = {}
  for (const region of REGIONS) {
    const bought = fp.regions.includes(region.id)
    const here = live.filter((city) => region.cities.includes(city)).length
    const coverage = Math.min(1, here / Math.min(FULL_COVERAGE_POPS, region.cities.length))
    let ms = 0
    for (const city of region.cities) {
      const from = CITIES[city]
      const pop = CITIES[nearestPop(city, live)]
      if (from && pop) ms += networkMs(distanceKm(from, pop))
    }
    ms /= region.cities.length
    const latency = 1 / (1 + Math.max(0, ms - 40) / 160)
    reach[region.id] = (bought ? 1 : UNBOUGHT_REACH) * (0.4 + 0.6 * coverage) * latency
  }
  return reach
}

/** Regions with a point of presence serving traffic. */
export function liveRegions(fp: Footprint): Record<string, boolean> {
  const live = activePops(fp)
  return Object.fromEntries(REGIONS.map((region) => [region.id, live.some((city) => region.cities.includes(city))]))
}

/** Incidents on a region that stall it. A law only bites a region without a live point of presence. */
export function stalls(incidents: readonly Incident[], region: string, hasPop: boolean): boolean {
  return incidents.some((i) => i.region === region && (i.kind === "block" || (i.kind === "law" && !hasPop)))
}

/** Traffic multiplier from DDoS surges in a region. */
export function surgeOf(incidents: readonly Incident[], region: string): number {
  return incidents.filter((i) => i.kind === "ddos" && i.region === region).reduce((mult, i) => mult * i.strength, 1)
}

/** What ending an incident costs: minutes of what the company earns, and never less than 1% of the balance or a floor. */
export function incidentCost(incident: Incident, perSec: number, money: number): number {
  const minutes = incident.kind === "ddos" || incident.kind === "rival" ? 2 : 3
  return Math.max(100, perSec * 60 * minutes, money * 0.01)
}

/** Incident kinds in the order a roll in [0, 1) picks them, with their weights. */
const PICK: readonly [IncidentKind, number][] = [
  ["ddos", 0.35],
  ["block", 0.2],
  ["law", 0.2],
  ["rival", 0.25],
]

/** A new incident for a roll, or null when the roll finds nothing to hit. `rand` draws the region and the kind. */
export function rollIncident(
  users: Readonly<Record<string, number>>,
  live: Readonly<Record<string, boolean>>,
  resistance: number,
  id: number,
  at: number,
  rand: () => number,
): Incident | null {
  const total = totalUsers(users)
  if (total <= 0) return null
  let pick = rand() * total
  let region = REGIONS[0]!.id
  for (const row of REGIONS) {
    pick -= users[row.id] ?? 0
    region = row.id
    if (pick <= 0) break
  }
  let roll = rand()
  let kind: IncidentKind = "ddos"
  for (const [k, weight] of PICK) {
    kind = k
    roll -= weight
    if (roll <= 0) break
  }
  // A law has nothing to say to a region that already hosts a server.
  if (kind === "law" && live[region]) kind = "block"
  return makeIncident(kind, region, resistance, id, at)
}

/** An incident of a kind on a region. The hotter the world, the harder it bites and the longer it lasts. */
export function makeIncident(kind: IncidentKind, region: string, resistance: number, id: number, at: number): Incident {
  const heat = resistance / 100
  const strength = kind === "ddos" ? 2 + 3 * heat : kind === "rival" ? 0.5 : 1 + heat
  return { id, kind, region, until: at + INCIDENT_BASE_MS * (1 + heat), strength }
}

export function regionName(regionId: string): string {
  return regionById(regionId)?.name ?? regionId
}
