import { describe, expect, it } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Design } from "./types.ts"
import { nextHint } from "./hints.ts"
import { interviewById } from "./interviews.ts"

const THREE_TIER = interviewById("3-tier-app")!
const ALONE: Design = { nodes: [{ id: "users", kind: "users", replicas: 1 }], edges: [] }

describe("hints", () => {
  it("an empty board's first hint is a missing component kind", () => {
    expect(nextHint(THREE_TIER, ALONE)).toBe("Add a load balancer (Round Robin Hood).")
  })

  it("asks for the second node of a kind the reference uses twice", () => {
    const feed = interviewById("read-heavy-feed")!
    const oneLb: Design = {
      nodes: feed.reference.nodes.filter((n) => n.id !== "rlb"),
      edges: [],
    }
    expect(nextHint(feed, oneLb)).toBe("Add another load balancer (Round Robin Hood).")
  })

  it("gives a wire hint once every kind is on the board", () => {
    const unwired: Design = { nodes: THREE_TIER.reference.nodes, edges: THREE_TIER.reference.edges.slice(1) }
    expect(nextHint(THREE_TIER, unwired)).toBe("Connect the users to the load balancer.")
  })

  it("gives a replica hint last", () => {
    const thin: Design = {
      nodes: THREE_TIER.reference.nodes.map((n) => (n.kind === "api" ? { ...n, replicas: 1 } : n)),
      edges: THREE_TIER.reference.edges,
    }
    expect(nextHint(THREE_TIER, thin)).toBe("Run 3 replicas of the API server.")
  })

  it("is null once the board covers the reference", () => {
    for (const interview of INTERVIEWS) expect([interview.name, nextHint(interview, interview.reference)]).toEqual([interview.name, null])
  })
})
