import { CLIENT_CITIES } from "../../data/geo.ts"
import type { AudienceShare } from "../../data/geo.ts"
import { clientsOf, servingHealth } from "./growth.ts"
import type { HealthChar } from "./growth.ts"
import { capacityOf, demandOf, dropShareOf } from "./load.ts"
import { activePops, idlePops } from "./footprint.ts"
import type { Footprint } from "./footprint.ts"

/** What the globe and the status page draw of the company. */
export interface Company {
  readonly audience: AudienceShare[]
  readonly clients: number
  readonly popularity: number
  /** Requests a second the clients send, popularity included. */
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
  /** Cleared gig ids, each one a signed client. */
  readonly gigs: readonly number[]
  /** Inbound clients signed. */
  readonly leads: number
  readonly popularity: number
  readonly footprint: Footprint
  /** Gear owned, by id. */
  readonly equipment: Readonly<Record<string, number>>
}

export function companyOf(facts: CompanyFacts): Company {
  const clients = clientsOf({ gigs: facts.gigs.length, cap: CLIENT_CITIES.length }, facts.leads)
  const audience = CLIENT_CITIES.slice(0, clients).map((city) => ({ city, share: 1 / clients }))
  const demand = demandOf(clients, facts.popularity)
  const capacity = capacityOf(facts.equipment)
  const dropShare = dropShareOf(demand, capacity)
  return {
    audience,
    clients,
    popularity: facts.popularity,
    demand,
    capacity,
    dropShare,
    health: clients > 0 ? servingHealth(dropShare, demand, capacity) : "o",
    pops: activePops(facts.footprint),
    idlePops: idlePops(facts.footprint),
    regions: facts.footprint.regions,
  }
}
