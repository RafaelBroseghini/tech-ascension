import { describe as suite, expect, it } from "vitest"
import { LOCAL_AUDIENCE } from "../../data/geo.ts"
import { burstOf } from "./wave.ts"
import { cityRows, describe, dropShares, tallyByCity } from "./tip.ts"

const rows = cityRows(LOCAL_AUDIENCE, 600, ["ashburn"])

suite("globe tooltip", () => {
  it("lists the biggest city first with its trip and its share of the traffic", () => {
    expect(rows[0]).toMatchObject({ city: "nyc", name: "New York", share: 0.3, rps: 180 })
    expect(rows[0].ms).toBeGreaterThan(10)
  })

  it("a second region shortens the trip for the users nearest it", () => {
    const far = cityRows([{ city: "berlin", share: 1 }], 100, ["ashburn"])[0]
    const near = cityRows([{ city: "berlin", share: 1 }], 100, ["ashburn", "frankfurt"])[0]
    expect(near.ms).toBeLessThan(far.ms)
  })

  it("an edge and a dot name the city, and an edge names where it goes", () => {
    expect(describe({ kind: "city", city: "nyc" }, rows, null, "Virginia")?.title).toBe("New York")
    expect(describe({ kind: "edge", city: "nyc" }, rows, null, "Virginia")?.title).toBe("New York to Virginia")
    expect(describe({ kind: "edge", city: "nyc" }, rows, null, "Virginia")?.lines.at(-1)).toBe("No traffic run yet.")
    expect(describe({ kind: "city", city: "tokyo" }, rows, null, "Virginia")).toBeNull()
  })

  it("a server's tip says what it serves, and a city with a server in it says so", () => {
    const pops = ["ashburn", "frankfurt"]
    const eu = cityRows([{ city: "berlin", share: 0.5 }, { city: "frankfurt", share: 0.5 }], 100, pops)
    expect(eu.map((r) => r.pop)).toEqual(["frankfurt", "frankfurt"])
    const tip = describe({ kind: "pop", city: "frankfurt" }, eu, null, "Virginia")
    expect(tip?.title).toBe("Frankfurt, point of presence")
    expect(tip?.country).toBe("DE")
    expect(tip?.lines[0]).toBe("Serves 2 cities, 100% of traffic.")
    expect(describe({ kind: "home", city: "ashburn" }, eu, null, "Virginia")?.lines[0]).toBe("No clients are routed here yet.")
    expect(describe({ kind: "edge", city: "berlin" }, eu, null, "Virginia")?.title).toBe("Berlin to Frankfurt")
    expect(describe({ kind: "city", city: "frankfurt" }, eu, null, "Virginia")?.lines[1]).toBe("10 ms: the server is in this city.")
  })

  it("after a burst it counts every request sent, and no city turns red when nothing was dropped", () => {
    const wave = burstOf(LOCAL_AUDIENCE, 600)
    const tally = tallyByCity(wave)
    expect([...tally.values()].reduce((n, t) => n + t.sent, 0)).toBe(wave.phases.flatMap((p) => p.units).length)
    expect(dropShares(tally).size).toBe(0)
  })
})
