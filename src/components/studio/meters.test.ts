import { describe, expect, it } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { evaluate } from "../../game/studio/evaluate.ts"
import { faultTally } from "../../game/studio/score.ts"
import { meters, readout, requestCounts } from "./meters.ts"

const interview = (id: string) => INTERVIEWS.find((row) => row.id === id)!
const SHORTENER = interview("url-shortener")
const THREE_TIER = interview("3-tier-app")

describe("requestCounts", () => {
  it("sums rps x seconds, counting a spike at its multiple, and answers each phase at its own success rate", () => {
    const result = evaluate(SHORTENER.reference, SHORTENER.scenario)
    const { total, running } = requestCounts(SHORTENER.scenario, result)
    expect(total.sent).toBe(2000 * 60 + 6000 * 30)
    expect(total.peakRps).toBe(6000)
    expect(total.seconds).toBe(90)
    expect(total.answered).toBeCloseTo(2000 * 60 * result.phases[0].successRate + 6000 * 30 * result.phases[1].successRate, 6)
    expect(running).toHaveLength(2)
    expect(running[0]).toMatchObject({ sent: 120_000, peakRps: 2000, seconds: 60 })
    expect(running[1]).toEqual(total)
  })

  it("a board that answers nothing fails every request", () => {
    const result = evaluate({ nodes: [{ id: "users", kind: "users", replicas: 1 }], edges: [] }, THREE_TIER.scenario)
    const { total } = requestCounts(THREE_TIER.scenario, result)
    expect(total.sent).toBe(600 * 120)
    expect(total.answered).toBe(0)
  })
})

describe("readout", () => {
  const result = evaluate(THREE_TIER.naive[0].design, THREE_TIER.scenario)
  const { total } = requestCounts(THREE_TIER.scenario, result)

  it("names the busiest node and the single points of failure by their component names", () => {
    const lines = readout(THREE_TIER.naive[0].design, result, total)
    expect(lines.map((line) => line.key)).toEqual(["requests", "answered", "hottest", "singlePoints"])
    expect(lines[0].text).toBe("72,000 requests over 120 s, peak 600 rps")
    // Its only API server is the one the fault kills, so the busiest node is down while traffic still arrives.
    expect(lines[2].text).toBe("Busiest: Hamster Wheel API, down and still getting traffic")
    expect(lines[3].text).toBe("Single points of failure: Hamster Wheel API, PostgreSloth")
  })

  it("reads load as a share of capacity for a board that holds", () => {
    const held = evaluate(THREE_TIER.reference, THREE_TIER.scenario)
    const lines = readout(THREE_TIER.reference, held, requestCounts(THREE_TIER.scenario, held).total)
    expect(lines.find((line) => line.key === "hottest")?.text).toMatch(/^Busiest: .+, \d+% busy$/)
  })

  it("holds back the node lines while a reveal still plays", () => {
    expect(readout(THREE_TIER.naive[0].design, result, total, false).map((line) => line.key)).toEqual(["requests", "answered"])
  })
})

describe("meters", () => {
  it("builds the four constraints with their targets", () => {
    const result = evaluate(THREE_TIER.reference, THREE_TIER.scenario)
    const built = meters(result, THREE_TIER.targets, faultTally(result, THREE_TIER.targets))
    expect(built.map((meter) => meter.name)).toEqual(["Money", "Performance", "Availability", "Fault tolerance"])
    expect(built[0].target).toBe("budget $800")
    expect(built[3].value).toBe("1 of 1 faults survived")
  })
})
