/**
 * Regions the company can buy with money, and the cities inside each. Buying a region opens its cities for points of
 * presence (PoPs): a deployed city serves the clients nearest it. The home region and its PoP at Ashburn come free.
 * `price` is unscaled; the export keeps it as dollars. A PoP costs a quarter of its region's price, at least `POP_FLOOR`.
 */
import { scalePurchaseCost } from "./costs.ts"

export type Region = {
  id: string
  name: string
  price: number
  cities: readonly string[]
}

export const HOME_REGION_ID = "americas-east"
export const HOME_CITY = "ashburn"

const REGION_ROWS: readonly Region[] = [
  { id: "americas-east", name: "Americas East", price: 0, cities: ["detroit", "charlotte", "pittsburgh", "tampa", "columbus", "quebeccity", "ashburn", "nyc", "boston", "atlanta", "toronto", "miami", "philadelphia", "montreal"] },
  { id: "americas-west", name: "Americas West", price: 300000, cities: ["kansascity", "sandiego", "austin", "nashville", "winnipeg", "guadalajara", "monterrey", "havana", "panama", "sanjose", "guatemalacity", "sf", "la", "seattle", "denver", "dallas", "chicago", "phoenix", "houston", "minneapolis", "saltlake", "portland", "vancouver", "calgary", "honolulu", "mexico"] },
  { id: "south-america", name: "South America", price: 400000, cities: ["medellin", "quito", "lapaz", "montevideo", "brasilia", "caracas", "saopaulo", "buenosaires", "bogota", "lima", "santiago", "rio"] },
  { id: "europe", name: "Europe", price: 500000, cities: ["manchester", "lisbon", "barcelona", "milan", "munich", "vienna", "prague", "budapest", "athens", "oslo", "helsinki", "kyiv", "copenhagen", "london", "paris", "berlin", "frankfurt", "madrid", "stockholm", "amsterdam", "dublin", "rome", "warsaw", "istanbul", "moscow"] },
  { id: "africa", name: "Africa", price: 900000, cities: ["capetown", "abuja", "kampala", "tunis", "lagos", "nairobi", "cairo", "johannesburg", "casablanca", "accra", "addisababa"] },
  { id: "asia", name: "Asia and the Middle East", price: 1500000, cities: ["doha", "tehran", "kathmandu", "hanoi", "kualalumpur", "taipei", "busan", "almaty", "dubai", "riyadh", "mumbai", "delhi", "karachi", "dhaka", "bangkok", "singapore", "jakarta", "manila", "hongkong", "shanghai", "seoul", "tokyo", "osaka"] },
  { id: "oceania", name: "Oceania", price: 700000, cities: ["perth", "wellington", "sydney", "auckland"] },
]

export const REGIONS: readonly Region[] = REGION_ROWS.map((row) => ({ ...row, price: scalePurchaseCost(row.price) }))

export const regionById = (id: string): Region | undefined => REGIONS.find((row) => row.id === id)

/** The region a city sits in. */
export function regionOfCity(city: string): Region | undefined {
  return REGIONS.find((row) => row.cities.includes(city))
}

/** What one point of presence costs: a quarter of its region's price, and never less than the floor, so the free home region still charges. */
export const POP_FLOOR = scalePurchaseCost(20000)
export const popCostOf = (region: Region): number => Math.max(POP_FLOOR, region.price / 4)
