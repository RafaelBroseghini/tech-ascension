import { popCostOf, regionById, regionOfCity } from "../../data/regions.ts"
import { canBuyRegion, canDeployPop, canSetPop, canSetRegion, setPop, setRegion } from "./footprint.ts"
import type { Footprint } from "./footprint.ts"
import type { CompanyState } from "./growth.ts"
import { fire as fireSome, hire as hireOne } from "./hires.ts"
import type { FounderState } from "./track.ts"
import { ceilingOf, INCIDENT_KINDS, incidentCost, makeIncident, MAX_INCIDENTS, RELIEF, totalUsers } from "./world.ts"
import type { IncidentKind } from "./world.ts"

/** The part of the game the company's actions read and write. */
export interface CompanySlice {
  readonly money: number
  readonly footprint: Footprint
  readonly company: CompanyState
  readonly founder: FounderState
}

/** What an action changes, or null when it is refused and nothing changes. */
export type CompanyPatch = Partial<CompanySlice> | null

export function buyRegion(s: CompanySlice, regionId: string): CompanyPatch {
  const region = regionById(regionId)
  if (!region || !canBuyRegion(s.footprint, regionId, s.money, region.price)) return null
  return { money: s.money - region.price, footprint: { ...s.footprint, regions: [...s.footprint.regions, regionId] } }
}

export function deployPop(s: CompanySlice, cityId: string): CompanyPatch {
  const region = regionOfCity(cityId)
  if (!region || !canDeployPop(s.footprint, cityId, s.money, popCostOf(region))) return null
  return { money: s.money - popCostOf(region), footprint: { ...s.footprint, pops: [...s.footprint.pops, cityId] } }
}

export function setPopActive(s: CompanySlice, cityId: string, on: boolean): CompanyPatch {
  return canSetPop(s.footprint, cityId, on) ? { footprint: setPop(s.footprint, cityId, on) } : null
}

export function setRegionActive(s: CompanySlice, regionId: string, on: boolean): CompanyPatch {
  return canSetRegion(s.footprint, regionId, on) ? { footprint: setRegion(s.footprint, regionId, on) } : null
}

/** Hires one of a kind on the ladder. Refused as a founder, in a closed row, or short of the price. */
export function hire(s: CompanySlice, id: string): CompanyPatch {
  return hireOne(s, id)
}

/** Lets go of one of a kind, on either track. Refused when nobody of that kind is on the payroll. */
export function fire(s: CompanySlice, id: string): CompanyPatch {
  return fireSome(s, id)
}

/** Pays to end an incident now, priced in minutes of `perSec`. Ending one also cools the world a little. */
export function respondIncident(s: CompanySlice, id: number, perSec: number): CompanyPatch {
  const incident = s.company.incidents.find((i) => i.id === id)
  if (!incident) return null
  const cost = incidentCost(incident, perSec, s.money)
  if (s.money < cost) return null
  return {
    money: s.money - cost,
    company: { ...s.company, incidents: s.company.incidents.filter((i) => i.id !== id), resistance: Math.max(0, s.company.resistance - RELIEF) },
  }
}

/** Opens an incident without waiting for a roll: on `regionId`, or else the region with the most users, or else the first one bought. */
export function forceIncident(s: CompanySlice, kind: IncidentKind, regionId: string | undefined, at: number): CompanyPatch {
  if (!INCIDENT_KINDS.includes(kind) || s.company.incidents.length >= MAX_INCIDENTS) return null
  const biggest = Object.entries(s.company.users).sort((a, b) => b[1] - a[1])[0]?.[0]
  const region = regionId ?? biggest ?? s.footprint.regions[0]
  if (!region || !regionById(region)) return null
  const incident = makeIncident(kind, region, s.company.resistance, s.company.incidentSeq + 1, at)
  return { company: { ...s.company, incidents: [...s.company.incidents, incident], incidentSeq: incident.id } }
}

/** Sets a region's users, to the region's ceiling at most. */
export function setRegionUsers(s: CompanySlice, regionId: string, users: number): CompanyPatch {
  if (!Number.isFinite(users) || users < 0 || ceilingOf(regionId) <= 0) return null
  const set = { ...s.company.users, [regionId]: Math.min(users, ceilingOf(regionId)) }
  // Users set by hand are nobody's work: the team keeps the share it had of the old crowd, and never more than the new one.
  const before = totalUsers(s.company.users)
  const after = totalUsers(set)
  const hiredUsers = before > 0 ? Math.min(after, s.company.hiredUsers * Math.min(1, after / before)) : 0
  return { company: { ...s.company, users: set, hiredUsers } }
}
