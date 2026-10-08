import { describe, expect, it } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { leafPaths } from "./diagram.ts"
import { dotsAt, FAST_TRAVEL_MS, laneOf, SLOW_TRAVEL_MS, stillDots, travelMs } from "./traffic.ts"

/** The Users at x = 0, then three edges of 100 px each. */
const lane = (dots: number) =>
  laneOf(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 300, y: 0 },
    ],
    dots,
  )

describe("dotsAt", () => {
  it("the first frame shows one dot, at The Users", () => {
    const dots = dotsAt(lane(4), 0, FAST_TRAVEL_MS, false)
    expect(dots).toHaveLength(1)
    expect(dots[0].at).toEqual({ x: 0, y: 0 })
  })

  it("spawns the rest one gap apart, each behind the one before it", () => {
    const travel = 600
    const dots = dotsAt(lane(4), 400, travel, false)
    // gap = 150 ms: dots 0, 1 and 2 have left; dot 3 spawns at 450 ms.
    expect(dots.map((dot) => dot.at.x)).toEqual([200, 125, 50])
    expect(dots.map((dot) => dot.at.x)).toEqual([...dots.map((dot) => dot.at.x)].sort((a, b) => b - a))
  })

  it("deeper points are reached later, and a dot that arrives starts over at The Users", () => {
    const reach = (x: number) => {
      for (let ms = 0; ms <= FAST_TRAVEL_MS; ms++) if ((dotsAt(lane(1), ms, FAST_TRAVEL_MS, false)[0]?.at.x ?? 0) >= x) return ms
      return Infinity
    }
    expect(reach(100)).toBeLessThan(reach(200))
    expect(reach(200)).toBeLessThan(reach(299))
    expect(dotsAt(lane(1), FAST_TRAVEL_MS + 30, FAST_TRAVEL_MS, false)[0].at.x).toBeCloseTo(15, 5)
  })

  it("a dot that never arrives stalls halfway and fades", () => {
    const mid = dotsAt(lane(1), SLOW_TRAVEL_MS * 0.8, SLOW_TRAVEL_MS, true)[0]
    expect(mid.at.x).toBeCloseTo(150, 5)
    expect(mid.alpha).toBeCloseTo(0.5, 5)
    for (let ms = 0; ms < SLOW_TRAVEL_MS; ms += 25) expect(dotsAt(lane(1), ms, SLOW_TRAVEL_MS, true)[0].at.x).toBeLessThanOrEqual(150)
  })

  it("under reduced motion the dots sit evenly along the lane", () => {
    expect(stillDots(lane(3)).map((dot) => dot.at.x)).toEqual([50, 150, 250])
  })
})

describe("dying dots", () => {
  const dying = (share: number) => laneOf(lane(1).points, 8, { at: 1 / 3, share })

  it("a share of the dots stop at the node that drops them and fade there", () => {
    const stopped = dotsAt(dying(0.5), 5000, 600, false).filter((dot) => dot.dead)
    expect(stopped).toHaveLength(4)
    for (const dot of stopped) expect(dot.at.x).toBeLessThanOrEqual(100 + 1e-9)
    expect(dotsAt(dying(0), 5000, 600, false).some((dot) => dot.dead)).toBe(false)
  })

  it("the dead dots are spread through the stream, not bunched at its head", () => {
    const flags = Array.from({ length: 8 }, (_, k) => dotsAt(dying(0.5), 600 + k * 75 + 1, 600, false).length > 0)
    expect(flags.every(Boolean)).toBe(true)
    const marks = stillDots(dying(0.5)).map((dot) => dot.dead)
    expect(marks).toEqual([false, true, false, true, false, true, false, true])
  })
})

describe("travelMs", () => {
  it("is fast at or under the target and slow at 3x or worse, in a line between", () => {
    expect(travelMs(30, 60)).toBe(FAST_TRAVEL_MS)
    expect(travelMs(60, 60)).toBe(FAST_TRAVEL_MS)
    expect(travelMs(120, 60)).toBe((FAST_TRAVEL_MS + SLOW_TRAVEL_MS) / 2)
    expect(travelMs(180, 60)).toBe(SLOW_TRAVEL_MS)
    expect(travelMs(900, 60)).toBe(SLOW_TRAVEL_MS)
    expect(travelMs(Infinity, 60)).toBe(SLOW_TRAVEL_MS)
  })

  it("a board 3x over the target covers the same path at the same moment less far than one under it", () => {
    const at = (p95: number) => dotsAt(lane(1), 300, travelMs(p95, 60), false)[0].at.x
    expect(at(60)).toBeGreaterThan(at(180))
  })
})

describe("leafPaths", () => {
  const shortener = INTERVIEWS.find((row) => row.id === "url-shortener")!

  it("starts every path at The Users, and its shares add up to the traffic", () => {
    const paths = leafPaths(shortener.reference, shortener.scenario)
    expect(paths.length).toBeGreaterThan(1)
    for (const path of paths) expect(path.nodes[0]).toBe("users")
    expect(paths.reduce((sum, path) => sum + path.share, 0)).toBeCloseTo(1, 6)
  })

  it("says where requests die: at the piece with nowhere to send them, and at one that is over capacity", () => {
    const unrouted = leafPaths(INTERVIEWS[0].naive[0].design, INTERVIEWS[0].scenario)
    expect(unrouted.every((path) => path.dies?.share === 1)).toBe(true)
    expect(unrouted.every((path) => path.dies?.at === path.nodes.length - 1)).toBe(true)
    const noCache = leafPaths(shortener.naive[0].design, shortener.scenario)
    const overloaded = noCache.filter((path) => path.dies)
    expect(overloaded.length).toBeGreaterThan(0)
    expect(overloaded.every((path) => path.nodes[path.dies!.at] === "db")).toBe(true)
    expect(leafPaths(shortener.reference, shortener.scenario).every((path) => path.dies === null)).toBe(true)
  })

  it("merges leaves that walk the same nodes", () => {
    const paths = leafPaths(shortener.reference, shortener.scenario)
    expect(new Set(paths.map((path) => path.nodes.join(">"))).size).toBe(paths.length)
  })
})
