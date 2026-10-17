import { describe, expect, it } from "vitest"
import { BALANCED, BALANCED_FAILOVER, THREE_TIER } from "../../data/studio/fixtures.ts"
import { evaluate } from "./evaluate.ts"
import { faultTally, verdict } from "./score.ts"

const judge = (design: typeof BALANCED, budgetPerMonth = THREE_TIER.targets.budgetPerMonth) =>
  verdict(evaluate(design, THREE_TIER.scenario), { ...THREE_TIER.targets, budgetPerMonth }, design)

describe("faultTally", () => {
  it("counts the faulted phases that kept the success target, without a verdict", () => {
    const { scenario, targets } = THREE_TIER
    expect(faultTally(evaluate(BALANCED, scenario), targets)).toEqual({ survived: 1, total: 2 })
    expect(faultTally(evaluate(BALANCED_FAILOVER, scenario), targets)).toEqual({ survived: 2, total: 2 })
  })
})

describe("verdict", () => {
  it("passes every target for a hire and needs half the budget for a strong hire", () => {
    expect(judge(BALANCED_FAILOVER).kind).toBe("hire")
    expect(judge(BALANCED_FAILOVER, 1080)).toEqual({ kind: "strongHire", faults: { survived: 2, total: 2 } })
    expect(judge(BALANCED_FAILOVER, 539).kind).toBe("noHire")
  })

  it("a No hire names each missed target with one interviewer line", () => {
    const v = judge(BALANCED)
    if (v.kind !== "noHire") throw new Error(`expected a No hire, got ${v.kind}`)
    expect(v.missed.map((m) => m.target)).toEqual(["availability", "faults"])
    expect(v.missed[0].line).toContain("PostgreSloth is a single point of failure")
    expect(v.missed[1].line).toContain("PostgreSloth fell over.")
    expect(v.faults).toEqual({ survived: 1, total: 2 })
  })
})
