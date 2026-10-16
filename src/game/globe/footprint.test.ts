import { describe, expect, it } from "vitest"
import { CITIES } from "../../data/geo.ts"
import { HOME_CITY, REGIONS, regionOfCity } from "../../data/regions.ts"
import { activePops, canBuyRegion, canDeployPop, canSetPop, canSetRegion, FRESH_FOOTPRINT, idlePops, nearestPop, parseFootprint, popIsOn, setPop, setRegion } from "./footprint.ts"

describe("regions", () => {
  it("every city on the map sits in exactly one region", () => {
    const cities = REGIONS.flatMap((row) => row.cities)
    expect(new Set(cities).size).toBe(cities.length)
    expect(cities.sort()).toEqual(Object.keys(CITIES).sort())
  })

  it("the home region is free and has its PoP", () => {
    expect(FRESH_FOOTPRINT.regions).toEqual(["americas-east"])
    expect(FRESH_FOOTPRINT.pops).toEqual([HOME_CITY])
    expect(REGIONS[0]!.price).toBe(0)
  })
})

describe("nearest point of presence", () => {
  it("a client is served from the PoP nearest it", () => {
    expect(nearestPop("london", ["ashburn", "frankfurt"])).toBe("frankfurt")
    expect(nearestPop("sydney", ["ashburn", "tokyo"])).toBe("tokyo")
    expect(nearestPop("nyc", ["ashburn"])).toBe("ashburn")
  })
})

describe("buying and deploying", () => {
  const fp = FRESH_FOOTPRINT
  it("a region needs its price in money, and is bought once", () => {
    expect(canBuyRegion(fp, "europe", 499_999, 500_000)).toBe(false)
    expect(canBuyRegion(fp, "europe", 500_000, 500_000)).toBe(true)
    expect(canBuyRegion({ ...fp, regions: ["americas-east", "europe"] }, "europe", 1e9, 500_000)).toBe(false)
  })

  it("a PoP can only go in a city of a region you own", () => {
    expect(canDeployPop(fp, "nyc", 1e9, 1)).toBe(true)
    expect(canDeployPop(fp, "london", 1e9, 1)).toBe(false)
    expect(canDeployPop({ ...fp, regions: ["americas-east", "europe"] }, "london", 1e9, 1)).toBe(true)
    expect(regionOfCity("london")?.id).toBe("europe")
  })
})

describe("saved footprint", () => {
  it("drops unknown regions and cities, and always keeps home", () => {
    expect(parseFootprint({ regions: ["europe", "mars"], pops: ["london", "atlantis"] })).toEqual({
      regions: ["americas-east", "europe"],
      pops: ["ashburn", "london"],
      off: [],
      dark: [],
    })
    expect(parseFootprint({ regions: ["europe"], pops: ["london"], off: ["london", "paris", 3], dark: ["europe", "mars"] })).toMatchObject({ off: ["london"], dark: ["europe"] })
    expect(parseFootprint({ regions: "x", pops: [] })).toBeUndefined()
  })
})

describe("switching servers and regions off", () => {
  const fp = { regions: ["americas-east", "europe"], pops: ["ashburn", "nyc", "london", "frankfurt"], off: [], dark: [] }

  it("a server switched off stops serving, and its clients go to the nearest one still on", () => {
    const off = setPop(fp, "frankfurt", false)
    expect(popIsOn(off, "frankfurt")).toBe(false)
    expect(activePops(off)).toEqual(["ashburn", "nyc", "london"])
    expect(idlePops(off)).toEqual(["frankfurt"])
    expect(nearestPop("berlin", activePops(fp))).toBe("frankfurt")
    expect(nearestPop("berlin", activePops(off))).toBe("london")
    expect(activePops(setPop(off, "frankfurt", true))).toEqual(fp.pops)
  })

  it("a region switched off takes all its servers with it, and keeps their own switches", () => {
    const dark = setRegion(setPop(fp, "london", false), "europe", false)
    expect(activePops(dark)).toEqual(["ashburn", "nyc"])
    expect(nearestPop("berlin", activePops(dark))).toBe("nyc")
    const back = setRegion(dark, "europe", true)
    expect(activePops(back)).toEqual(["ashburn", "nyc", "frankfurt"])
  })

  it("the last server and the last region serving cannot be switched off", () => {
    const one = { ...FRESH_FOOTPRINT }
    expect(canSetPop(one, "ashburn", false)).toBe(false)
    expect(canSetRegion(one, "americas-east", false)).toBe(false)
    expect(canSetPop(fp, "ashburn", false)).toBe(true)
    expect(canSetRegion(fp, "europe", false)).toBe(true)
    const eu = setRegion(fp, "americas-east", false)
    expect(canSetRegion(eu, "europe", false)).toBe(false)
    expect(canSetPop(eu, "london", false)).toBe(true)
    expect(canSetPop(fp, "tokyo", false)).toBe(false)
    expect(canSetPop(fp, "ashburn", true)).toBe(false)
  })
})
