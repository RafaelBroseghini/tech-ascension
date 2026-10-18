import { describe, expect, it } from "vitest"
import { CITIES } from "../../data/geo.ts"
import { FLAG_URLS } from "./flags.ts"

describe("city flags", () => {
  it("every country a city is in has a flag", () => {
    for (const city of Object.values(CITIES)) expect(FLAG_URLS[city.country], city.id).toBeTruthy()
  })
})
