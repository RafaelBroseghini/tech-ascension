import type { Component, ComponentKind, Fault } from "../../game/studio/types.ts"

/** Starting numbers from the plan's component catalog. `npm run designs:check` owns their balance. */
export const COMPONENTS: Readonly<Record<ComponentKind, Component>> = {
  users: {
    name: "The Users",
    goal: "Every request starts here. Thousands of people refreshing at once.",
    capacity: null,
    writeCapacity: null,
    latencyMs: 0,
    costPerMonth: 0,
    uptime: null,
    effect: { kind: "source" },
  },
  api: {
    name: "Hamster Wheel API",
    goal: "The app server. Runs your code. Stateless, so add more wheels.",
    capacity: 500,
    writeCapacity: null,
    latencyMs: 20,
    costPerMonth: 50,
    uptime: 0.995,
    effect: { kind: "serve", role: "compute" },
  },
  sql: {
    name: "PostgreSloth",
    goal: "The SQL database. One source of truth. Strong, slow and single.",
    capacity: 1000,
    writeCapacity: 300,
    latencyMs: 10,
    costPerMonth: 200,
    uptime: 0.995,
    effect: { kind: "serve", role: "database" },
  },
  lb: {
    name: "Round Robin Hood",
    goal: "Load balancer. Takes from busy servers, gives to idle ones, skips dead ones.",
    capacity: 20_000,
    writeCapacity: null,
    latencyMs: 1,
    costPerMonth: 20,
    uptime: 0.9999,
    effect: { kind: "balance" },
  },
  cache: {
    name: "Redish",
    goal: "A cache. Remembers hot answers, forgets everything when it restarts.",
    capacity: 20_000,
    writeCapacity: null,
    latencyMs: 1,
    costPerMonth: 80,
    uptime: 0.999,
    effect: { kind: "cacheHits" },
  },
  replica: {
    name: "Copycat Replica",
    goal: "A read-only twin of the database, always a little behind.",
    capacity: 1000,
    writeCapacity: null,
    latencyMs: 10,
    costPerMonth: 150,
    uptime: 0.995,
    effect: { kind: "replicateReads" },
  },
  standby: {
    name: "Hot Standby Sloth",
    goal: "A second database that waits for the first one to fall over.",
    capacity: null,
    writeCapacity: null,
    latencyMs: 0,
    costPerMonth: 220,
    uptime: null,
    effect: { kind: "failover", pairUptime: 0.99995 },
  },
  cdn: {
    name: "EdgeLord CDN",
    goal: "Serves files from a box near the user, smugly.",
    capacity: 100_000,
    writeCapacity: null,
    latencyMs: 5,
    costPerMonth: 60,
    uptime: 0.9999,
    effect: { kind: "edgeHits", staticHitRate: 0.95 },
  },
  blob: {
    name: "Bucket of Bits",
    goal: "Blob storage. Keeps files forever, for pennies, at a leisurely pace.",
    capacity: 5000,
    writeCapacity: null,
    latencyMs: 30,
    costPerMonth: 25,
    uptime: 0.9999,
    effect: { kind: "store" },
  },
  queue: {
    name: "Kafkaesque Queue",
    goal: "Puts work in line so a spike waits instead of failing.",
    capacity: 5000,
    writeCapacity: null,
    latencyMs: 2,
    costPerMonth: 40,
    uptime: 0.9995,
    effect: { kind: "buffer", holdSeconds: 60 },
  },
  worker: {
    name: "Cron Job Minions",
    goal: "Background workers. They drain the queue and never complain.",
    capacity: 300,
    writeCapacity: null,
    latencyMs: 30,
    costPerMonth: 50,
    uptime: 0.995,
    effect: { kind: "consume" },
  },
  kv: {
    name: "WebScale KV",
    goal: "A key-value store. Scales out forever. No joins, no feelings.",
    capacity: 5000,
    writeCapacity: null,
    latencyMs: 5,
    costPerMonth: 250,
    uptime: 0.9995,
    effect: { kind: "shard" },
  },
  socket: {
    name: "Socket Puppet",
    goal: "Holds connections open so chats arrive instantly.",
    capacity: 10_000,
    writeCapacity: null,
    latencyMs: 2,
    costPerMonth: 60,
    uptime: 0.999,
    effect: { kind: "holdConnections" },
  },
  bouncer: {
    name: "Bouncer.js",
    goal: "A rate limiter. Turns bots away at the door before they cost you.",
    capacity: 50_000,
    writeCapacity: null,
    latencyMs: 1,
    costPerMonth: 15,
    uptime: 0.9999,
    effect: { kind: "rateLimit" },
  },
  autoscaler: {
    name: "Panic Autoscaler",
    goal: "Adds servers when traffic spikes, and bills you for the panic.",
    capacity: null,
    writeCapacity: null,
    latencyMs: 0,
    costPerMonth: 30,
    uptime: null,
    effect: { kind: "autoscale", costMarkup: 0.3 },
  },
  breaker: {
    name: "Rage Quit Breaker",
    goal: "A circuit breaker. Drops a slow dependency fast, so one outage stays one.",
    capacity: null,
    writeCapacity: null,
    latencyMs: 1,
    costPerMonth: 10,
    uptime: null,
    effect: { kind: "breakCircuit", timeoutMs: 50 },
  },
  region: {
    name: "Second Datacenter in Ohio",
    goal: "A copy of everything somewhere else. Doubles the bill.",
    capacity: null,
    writeCapacity: null,
    latencyMs: 0,
    costPerMonth: 0,
    uptime: null,
    effect: { kind: "secondRegion", crossRegionMs: 40 },
  },
  oncall: {
    name: "On-Call Intern",
    goal: "Monitoring. Notices outages sooner. Raises uptime, lowers morale.",
    capacity: null,
    writeCapacity: null,
    latencyMs: 0,
    costPerMonth: 30,
    uptime: null,
    effect: { kind: "monitor", downtimeCut: 0.3 },
  },
}

