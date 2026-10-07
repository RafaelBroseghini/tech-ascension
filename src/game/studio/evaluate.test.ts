import { describe, expect, it } from "vitest"
import {
  BALANCED,
  BALANCED_FAILOVER,
  FANOUT,
  FANOUT_ONE_WORKER,
  FANOUT_QUEUED,
  SINGLE_BOX,
  THREE_TIER,
} from "../../data/studio/fixtures.ts"
import { evaluate } from "./evaluate.ts"
import type { ComponentKind, Design, Phase, Scenario } from "./types.ts"

const design = (nodes: [string, ComponentKind, number?][], edges: [string, string][]): Design => ({
  nodes: nodes.map(([id, kind, replicas = 1]) => ({ id, kind, replicas })),
  edges: edges.map(([from, to]) => ({ from, to })),
})

const scenario = (...phases: [Phase, ...Phase[]]): Scenario => ({ phases, cacheHitRate: 0.9, edgeHitRate: 0, fanout: 1 })

const READS_4000: Phase = { name: "reads", seconds: 60, rps: 4000, mix: { read: 1 } }

describe("evaluate", () => {
  it("a single SQL node at 4,000 reads per second is the hot node and fails success rate", () => {
    const result = evaluate(
      design([["users", "users"], ["lb", "lb"], ["api", "api", 20], ["db", "sql"]], [["users", "lb"], ["lb", "api"], ["api", "db"]]),
      scenario(READS_4000),
    )
    expect(result.hot[0]).toEqual({ id: "db", utilization: 4 })
    expect(result.successRate).toBeCloseTo(0.25)
  })

  it("a cache in front of SQL passes the same load", () => {
    const result = evaluate(
      design(
        [["users", "users"], ["lb", "lb"], ["api", "api", 20], ["cache", "cache"], ["db", "sql"]],
        [["users", "lb"], ["lb", "api"], ["api", "cache"], ["cache", "db"]],
      ),
      scenario(READS_4000),
    )
    expect(result.successRate).toBe(1)
    expect(result.hot.find((n) => n.id === "db")?.utilization).toBeCloseTo(0.4)
  })

  it("workers below the fan-out rate report queue lag", () => {
    const starved = evaluate(FANOUT_ONE_WORKER, FANOUT.scenario)
    expect(starved.lagSeconds).toBeCloseTo((400 / 300 - 1) * 60)
    expect(starved.hot[0].id).toBe("workers")
    expect(starved.successRate).toBe(1)
    expect(evaluate(FANOUT_QUEUED, FANOUT.scenario).lagSeconds).toBe(0)
  })

  it("a failed replica phase drops capacity", () => {
    const calm: Phase = { name: "calm", seconds: 60, rps: 800, mix: { read: 1 } }
    const result = evaluate(
      design([["users", "users"], ["lb", "lb"], ["api", "api", 2], ["db", "replica", 2]], [["users", "lb"], ["lb", "api"], ["api", "db"]]),
      scenario(calm, { ...calm, name: "reboot", fault: { kind: "killReplica", target: "api" } }),
    )
    expect(result.phases[0].successRate).toBe(1)
    expect(result.phases[1].hot[0]).toEqual({ id: "api", utilization: 1.6 })
    expect(result.phases[1].successRate).toBeCloseTo(1 / 1.6)
  })

  it("two API replicas without a load balancer have the uptime of one", () => {
    const one = evaluate(SINGLE_BOX, THREE_TIER.scenario)
    const two = evaluate(
      design([["users", "users"], ["api", "api", 2], ["db", "sql"]], [["users", "api"], ["api", "db"]]),
      THREE_TIER.scenario,
    )
    expect(two.availability).toBe(one.availability)
    expect(one.availability).toBeCloseTo(0.995 * 0.995)
    expect(evaluate(BALANCED, THREE_TIER.scenario).availability).toBeGreaterThan(one.availability)
  })

  it("a failover database survives killDatabase", () => {
    const killed = (d: Design) => evaluate(d, THREE_TIER.scenario).phases.find((p) => p.fault?.kind === "killDatabase")!
    expect(killed(BALANCED_FAILOVER).successRate).toBe(1)
    expect(killed(BALANCED).successRate).toBe(0)
    expect(killed(BALANCED).down).toEqual(["db"])
  })

  it("a single database is listed as a single point of failure", () => {
    expect(evaluate(BALANCED, THREE_TIER.scenario).singlePointsOfFailure).toContain("db")
    expect(evaluate(BALANCED_FAILOVER, THREE_TIER.scenario).singlePointsOfFailure).not.toContain("db")
    expect(evaluate(BALANCED, THREE_TIER.scenario).singlePointsOfFailure).not.toContain("api")
  })

  it("a node with zero replicas is down, not infinite capacity", () => {
    const result = evaluate(
      design([["users", "users"], ["api", "api", 0], ["db", "sql"]], [["users", "api"], ["api", "db"]]),
      THREE_TIER.scenario,
    )
    expect(result.successRate).toBe(0)
    expect(result.hot[0]).toEqual({ id: "api", utilization: Infinity })
    expect(result.phases[0].down).toEqual(["api"])
    expect(result.costPerMonth).toBe(200)
    expect(result.availability).toBe(0)
  })

  it("a cycle in the edges is named and the run still finishes", () => {
    const result = evaluate(
      design(
        [["users", "users"], ["lb", "lb"], ["api", "api", 2], ["db", "sql"]],
        [["users", "lb"], ["lb", "api"], ["api", "lb"], ["api", "db"]],
      ),
      THREE_TIER.scenario,
    )
    expect(result.cycles).toEqual([["lb", "api", "lb"]])
    expect(result.phases[0].successRate).toBe(1)
  })

  it("availability rises with redundancy, and so does the bill", () => {
    const runs = [SINGLE_BOX, BALANCED, BALANCED_FAILOVER].map((d) => evaluate(d, THREE_TIER.scenario))
    expect(runs.map((r) => r.costPerMonth)).toEqual([250, 320, 540])
    expect(runs.map((r) => r.availability >= 0.999)).toEqual([false, false, true])
    expect(runs[0].availability).toBeLessThan(runs[1].availability)
    expect(runs[1].availability).toBeLessThan(runs[2].availability)
  })
})
