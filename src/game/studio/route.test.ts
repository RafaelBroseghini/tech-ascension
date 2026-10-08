import { describe, expect, it } from "vitest"
import { feature, SHORTENER_CACHE, SHORTENER_CDN_READS_ONLY } from "../../data/studio/fixtures.ts"
import { route, withLegalEdges, type Traffic } from "./route.ts"
import type { Design, DesignNode, Feature } from "./types.ts"

const READ = feature("read", "read", 0.95)
const WRITE = feature("write", "write", 0.05, { durable: true })

const traffic = (features: readonly Feature[] = [READ, WRITE], rest: Partial<Traffic> = {}): Traffic => ({
  features,
  cacheHitRate: 0.9,
  edgeHitRate: 0.8,
  fanout: 1,
  bots: 0,
  ...rest,
})

const node = (id: string, kind: DesignNode["kind"], replicas = 1): DesignNode => ({ id, kind, replicas })
const wires = (...pairs: [string, string][]) => pairs.map(([from, to]) => ({ from, to }))

describe("route", () => {
  it("writes with no path are reported as unrouted", () => {
    const readsOnly: Design = {
      nodes: [node("users", "users"), node("api", "api"), node("copy", "replica"), node("db", "sql")],
      edges: wires(["users", "api"], ["api", "copy"], ["db", "copy"]),
    }
    const routed = route(readsOnly, traffic())
    expect(routed.unrouted).toEqual(["write"])
    expect(routed.unroutedFeatures).toEqual(["write"])
    const lost = routed.leaves.filter((leaf) => !leaf.served)
    expect(lost).toEqual([expect.objectContaining({ feature: "write", type: "write", share: 0.05, nodes: ["users", "api"] })])
  })

  it("a CDN that only fronts reads leaves writes unrouted", () => {
    const routed = route(SHORTENER_CDN_READS_ONLY, traffic())
    expect(routed.unrouted).toEqual(["write"])
    expect(routed.flows.get("cdn")?.total).toBeCloseTo(0.95)
    expect(routed.flows.get("api")?.total).toBeCloseTo(0.95 * 0.2)
    expect(route(SHORTENER_CACHE, traffic()).unrouted).toEqual([])
  })

  it("a service asks its cache first and its database second, with no wire between them", () => {
    const routed = route(SHORTENER_CACHE, traffic())
    expect(routed.flows.get("cache")?.total).toBeCloseTo(0.95)
    expect(routed.flows.get("db")?.total).toBeCloseTo(0.95 * 0.1 + 0.05)
    expect(routed.flows.get("db")?.writes).toBeCloseTo(0.05)
    const shares = routed.leaves.reduce((sum, leaf) => sum + leaf.share, 0)
    expect(shares).toBeCloseTo(1)
  })

  it("an eventual read prefers a replica to the primary, a strong read never uses one", () => {
    const eventual = feature("browse", "read", 0.5)
    const strong = feature("own", "read", 0.5, { consistency: "strong" })
    const design: Design = {
      nodes: [node("users", "users"), node("api", "api"), node("cache", "cache"), node("copy", "replica"), node("db", "sql")],
      edges: wires(["users", "api"], ["api", "cache"], ["api", "copy"], ["api", "db"], ["db", "copy"]),
    }
    const routed = route(design, traffic([eventual, strong]))
    expect(routed.unrouted).toEqual([])
    expect(routed.flows.get("cache")?.total).toBeCloseTo(0.5)
    expect(routed.flows.get("copy")?.total).toBeCloseTo(0.5 * 0.1)
    expect(routed.flows.get("db")?.total).toBeCloseTo(0.5)
  })

  it("a replica nobody copies to takes no reads", () => {
    const design: Design = {
      nodes: [node("users", "users"), node("api", "api"), node("copy", "replica"), node("db", "sql")],
      edges: wires(["users", "api"], ["api", "copy"], ["api", "db"]),
    }
    const routed = route(design, traffic([feature("browse", "read", 1)]))
    expect(routed.flows.get("copy")).toBeUndefined()
    expect(routed.flows.get("db")?.total).toBeCloseTo(1)
  })

  it("a strong read with only a replica behind it is unrouted", () => {
    const design: Design = {
      nodes: [node("users", "users"), node("api", "api"), node("copy", "replica"), node("db", "sql")],
      edges: wires(["users", "api"], ["api", "copy"], ["db", "copy"]),
    }
    const routed = route(design, traffic([feature("own", "read", 1, { consistency: "strong" })]))
    expect(routed.unroutedFeatures).toEqual(["own"])
  })

  it("a write skips the cache and lands on the primary", () => {
    const routed = route(SHORTENER_CACHE, traffic([WRITE, READ]))
    expect(routed.leaves.filter((leaf) => leaf.feature === "write").every((leaf) => leaf.nodes.at(-1) === "db")).toBe(true)
  })

  it("a feature that is not async is not queued", () => {
    const design: Design = {
      nodes: [node("users", "users"), node("api", "api"), node("queue", "queue"), node("workers", "worker"), node("db", "sql")],
      edges: wires(["users", "api"], ["api", "queue"], ["queue", "workers"], ["workers", "db"], ["api", "db"]),
    }
    const sync = route(design, traffic([feature("pay", "write", 1, { durable: true })]))
    expect(sync.flows.get("queue")).toBeUndefined()
    const later = route(design, traffic([feature("pay", "write", 1, { durable: true, async: true })]))
    expect(later.flows.get("queue")?.total).toBeCloseTo(1)
  })

  it("an upload reaches the bucket only through a worker", () => {
    const uploads = traffic([feature("upload", "upload", 1, { durable: true })])
    const nodes = [node("users", "users"), node("api", "api"), node("workers", "worker"), node("files", "blob")]
    const direct: Design = { nodes: nodes.filter((n) => n.id !== "workers"), edges: wires(["users", "api"], ["api", "files"]) }
    const processed: Design = { nodes, edges: wires(["users", "api"], ["api", "workers"], ["workers", "files"]) }
    expect(route(direct, uploads).unrouted).toEqual(["upload"])
    expect(route(processed, uploads).unrouted).toEqual([])
  })

  it("drops wires the table forbids", () => {
    const design: Design = {
      nodes: [node("users", "users"), node("api", "api"), node("cache", "cache"), node("db", "sql")],
      edges: wires(["users", "db"], ["users", "api"], ["api", "cache"], ["cache", "db"], ["api", "db"]),
    }
    expect(withLegalEdges(design).edges).toEqual(wires(["users", "api"], ["api", "cache"], ["api", "db"]))
    expect(route(design, traffic()).flows.get("db")?.total).toBeCloseTo(0.95 * 0.1 + 0.05)
  })
})