export const FAULT_LINES: Readonly<Record<Fault["kind"], string>> = {
  killReplica: "The intern rebooted prod.",
  killDatabase: "PostgreSloth fell over.",
  flushCache: "Someone ran FLUSHALL.",
  slowDependency: "The payment API is having a day.",
  regionOutage: "us-east-1 is down again.",
  spike: "A celebrity tweeted your link.",
  botFlood: "The bots found you.",
}

/**
 * The one wiring table: which piece may call which. The board, the router, the hints and the copy all read it.
 * `sql` calling `replica` or `standby` is replication, not a request; the router never sends traffic along it.
 */
export const CAN_CALL: Readonly<Record<ComponentKind, readonly ComponentKind[]>> = {
  users: ["cdn", "bouncer", "lb", "api", "socket"],
  bouncer: ["cdn", "lb", "api", "socket"],
  cdn: ["lb", "api", "blob"],
  lb: ["api", "socket"],
  api: ["cache", "sql", "replica", "kv", "blob", "queue", "worker"],
  socket: ["cache", "kv", "queue"],
  queue: ["worker"],
  worker: ["sql", "kv", "blob", "cache"],
  sql: ["replica", "standby"],
  cache: [],
  replica: [],
  standby: [],
  kv: [],
  blob: [],
  autoscaler: [],
  breaker: [],
  oncall: [],
  region: [],
}

export const canCall = (from: ComponentKind, to: ComponentKind): boolean => CAN_CALL[from].includes(to)

const OPS: ReadonlySet<ComponentKind> = new Set(["autoscaler", "breaker", "oncall", "region"])
const STORES: ReadonlySet<ComponentKind> = new Set(["cache", "replica", "standby", "kv", "blob"])
const DATA: ReadonlySet<ComponentKind> = new Set([...STORES, "sql"])

/** Why a wire is refused, as one plain sentence naming both pieces; null for a legal wire. One sentence per family of rules. */
export function refusal(from: ComponentKind, to: ComponentKind): string | null {
  if (canCall(from, to)) return null
  const a = COMPONENTS[from].name
  const b = COMPONENTS[to].name
  if (to === "users") return `Nothing calls ${b}. Every request starts there.`
  if (OPS.has(from) || OPS.has(to)) return `${OPS.has(from) ? a : b} watches the whole design, so it takes no wires.`
  if (from === "sql") return `${a} only replicates to a Replica or a Standby, so it can't call ${b}.`
  if (STORES.has(from)) return `${a} only stores and answers. It never calls onward, so it can't reach ${b}.`
  if (from === "queue") return `A queue only feeds workers. ${a} can't call ${b}.`
  if (from === "lb") return `A load balancer only spreads traffic across servers. ${a} can't call ${b}.`
  if (to === "standby") return `${b} only follows its database. Wire it from the SQL database.`
  if (DATA.has(to)) return `Data sits behind a server. ${a} can't reach ${b} directly.`
  if (to === "queue" || to === "worker") return `${b} takes its work from a server or a queue. ${a} can't reach it directly.`
  return `${a} doesn't call ${b}. Requests flow from The Users toward the data.`
}

/** The board's columns, left to right. Wires run toward the data; only replication stays inside a column. */
export type Lane = "users" | "edge" | "routing" | "compute" | "async" | "data" | "ops"

export const LANES: readonly { readonly id: Lane; readonly name: string }[] = [
  { id: "users", name: "Users" },
  { id: "edge", name: "Edge" },
  { id: "routing", name: "Routing" },
  { id: "compute", name: "Compute" },
  { id: "async", name: "Async" },
  { id: "data", name: "Data" },
  { id: "ops", name: "Ops" },
]

/** The lane a piece snaps into. Ops pieces take no wires, so they sit in a column of their own at the end. */
export const LANE_OF: Readonly<Record<ComponentKind, Lane>> = {
  users: "users",
  cdn: "edge",
  bouncer: "edge",
  lb: "routing",
  api: "compute",
  socket: "compute",
  queue: "async",
  worker: "async",
  sql: "data",
  replica: "data",
  standby: "data",
  cache: "data",
  kv: "data",
  blob: "data",
  autoscaler: "ops",
  breaker: "ops",
  oncall: "ops",
  region: "ops",
}

export const laneIndex = (kind: ComponentKind): number => LANES.findIndex((lane) => lane.id === LANE_OF[kind])
