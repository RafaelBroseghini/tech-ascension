import { describe, expect, it } from "vitest"
import { BALANCED, BALANCED_FAILOVER, THREE_TIER } from "../../data/studio/fixtures.ts"
import { evaluate } from "./evaluate.ts"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { faultTally, starsOf, verdict } from "./score.ts"

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

describe("starsOf", () => {
  const hello = INTERVIEWS[0]
  const stars = (design: typeof hello.reference) => {
    const result = evaluate(design, hello.scenario)
    return starsOf(result, hello.targets, verdict(result, hello.targets, design))
  }

  it("earns none for a board that cannot serve a feature, one for a board that works, then two and three for the targets and half the budget", () => {
    expect(stars(hello.naive[0].design)).toBe(0)
    expect(stars(hello.naive[1].design)).toBe(1)
    expect(stars(hello.reference)).toBe(3)
  })

  it("a hire over half the budget is two stars", () => {
    const result = evaluate(BALANCED_FAILOVER, THREE_TIER.scenario)
    expect(starsOf(result, THREE_TIER.targets, verdict(result, THREE_TIER.targets, BALANCED_FAILOVER))).toBe(2)
  })
})
