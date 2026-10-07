import { describe, expect, it } from "vitest"
import { SHORTENER_CACHE, SHORTENER_CDN_READS_ONLY } from "../../data/studio/fixtures.ts"
import { route, type Traffic } from "./route.ts"
import type { Design } from "./types.ts"

const traffic: Traffic = { mix: { read: 0.95, write: 0.05 }, cacheHitRate: 0.9, edgeHitRate: 0.8, fanout: 1, bots: 0 }

describe("route", () => {
  it("writes with no path are reported as unrouted", () => {
    const readsOnly: Design = {
      nodes: [
        { id: "users", kind: "users", replicas: 1 },
        { id: "api", kind: "api", replicas: 1 },
        { id: "copy", kind: "replica", replicas: 1 },
      ],
      edges: [
        { from: "users", to: "api" },
        { from: "api", to: "copy" },
      ],
    }
    const routed = route(readsOnly, traffic)
    expect(routed.unrouted).toEqual(["write"])
    const lost = routed.leaves.filter((leaf) => !leaf.served)
    expect(lost).toEqual([expect.objectContaining({ type: "write", share: 0.05, nodes: ["users", "api"] })])
  })

  it("a CDN that only fronts reads leaves writes unrouted", () => {
    const routed = route(SHORTENER_CDN_READS_ONLY, traffic)
    expect(routed.unrouted).toEqual(["write"])
    expect(routed.flows.get("cdn")?.total).toBeCloseTo(0.95)
    expect(routed.flows.get("api")?.total).toBeCloseTo(0.95 * 0.2)
    expect(route(SHORTENER_CACHE, traffic).unrouted).toEqual([])
  })

  it("cache misses go on to the database and hits stop at the cache", () => {
    const routed = route(SHORTENER_CACHE, traffic)
    expect(routed.flows.get("db")?.total).toBeCloseTo(0.95 * 0.1 + 0.05)
    expect(routed.flows.get("db")?.writes).toBeCloseTo(0.05)
    const shares = routed.leaves.reduce((sum, leaf) => sum + leaf.share, 0)
    expect(shares).toBeCloseTo(1)
  })

  it("an upload reaches the bucket only through a worker", () => {
    const uploads: Traffic = { ...traffic, mix: { upload: 1 } }
    const nodes = [
      { id: "users", kind: "users", replicas: 1 },
      { id: "api", kind: "api", replicas: 1 },
      { id: "workers", kind: "worker", replicas: 1 },
      { id: "files", kind: "blob", replicas: 1 },
    ] as const
    const direct: Design = {
      nodes: nodes.filter((n) => n.id !== "workers"),
      edges: [
        { from: "users", to: "api" },
        { from: "api", to: "files" },
      ],
    }
    const processed: Design = {
      nodes,
      edges: [
        { from: "users", to: "api" },
        { from: "api", to: "workers" },
        { from: "workers", to: "files" },
      ],
    }
    expect(route(direct, uploads).unrouted).toEqual(["upload"])
    expect(route(processed, uploads).unrouted).toEqual([])
  })
})
