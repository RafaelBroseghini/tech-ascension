import { describe, expect, it } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { evaluate } from "../../game/studio/evaluate.ts"
import { faultTally } from "../../game/studio/score.ts"
import type { TargetName } from "../../game/studio/types.ts"
import { allTargets } from "../../data/studio/questions.ts"
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

  it("never prints a negative failed count from rounding error", () => {
    const lines = readout(THREE_TIER.reference, result, { sent: 12_000, answered: 12_000 + 1e-9, peakRps: 200, seconds: 60 })
    expect(lines[1].text).toBe("Answered 12,000, failed 0")
  })

  it("leaves the request lines out for a player who has not asked about the traffic", () => {
    expect(readout(THREE_TIER.naive[0].design, result, null).map((line) => line.key)).toEqual(["hottest", "singlePoints"])
  })

  it("holds back the node lines while a reveal still plays", () => {
    expect(readout(THREE_TIER.naive[0].design, result, total, false).map((line) => line.key)).toEqual(["requests", "answered"])
  })
})

describe("meters", () => {
  it("builds the five constraints with their targets", () => {
    const result = evaluate(THREE_TIER.reference, THREE_TIER.scenario)
    const built = meters(result, THREE_TIER.targets, faultTally(result, THREE_TIER.targets), allTargets(THREE_TIER))
    expect(built.map((meter) => meter.name)).toEqual(["Money", "Performance", "Availability", "Fault tolerance", "Correctness"])
    expect(built[4].value).toBe("3 of 3 features work")
    expect(built[4].target).toBe("every feature works")
    expect(built[0].target).toBe("budget $800")
    expect(built[3].value).toBe("1 of 1 faults survived")
  })

  describe("target lines", () => {
    const result = evaluate(THREE_TIER.reference, THREE_TIER.scenario)
    const tally = faultTally(result, THREE_TIER.targets)
    const build = (known: ReadonlySet<TargetName>) => meters(result, THREE_TIER.targets, tally, known)

    it("draws no target line or bar until the player asked about it, and keeps every number", () => {
      const built = build(new Set())
      expect(built.map((meter) => [meter.target, meter.fill])).toEqual([["", null], ["", null], ["", null], ["", null], ["", null]])
      expect(built.map((meter) => meter.value)).toEqual(build(allTargets(THREE_TIER)).map((meter) => meter.value))
    })

    it("each question draws only its own target", () => {
      expect(build(new Set<TargetName>(["budget"])).map((meter) => meter.target)).toEqual(["budget $800", "", "", "", ""])
      expect(build(new Set<TargetName>(["success", "p95"]))[1].target).toBe("99% within 80 ms")
      expect(build(new Set<TargetName>(["p95"]))[1].target).toBe("p95 within 80 ms")
      expect(build(new Set<TargetName>(["success", "p95", "lag"]))[1].target).toBe("99% within 80 ms, queue under 10 s")
      expect(build(new Set<TargetName>(["availability"]))[2].target).toBe("99% up")
      expect(build(new Set<TargetName>(["faults"]))[3].target).toBe("survive every fault")
    })

    it("a queue target shows only where the interview has a queue", () => {
      const hello = interview("hello-server")
      const upload = interview("image-upload")
      expect([...allTargets(hello)].sort()).toEqual(["availability", "budget", "faults", "features", "p95", "success"])
      expect(allTargets(upload).has("lag")).toBe(true)
      const done = evaluate(hello.reference, hello.scenario)
      expect(meters(done, hello.targets, faultTally(done, hello.targets), allTargets(hello))[1].target).toBe("99% within 100 ms")
    })

    it("a bar needs its target: the fault bar is full only once faults were asked about", () => {
      expect(build(new Set<TargetName>(["faults"]))[3].fill).toBe(1)
      expect(build(new Set<TargetName>(["budget"]))[3].fill).toBeNull()
    })
  })
})
