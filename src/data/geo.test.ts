import { describe, expect, it } from "vitest"
import { CITIES } from "./geo.ts"
import { REGIONS } from "./regions.ts"

describe("cities", () => {
  it("every city has a country code, so it has a flag", () => {
    for (const city of Object.values(CITIES)) expect(city.country, city.id).toMatch(/^[A-Z]{2}$/)
  })

  it("has the 50 new cities on top of the old ones, and no Tel Aviv", () => {
    expect(Object.keys(CITIES).length).toBeGreaterThanOrEqual(110)
    expect(CITIES.telaviv).toBeUndefined()
    expect(REGIONS.flatMap((row) => row.cities)).not.toContain("telaviv")
  })
})
