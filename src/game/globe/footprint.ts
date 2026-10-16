import { CITIES, distanceKm } from "../../data/geo.ts"
import { HOME_CITY, HOME_REGION_ID, regionById, regionOfCity } from "../../data/regions.ts"

/** The regions bought and the cities with a point of presence deployed, and which of them are switched off. */
export interface Footprint {
  readonly regions: readonly string[]
  readonly pops: readonly string[]
  /** Deployed cities switched off one by one: their traffic goes to the nearest server still on. */
  readonly off: readonly string[]
  /** Regions switched off whole, whatever their cities say. */
  readonly dark: readonly string[]
}

export const FRESH_FOOTPRINT: Footprint = { regions: [HOME_REGION_ID], pops: [HOME_CITY], off: [], dark: [] }

/** Whether the point of presence in `city` is serving: deployed, not switched off, and in a region that is not dark. */
export function popIsOn(fp: Footprint, city: string): boolean {
  const region = regionOfCity(city)
  return fp.pops.includes(city) && !fp.off.includes(city) && !(region && fp.dark.includes(region.id))
}

/** The deployed points of presence that serve traffic. Never empty: a footprint with everything off serves from all it has. */
export function activePops(fp: Footprint): string[] {
  const on = fp.pops.filter((city) => popIsOn(fp, city))
  return on.length > 0 ? on : [...fp.pops]
}

/** The deployed points of presence that are switched off. */
export function idlePops(fp: Footprint): string[] {
  const on = new Set(activePops(fp))
  return fp.pops.filter((city) => !on.has(city))
}

/** Whether a deployed city can be switched to `on`. The last server on cannot be switched off. */
export function canSetPop(fp: Footprint, city: string, on: boolean): boolean {
  if (!fp.pops.includes(city)) return false
  if (fp.off.includes(city) === !on) return false
  if (on) return true
  return activePops(fp).some((c) => c !== city)
}

export function setPop(fp: Footprint, city: string, on: boolean): Footprint {
  return { ...fp, off: on ? fp.off.filter((c) => c !== city) : [...fp.off, city] }
}

/** Whether a bought region can be switched to `on`. The last region serving cannot be switched off. */
export function canSetRegion(fp: Footprint, id: string, on: boolean): boolean {
  const region = regionById(id)
  if (!region || !fp.regions.includes(id)) return false
  if (fp.dark.includes(id) === !on) return false
  if (on) return true
  return activePops(fp).some((city) => !region.cities.includes(city))
}

export function setRegion(fp: Footprint, id: string, on: boolean): Footprint {
  return { ...fp, dark: on ? fp.dark.filter((r) => r !== id) : [...fp.dark, id] }
}

/** The point of presence a city's clients are served from: the nearest deployed one. */
export function nearestPop(city: string, pops: readonly string[]): string {
  const from = CITIES[city]
  if (!from || pops.length === 0) return HOME_CITY
  let best = pops[0]!
  let bestKm = Infinity
  for (const pop of pops) {
    const km = distanceKm(from, CITIES[pop]!)
    if (km < bestKm) {
      bestKm = km
      best = pop
    }
  }
  return best
}

export function canBuyRegion(fp: Footprint, id: string, money: number, price: number): boolean {
  return regionById(id) !== undefined && !fp.regions.includes(id) && money >= price
}

export function canDeployPop(fp: Footprint, city: string, money: number, cost: number): boolean {
  const region = regionOfCity(city)
  return region !== undefined && fp.regions.includes(region.id) && !fp.pops.includes(city) && money >= cost
}

/** A saved footprint, checked: anything that names an unknown region or city is dropped. */
export function parseFootprint(input: unknown): Footprint | undefined {
  if (typeof input !== "object" || input === null) return undefined
  const raw = input as Record<string, unknown>
  if (!Array.isArray(raw.regions) || !Array.isArray(raw.pops)) return undefined
  const regions = raw.regions.filter((id): id is string => typeof id === "string" && regionById(id) !== undefined)
  const pops = raw.pops.filter((city): city is string => typeof city === "string" && CITIES[city] !== undefined)
  if (!regions.includes(HOME_REGION_ID)) regions.unshift(HOME_REGION_ID)
  if (!pops.includes(HOME_CITY)) pops.unshift(HOME_CITY)
  const kept = new Set(pops)
  const off = Array.isArray(raw.off) ? raw.off.filter((city): city is string => typeof city === "string" && kept.has(city)) : []
  const dark = Array.isArray(raw.dark) ? raw.dark.filter((id): id is string => typeof id === "string" && regions.includes(id)) : []
  return { regions: [...new Set(regions)], pops: [...kept], off: [...new Set(off)], dark: [...new Set(dark)] }
}
