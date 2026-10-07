import { describe, expect, it } from "vitest"
import { evaluate } from "../../game/studio/evaluate.ts"
import { CONSTRAINT_OF, verdict, type Constraint } from "../../game/studio/score.ts"
import type { ComponentKind, Design } from "../../game/studio/types.ts"
import { INTERVIEWS, type Interview } from "./challenges.ts"
import { COMPONENTS } from "./components.ts"
import { momentXp, UNLOCKS, unlockedBeforeJob, unlockedIn } from "./unlocks.ts"

const judge = (interview: Interview, design: Design) =>
  verdict(evaluate(design, interview.scenario), interview.targets, design)

const missed = (interview: Interview, design: Design) => {
  const v = judge(interview, design)
  return v.kind === "noHire" ? v.missed.map((m) => m.target) : []
}

const designsOf = (interview: Interview) => [interview.reference, interview.strongHire, ...interview.naive.map((n) => n.design)]

describe("interview catalog", () => {
  it("gates the twelve jobs of the plan, in order", () => {
    expect(INTERVIEWS.map((i) => [i.name, i.jobId])).toEqual([
      ["Hello server", 1],
      ["3-tier app", 2],
      ["Static site", 6],
      ["URL shortener", 7],
      ["Pastebin", 10],
      ["Image upload", 12],
      ["Read-heavy feed", 14],
      ["Notification fan-out", 16],
      ["WhatsApp", 19],
      ["Twitter fan-out", 20],
      ["Video streaming", 22],
      ["Global service", 24],
    ])
    expect(new Set(INTERVIEWS.map((i) => i.id)).size).toBe(INTERVIEWS.length)
  })

  it("every reference design passes", () => {
    for (const interview of INTERVIEWS) {
      expect([interview.name, judge(interview, interview.reference).kind]).not.toEqual([interview.name, "noHire"])
    }
  })

  it("every interview has a Strong hire design", () => {
    for (const interview of INTERVIEWS) {
      expect([interview.name, judge(interview, interview.strongHire).kind]).toEqual([interview.name, "strongHire"])
    }
  })

  it("every naive design fails on the target it names", () => {
    for (const interview of INTERVIEWS) {
      expect(interview.naive.length).toBeGreaterThanOrEqual(2)
      for (const naive of interview.naive) {
        expect([interview.name, naive.name, missed(interview, naive.design)]).toEqual([
          interview.name,
          naive.name,
          expect.arrayContaining([naive.fails]),
        ])
      }
    }
  })

  it("each of money, performance, availability and fault tolerance is the binding target of at least two naive designs", () => {
    const count: Record<Constraint, number> = { money: 0, performance: 0, availability: 0, faultTolerance: 0 }
    for (const naive of INTERVIEWS.flatMap((i) => i.naive)) count[CONSTRAINT_OF[naive.fails]]++
    for (const constraint of Object.keys(count) as Constraint[]) {
      expect([constraint, count[constraint] >= 2]).toEqual([constraint, true])
    }
  })

  it("each challenge's reference uses only kinds unlocked by then", () => {
    for (const interview of INTERVIEWS) {
      const kinds = new Set(designsOf(interview).flatMap((design) => design.nodes.map((n) => n.kind)))
      const locked = [...kinds].filter((kind) => !unlockedBeforeJob(kind, interview.jobId))
      expect([interview.name, locked]).toEqual([interview.name, []])
    }
  })

  it("the gated jobs rise in id with the interview order", () => {
    const ids = INTERVIEWS.map((i) => i.jobId)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has a fault phase in every interview from the URL shortener on", () => {
    const from = INTERVIEWS.findIndex((i) => i.id === "url-shortener")
    expect(from).toBeGreaterThan(0)
    for (const interview of INTERVIEWS.slice(from)) {
      expect([interview.name, interview.scenario.phases.some((p) => p.fault !== undefined)]).toEqual([interview.name, true])
    }
  })

  it("raises the availability target from 99% to 99.99% and never lowers it", () => {
    const targets = INTERVIEWS.map((i) => i.targets.availability)
    expect(targets[0]).toBe(0.99)
    expect(targets[targets.length - 1]).toBe(0.9999)
    targets.slice(1).forEach((target, i) => expect(target).toBeGreaterThanOrEqual(targets[i]))
  })

  it("each brief names its load and every target in numbers", () => {
    for (const { name, brief, targets, scenario } of INTERVIEWS) {
      const numbers = [
        `${scenario.phases[0].rps.toLocaleString("en-US")} `,
        `${Number((targets.successRate * 100).toFixed(2))}% of requests`,
        `${targets.p95Ms} ms`,
        `${Number((targets.availability * 100).toFixed(2))}% uptime`,
        `$${targets.budgetPerMonth.toLocaleString("en-US")} a month`,
      ]
      expect([name, numbers.filter((n) => !brief.includes(n))]).toEqual([name, []])
    }
  })

  it("names the queue's lag target only where the reference has a queue", () => {
    for (const { name, brief, reference } of INTERVIEWS) {
      const queued = reference.nodes.some((n) => n.kind === "queue")
      expect([name, brief.includes("seconds behind")]).toEqual([name, queued])
    }
  })
})

describe("components", () => {
  it("every component has a name and a goal", () => {
    for (const [kind, component] of Object.entries(COMPONENTS)) {
      expect([kind, component.name.length > 0]).toEqual([kind, true])
      expect([kind, component.goal.length > 0 && component.goal.length < 80]).toEqual([kind, true])
    }
  })
})

describe("unlocks", () => {
  it("every unlock names a career row that exists", () => {
    for (const moment of Object.values(UNLOCKS)) if (moment) expect(momentXp(moment)).toBeGreaterThan(0)
  })

  it("a kind unlocked by the job an interview gates is not on that interview's palette", () => {
    expect(unlockedBeforeJob("standby", 2)).toBe(false)
    expect(unlockedBeforeJob("standby", 6)).toBe(true)
    expect(unlockedBeforeJob("region", 24)).toBe(true)
    expect(unlockedBeforeJob("region", 22)).toBe(false)
  })

  it("a career's palette follows its skills, gigs and jobs", () => {
    const open = (career: Parameters<typeof unlockedIn>[1]) =>
      (Object.keys(UNLOCKS) as ComponentKind[]).filter((kind) => unlockedIn(kind, career))
    expect(open({ skills: {}, gigs: [], jobs: [] })).toEqual(["users"])
    expect(open({ skills: { "1": 1 }, gigs: [1, 2, 3], jobs: [] })).toEqual(["users", "api", "sql", "lb", "cache"])
    expect(open({ skills: { "1": 1 }, gigs: [1, 2, 3], jobs: [1, 2] })).toEqual([
      "users",
      "api",
      "sql",
      "lb",
      "cache",
      "replica",
      "standby",
      "cdn",
      "blob",
    ])
  })
})
