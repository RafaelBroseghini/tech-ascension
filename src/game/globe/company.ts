import { CLIENT_CITIES } from "../../data/geo.ts"
import type { AudienceShare } from "../../data/geo.ts"
import { REGIONS } from "../../data/regions.ts"
import { demandAt, servingHealth } from "./growth.ts"
import type { HealthChar } from "./growth.ts"
import { capacityOf, dropShareOf } from "./load.ts"
import { activePops, idlePops } from "./footprint.ts"
import type { Footprint } from "./footprint.ts"
import { totalUsers, WORLD_TARGET } from "./world.ts"
import type { Incident } from "./world.ts"

/** What the globe and the status page draw of the company. */
export interface Company {
  readonly audience: AudienceShare[]
  /** Users in all, and in each region. */
  readonly users: number
  readonly regionUsers: Readonly<Record<string, number>>
  /** Users as a share of the target, 0 to 1 and beyond once it is won. */
  readonly share: number
  readonly resistance: number
  readonly incidents: readonly Incident[]
  readonly won: boolean
  /** Requests a second the users send, with every DDoS surge counted. */
  readonly demand: number
  /** Requests a second the owned gear can serve. */
  readonly capacity: number
  /** The share of demand over capacity, which the company cannot serve. 0 when it keeps up. */
  readonly dropShare: number
  readonly health: HealthChar
  /** Cities with a point of presence serving traffic. */
  readonly pops: readonly string[]
  /** Cities with a point of presence deployed but switched off. */
  readonly idlePops: readonly string[]
  /** Regions bought. */
  readonly regions: readonly string[]
}

export interface CompanyFacts {
  readonly users: Readonly<Record<string, number>>
  readonly resistance: number
  readonly incidents: readonly Incident[]
  readonly won: boolean
  readonly footprint: Footprint
  /** Gear owned, by id. */
  readonly equipment: Readonly<Record<string, number>>
}

/** How many of a region's cities show on the globe for its users: one for the first few, then a few more with each tenfold. */
export function visibleCities(users: number, cities: number): number {
  if (users < 1) return 0
  return Math.min(cities, 1 + Math.floor(Math.log10(users) * 2.2))
}

const ORDER = new Map(CLIENT_CITIES.map((id, i) => [id, i]))

/** Where the users are, city by city: each region's users are spread over as many of its biggest cities as they fill. */
export function audienceOf(users: Readonly<Record<string, number>>): AudienceShare[] {
  const total = totalUsers(users)
  if (total <= 0) return []
  return REGIONS.flatMap((region) => {
    const here = users[region.id] ?? 0
    const shown = visibleCities(here, region.cities.length)
    if (shown === 0) return []
    const cities = [...region.cities].sort((a, b) => (ORDER.get(a) ?? 999) - (ORDER.get(b) ?? 999)).slice(0, shown)
    return cities.map((city) => ({ city, share: here / shown / total }))
  })
}

export function companyOf(facts: CompanyFacts): Company {
  const users = totalUsers(facts.users)
  const demand = demandAt(facts.users, facts.incidents)
  const capacity = capacityOf(facts.equipment)
  const dropShare = dropShareOf(demand, capacity)
  return {
    audience: audienceOf(facts.users),
    users,
    regionUsers: facts.users,
    share: users / WORLD_TARGET,
    resistance: facts.resistance,
    incidents: facts.incidents,
    won: facts.won,
    demand,
    capacity,
    dropShare,
    health: users > 0 ? servingHealth(dropShare, demand, capacity) : "o",
    pops: activePops(facts.footprint),
    idlePops: idlePops(facts.footprint),
    regions: facts.footprint.regions,
  }
}
