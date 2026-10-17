import { describe, expect, it } from "vitest"
import { CITIES, HOME } from "../../data/geo.ts"
import { bezier, controlOf, landingOf, NEAR_ANGLE, onSphere, RING_ANGLE, seedOf } from "./arc.ts"

/** How close the arc comes to the surface between its ends, sampled along its middle. The ends sit on the surface by design. */
const lowest = (from: string, to: { lat: number; lon: number }) => {
  const a = onSphere(CITIES[from]!.lat, CITIES[from]!.lon)
  const b = onSphere(to.lat, to.lon)
  const c = controlOf(a, b)
  let min = Infinity
  for (let i = 10; i <= 90; i++) min = Math.min(min, bezier(a, c, b, i / 100).length())
  return min
}

describe("the arcs between cities", () => {
  it("clear the ball for every city, including Sydney to Virginia, which are nearly antipodal", () => {
    for (const id of Object.keys(CITIES)) {
      if (id !== HOME.id) expect(lowest(id, HOME), id).toBeGreaterThan(1.01)
      if (id !== "frankfurt") expect(lowest(id, CITIES.frankfurt!), id).toBeGreaterThan(1.01)
    }
  })

  it("the arc from Sydney to Virginia is a long way off the ball, not through it", () => {
    expect(lowest("sydney", HOME)).toBeGreaterThan(1.02)
  })
})

describe("an edge into a server in the client's own city", () => {
  const server = onSphere(HOME.lat, HOME.lon, 1.004)
  const at = (id: string) => onSphere(CITIES[id]!.lat, CITIES[id]!.lon, 1.004)

  it("lands on the ring round the server, not on it, so it can be drawn as an arc", () => {
    const end = landingOf(server, server, seedOf("ashburn"))
    expect(end.angleTo(server)).toBeCloseTo(RING_ANGLE, 5)
    expect(end.length()).toBeCloseTo(server.length(), 5)
  })

  it("does the same for a city a short way off, and a far city still ends on the server", () => {
    const near = at("nyc")
    expect(near.angleTo(server)).toBeLessThan(NEAR_ANGLE)
    expect(landingOf(near, server, seedOf("nyc")).distanceTo(near)).toBeGreaterThan(0.06)
    expect(landingOf(at("london"), server, seedOf("london")).equals(server)).toBe(true)
  })

  it("is steady: the same city always bends the same way, and cities differ", () => {
    expect(seedOf("ashburn")).toBe(seedOf("ashburn"))
    expect(seedOf("ashburn")).not.toBe(seedOf("nyc"))
  })

  it("rises as high as it is long, instead of a needle", () => {
    const end = landingOf(server, server, 0.3)
    const c = controlOf(server, end)
    const top = Math.max(...Array.from({ length: 91 }, (_, i) => bezier(server, c, end, i / 90).length()))
    expect(top - 1.004).toBeLessThan(end.distanceTo(server) * 1.2)
    expect(top).toBeGreaterThan(1.045)
  })
})
