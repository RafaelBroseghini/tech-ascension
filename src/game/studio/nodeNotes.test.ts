import { describe, expect, it } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { nodeNotes } from "./nodeNotes.ts"
import { describePlan } from "./plan.ts"

const interview = (id: string) => INTERVIEWS.find((row) => row.id === id)!
const SHOP = interview("3-tier-app")
const FEED = interview("read-heavy-feed")
const ALL = { traffic: true, cache: true }
const notes = (i = SHOP, known = ALL, design = i.reference) => nodeNotes(design, i.scenario, i.targets.successRate, known)

describe("node readouts", () => {
  it("label the load of each piece against its capacity", () => {
    const shop = notes()
    expect(shop.get("api")?.line).toBe("API: 600 of 1,500 rps")
    expect(shop.get("users")?.line).toBe("Users: 600 requests/s")
    expect(shop.get("lb")?.line).toBe("Balancer: 600 of 20,000 rps")
  })

  it("say what a cache answers and what it saves the database", () => {
    expect(notes().get("cache")?.line).toBe("Cache: answers 70% of reads, saves the DB 294 rps")
  })

  it("say how many writes a database takes of its write limit", () => {
    expect(notes().get("db")?.line).toBe("SQL: 120 writes/s of 300, 186 reads/s")
  })

  it("say how far behind a replica runs", () => {
    expect(notes(FEED).get("replicas")?.line).toMatch(/^Replica: [\d,]+ reads\/s, about 2 s behind$/)
  })

  it("print no load until traffic was asked about, and no hit rate until caching was", () => {
    const quiet = notes(SHOP, { traffic: false, cache: false })
    expect(quiet.get("api")?.line).toBe("API: up to 1,500 rps")
    expect(quiet.get("users")?.line).toBe("Every request starts here")
    expect(quiet.get("cache")?.line).toBe("Cache: answers reads without asking the DB")
    expect(notes(SHOP, { traffic: true, cache: false }).get("cache")?.line).toBe("Cache: 420 reads/s reach it")
    expect(JSON.stringify([...quiet.values()])).not.toMatch(/600|420|294/)
  })

  it("mark a single point of failure with the features its loss drops, and not a piece with a spare", () => {
    const shop = notes()
    expect(shop.get("db")?.spof).toEqual(["browse", "order", "checkout"])
    expect(shop.get("lb")?.spof).toEqual(["browse", "order", "checkout"])
    expect(shop.get("api")?.spof).toEqual([])
    expect(shop.get("cache")?.spof).toEqual([])
    expect(notes(FEED).get("replicas")?.spof).toEqual([])
  })
})

describe("what a piece does in this design", () => {
  it("is built from the wires and the call plan", () => {
    const plan = (id: string, i = SHOP) => describePlan(i.reference, id)
    expect(plan("api")).toBe(
      "Takes requests from Round Robin Hood: reads try Redish and PostgreSloth in that order; writes go to PostgreSloth and clear the cache.",
    )
    expect(plan("lb")).toBe("Spreads what The Users sends across Hamster Wheel API, skipping any that are down.")
    expect(plan("cache")).toContain("Answers repeat reads for Hamster Wheel API")
    expect(plan("replicas", FEED)).toBe("Serves reads for Hamster Wheel API from a copy of the database that runs a little behind.")
    expect(plan("db", FEED)).toBe("The primary: takes every write, copies it to Copycat Replica.")
  })

  it("says so when a piece is not wired or nothing copies to a replica", () => {
    const alone = { nodes: [{ id: "users", kind: "users" as const, replicas: 1 }, { id: "x", kind: "cache" as const, replicas: 1 }], edges: [] }
    expect(describePlan(alone, "x")).toBe("Not wired to anything yet.")
    const uncopied = {
      nodes: [{ id: "api", kind: "api" as const, replicas: 1 }, { id: "r", kind: "replica" as const, replicas: 1 }],
      edges: [{ from: "api", to: "r" }],
    }
    expect(describePlan(uncopied, "r")).toBe("Nothing copies the database to it, so it takes no reads.")
  })
})
