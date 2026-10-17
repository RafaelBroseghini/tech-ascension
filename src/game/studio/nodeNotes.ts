import { COMPONENTS, REPLICA_LAG_SECONDS } from "../../data/studio/components.ts"
import { capacitiesOf, fragileFeatures, trafficOf } from "./evaluate.ts"
import { describePlan } from "./plan.ts"
import { liveReplicas, route, withLegalEdges } from "./route.ts"
import type { Design, DesignNode, Scenario } from "./types.ts"

/** What the player has asked about, which decides how many numbers a node may print. */
export interface Known {
  /** "How much traffic?" was asked: loads print as "320 of 500 rps". */
  readonly traffic: boolean
  /** "Can anything be cached?" was asked: a cache prints its hit rate. */
  readonly cache: boolean
}

export interface NodeNote {
  /** The labelled readout under the piece: "API: 320 of 500 rps". Facts about the design; it never says pass or fail. */
  readonly line: string
  /** One sentence on what the piece does in this design. */
  readonly plan: string
  /** Ids of the features that stop working if one replica of this piece is lost. Empty when the piece is not a single point of failure. */
  readonly spof: readonly string[]
}

const LABEL: Readonly<Record<DesignNode["kind"], string>> = {
  users: "Users",
  api: "API",
  sql: "SQL",
  lb: "Balancer",
  cache: "Cache",
  replica: "Replica",
  standby: "Standby",
  cdn: "CDN",
  blob: "Blob store",
  queue: "Queue",
  worker: "Workers",
  kv: "KV",
  socket: "Sockets",
  bouncer: "Bouncer",
  autoscaler: "Autoscaler",
  breaker: "Breaker",
  region: "Region",
  oncall: "On-call",
}

const count = (n: number) => Math.round(n).toLocaleString("en-US")
const percent = (x: number) => `${Math.round(x * 100)}%`

/** A readout for every piece of the design, from the first phase's traffic, plus its plan and what its loss would break. */
export function nodeNotes(wired: Design, scenario: Scenario, threshold: number, known: Known): ReadonlyMap<string, NodeNote> {
  const design = withLegalEdges(wired)
  const phase = scenario.phases[0]
  const routed = route(design, trafficOf({ ...phase, fault: undefined }, scenario))
  const fragile = fragileFeatures(design, scenario, threshold)
  const hasSql = design.nodes.some((n) => n.kind === "sql")

  const line = (node: DesignNode): string => {
    const label = LABEL[node.kind]
    const spec = COMPONENTS[node.kind]
    const flow = routed.flows.get(node.id)
    const total = (flow?.total ?? 0) * phase.rps
    const writes = (flow?.writes ?? 0) * phase.rps
    const { total: capacity, writes: writeCapacity } = capacitiesOf(node, liveReplicas(node))
    switch (node.kind) {
      case "users":
        return known.traffic ? `${label}: ${count(phase.rps)} requests/s` : "Every request starts here"
      case "autoscaler":
      case "breaker":
      case "region":
      case "oncall":
        return `${label}: watches the whole design`
      case "standby":
        return design.edges.some((e) => e.to === node.id && design.nodes.find((n) => n.id === e.from)?.kind === "sql")
          ? `${label}: ready to take over`
          : `${label}: not attached to a database`
      case "replica": {
        const copied = design.edges.some((e) => e.to === node.id && design.nodes.find((n) => n.id === e.from)?.kind === "sql")
        if (!copied) return `${label}: nothing copies to it`
        return known.traffic ? `${label}: ${count(total)} reads/s, about ${REPLICA_LAG_SECONDS} s behind` : `${label}: about ${REPLICA_LAG_SECONDS} s behind its database`
      }
      case "cache": {
        if (!known.traffic) return `${label}: answers reads without asking the ${hasSql ? "DB" : "store"}`
        const answered = routed.leaves.filter((leaf) => leaf.served && leaf.nodes.at(-1) === node.id).reduce((sum, leaf) => sum + leaf.share, 0) * phase.rps
        if (total <= 0) return `${label}: no reads reach it`
        return known.cache
          ? `${label}: answers ${percent(answered / total)} of reads, saves the ${hasSql ? "DB" : "store"} ${count(answered)} rps`
          : `${label}: ${count(total)} reads/s reach it`
      }
      case "sql": {
        if (!known.traffic) return `${label}: up to ${count(writeCapacity)} writes/s, ${count(capacity)} requests/s`
        return `${label}: ${count(writes)} writes/s of ${count(writeCapacity)}${total - writes > 0 ? `, ${count(total - writes)} reads/s` : ""}`
      }
      case "queue": {
        const hold = spec.effect.kind === "buffer" ? spec.effect.holdSeconds : 0
        return known.traffic ? `${label}: ${count(total)} jobs/s, holds ${hold} s of backlog` : `${label}: holds ${hold} s of backlog`
      }
      case "worker":
        return known.traffic ? `${label}: ${count(total)} of ${count(capacity)} jobs/s` : `${label}: up to ${count(capacity)} jobs/s`
      default:
        return known.traffic ? `${label}: ${count(total)} of ${Number.isFinite(capacity) ? count(capacity) : "unlimited"} rps` : `${label}: up to ${count(capacity)} rps`
    }
  }

  return new Map(
    design.nodes.map((node) => [node.id, { line: line(node), plan: describePlan(design, node.id), spof: fragile.get(node.id) ?? [] }]),
  )
}
