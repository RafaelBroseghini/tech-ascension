import { describe, expect, it } from "vitest"
import { CLIENT_CITIES } from "../../data/geo.ts"
import { GEAR } from "../../data/gear.ts"
import { REGIONS } from "../../data/regions.ts"
import { FRESH_FOOTPRINT } from "./footprint.ts"
import { capacityOf, demandOf, SERVING_KINDS } from "./load.ts"
import {
  gigRegion,
  incidentCost,
  makeIncident,
  populationOf,
  reachOf,
  resistanceTarget,
  rollIncident,
  SEED_PER_GIG,
  seedsOf,
  stalls,
  surgeOf,
  WORLD_CEILING,
  WORLD_POPULATION,
  WORLD_TARGET,
} from "./world.ts"

const serving = GEAR.filter((item) => SERVING_KINDS.includes(item.kind))
const copies = (n: number, only: (item: (typeof serving)[number]) => boolean = () => true) => Object.fromEntries(serving.filter(only).map((item) => [String(item.id), n]))

describe("the calibration", () => {
  it("the target is within the world's reach, and the regions add up to about eight billion", () => {
    expect(WORLD_CEILING).toBeGreaterThan(WORLD_TARGET * 1.02)
    expect(WORLD_POPULATION).toBeGreaterThan(7.8e9)
    expect(WORLD_POPULATION).toBeLessThan(8.3e9)
  })

  it("early gear cannot serve a billion users, and does serve a hundred thousand", () => {
    const early = copies(1, (item) => item.baseCost <= 1_000_000)
    expect(capacityOf(early)).toBeLessThan(demandOf(1e9))
    expect(capacityOf(early)).toBeGreaterThan(demandOf(1e5))
  })

  it("a handful of every serving row serves seven billion, so the win can be reached", () => {
    expect(capacityOf(copies(5))).toBeGreaterThan(demandOf(WORLD_TARGET))
  })

  it("one of every serving row does not", () => {
    expect(capacityOf(copies(1))).toBeLessThan(demandOf(WORLD_TARGET))
  })
})

describe("seeds and reach", () => {
  it("a cleared gig seeds the region its client sits in", () => {
    expect(gigRegion(1)).toBe("americas-east")
    expect(CLIENT_CITIES[2]).toBe("london")
    expect(gigRegion(3)).toBe("europe")
    const seeds = seedsOf([1, 2, 3])
    expect(Object.values(seeds).reduce((n, v) => n + v, 0)).toBe(3 * SEED_PER_GIG)
    expect(seeds["europe"]).toBe(SEED_PER_GIG)
  })

  it("the home region reaches best at the start, and a bought region with servers beats an unbought one", () => {
    const start = reachOf(FRESH_FOOTPRINT)
    expect(start["americas-east"]!).toBeGreaterThan(start["europe"]!)
    const spread = reachOf({ regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt", "london", "paris"], off: [], dark: [] })
    expect(spread["europe"]!).toBeGreaterThan(start["europe"]! * 3)
  })

  it("a server switched off stops reaching its region", () => {
    const on = reachOf({ regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: [], dark: [] })
    const off = reachOf({ regions: ["americas-east", "europe"], pops: ["ashburn", "frankfurt"], off: ["frankfurt"], dark: [] })
    expect(off["europe"]!).toBeLessThan(on["europe"]!)
  })

  it("every region has people", () => {
    for (const region of REGIONS) expect(populationOf(region.id)).toBeGreaterThan(0)
  })
})

describe("resistance and incidents", () => {
  it("resistance is none for nobody and full at the target", () => {
    expect(resistanceTarget(0)).toBe(0)
    expect(resistanceTarget(WORLD_TARGET)).toBe(100)
    expect(resistanceTarget(WORLD_TARGET * 2)).toBe(100)
    expect(resistanceTarget(1e9)).toBeGreaterThan(resistanceTarget(1e8))
  })

  it("an incident bites harder and lasts longer in a hotter world", () => {
    const cool = makeIncident("ddos", "asia", 0, 1, 0)
    const hot = makeIncident("ddos", "asia", 100, 2, 0)
    expect(hot.strength).toBeGreaterThan(cool.strength)
    expect(hot.until).toBeGreaterThan(cool.until)
  })

  it("rolls the region by where the users are, and a law gives way to a server already there", () => {
    const draws = (...n: number[]) => () => n.shift() ?? 0
    const users = { europe: 100, asia: 900 }
    expect(rollIncident(users, {}, 0, 1, 0, draws(0.05, 0))?.region).toBe("europe")
    expect(rollIncident(users, {}, 0, 1, 0, draws(0.5, 0))?.region).toBe("asia")
    expect(rollIncident(users, {}, 0, 1, 0, draws(0.5, 0.6))?.kind).toBe("law")
    expect(rollIncident(users, { asia: true }, 0, 1, 0, draws(0.5, 0.6))?.kind).toBe("block")
    expect(rollIncident({}, {}, 0, 1, 0, () => 0)).toBeNull()
  })

  it("only a block, or a law with no server, stalls a region, and only a surge raises traffic", () => {
    const block = makeIncident("block", "europe", 0, 1, 0)
    const law = makeIncident("law", "europe", 0, 2, 0)
    expect(stalls([block], "europe", true)).toBe(true)
    expect(stalls([law], "europe", true)).toBe(false)
    expect(stalls([law], "europe", false)).toBe(true)
    expect(stalls([block], "asia", false)).toBe(false)
    expect(surgeOf([block], "europe")).toBe(1)
    expect(surgeOf([makeIncident("ddos", "europe", 0, 3, 0)], "europe")).toBeGreaterThan(1)
  })

  it("ending an incident costs minutes of income, with a floor and 1% of the balance", () => {
    const rival = makeIncident("rival", "asia", 0, 1, 0)
    const block = makeIncident("block", "asia", 0, 2, 0)
    expect(incidentCost(rival, 10, 0)).toBe(1200)
    expect(incidentCost(block, 10, 0)).toBe(1800)
    expect(incidentCost(rival, 0, 0)).toBe(100)
    expect(incidentCost(rival, 0, 1e6)).toBe(1e4)
  })
})
