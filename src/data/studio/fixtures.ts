import type { Challenge, ComponentKind, Design, DesignNode, Feature, RequestType } from "../../game/studio/types.ts"

/** Fixed designs for the simulator's unit tests. The interviews themselves live in `challenges.ts`. */

const node = (id: string, kind: ComponentKind, replicas = 1): DesignNode => ({ id, kind, replicas })

/** A fixture feature: eventual, not durable, not async unless the call says so. */
export const feature = (id: string, request: RequestType, share: number, rest: Partial<Feature> = {}): Feature => ({
  id,
  story: id,
  request,
  share,
  consistency: "eventual",
  durable: false,
  async: false,
  ...rest,
})

const design = (nodes: DesignNode[], edges: [string, string][]): Design => ({
  nodes,
  edges: edges.map(([from, to]) => ({ from, to })),
})

export const SINGLE_BOX = design([node("users", "users"), node("api", "api"), node("db", "sql")], [
  ["users", "api"],
  ["api", "db"],
])

export const BALANCED = design([node("users", "users"), node("lb", "lb"), node("api", "api", 2), node("db", "sql")], [
  ["users", "lb"],
  ["lb", "api"],
  ["api", "db"],
])

export const BALANCED_FAILOVER = design(
  [node("users", "users"), node("lb", "lb"), node("api", "api", 2), node("db", "sql"), node("standby", "standby")],
  [
    ["users", "lb"],
    ["lb", "api"],
    ["api", "db"],
    ["db", "standby"],
  ],
)

export const THREE_TIER: Challenge = {
  id: "fixture-3-tier",
  name: "3-tier app",
  scenario: {
    phases: [
      { name: "Monday morning", seconds: 60, rps: 300 },
      { name: "Reboot", seconds: 60, rps: 300, fault: { kind: "killReplica", target: "api" } },
      { name: "Database down", seconds: 60, rps: 300, fault: { kind: "killDatabase" } },
    ],
    features: [feature("read", "read", 0.8), feature("write", "write", 0.2, { durable: true })],
    cacheHitRate: 0.7,
    edgeHitRate: 0,
    fanout: 1,
  },
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 5, availability: 0.999, budgetPerMonth: 600 },
  reference: BALANCED_FAILOVER,
  naive: [
    { name: "single box", design: SINGLE_BOX, fails: "availability" },
    { name: "balanced, single database", design: BALANCED, fails: "availability" },
  ],
}

export const SHORTENER_CACHE = design(
  [node("users", "users"), node("lb", "lb"), node("api", "api", 14), node("cache", "cache"), node("db", "sql")],
  [
    ["users", "lb"],
    ["lb", "api"],
    ["api", "cache"],
    ["api", "db"],
  ],
)

/** The CDN fronts reads only, so writes have nowhere to go. */
export const SHORTENER_CDN_READS_ONLY = design(
  [node("users", "users"), node("cdn", "cdn"), node("lb", "lb"), node("api", "api", 4), node("cache", "cache"), node("db", "sql")],
  [
    ["users", "cdn"],
    ["cdn", "lb"],
    ["lb", "api"],
    ["api", "cache"],
    ["api", "db"],
  ],
)

const fanoutDesign = (workers: number): Design =>
  design(
    [
      node("users", "users"),
      node("lb", "lb"),
      node("api", "api", 16),
      node("cache", "cache"),
      node("queue", "queue"),
      node("workers", "worker", workers),
      node("kv", "kv", 6),
    ],
    [
      ["users", "lb"],
      ["lb", "api"],
      ["api", "cache"],
      ["api", "kv"],
      ["api", "queue"],
      ["queue", "workers"],
      ["workers", "kv"],
    ],
  )

export const FANOUT_QUEUED = fanoutDesign(2)
export const FANOUT_ONE_WORKER = fanoutDesign(1)

export const FANOUT_SYNC = design(
  [node("users", "users"), node("lb", "lb"), node("api", "api", 10), node("cache", "cache"), node("db", "sql", 2)],
  [
    ["users", "lb"],
    ["lb", "api"],
    ["api", "cache"],
    ["api", "db"],
  ],
)

export const FANOUT: Challenge = {
  id: "fixture-fanout",
  name: "Fan-out",
  scenario: {
    phases: [{ name: "Celebrity posts", seconds: 60, rps: 4000 }],
    features: [feature("read", "read", 0.9), feature("post", "fanout", 0.1, { durable: true, async: true })],
    cacheHitRate: 0.85,
    edgeHitRate: 0,
    fanout: 50,
  },
  targets: { successRate: 0.99, p95Ms: 80, maxLagSeconds: 5, availability: 0.99, budgetPerMonth: 3500 },
  reference: FANOUT_QUEUED,
  naive: [
    { name: "one worker", design: FANOUT_ONE_WORKER, fails: "lag" },
    { name: "synchronous fan-out", design: FANOUT_SYNC, fails: "success" },
  ],
}
