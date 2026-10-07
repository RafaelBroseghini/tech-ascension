import { COMPONENTS } from "../../data/studio/components.ts"
import type { Design, DesignNode, Effect, EffectKind, Mix, RequestType } from "./types.ts"

export const REQUEST_TYPES: readonly RequestType[] = ["read", "write", "static", "fanout", "message", "upload"]

export interface Traffic {
  readonly mix: Mix
  readonly cacheHitRate: number
  readonly edgeHitRate: number
  readonly fanout: number
  /** Bot traffic as a multiple of real traffic. */
  readonly bots: number
}

/** Load on one node, as a multiple of the phase's real requests per second. */
export interface Flow {
  total: number
  writes: number
}

/** One way a share of one request type ends. */
export interface Leaf {
  readonly type: RequestType
  readonly share: number
  readonly nodes: readonly string[]
  /** `nodes` before this index keep the user waiting; the rest run after a queue has answered. */
  readonly sync: number
  /** Sync nodes from this index on run once per fan-out write. */
  readonly fanFrom: number | null
  /** How much work the queue that answered can hold, in seconds. */
  readonly holdSeconds: number | null
  readonly served: boolean
}

export interface Routing {
  readonly flows: ReadonlyMap<string, Flow>
  readonly leaves: readonly Leaf[]
  /** Request types with a share that reaches a node with nowhere to send it. */
  readonly unrouted: readonly RequestType[]
  readonly cycles: readonly (readonly string[])[]
}

type Step =
  | { readonly kind: "refuse" }
  | { readonly kind: "answer" }
  | { readonly kind: "pass"; readonly answered: number }
  | { readonly kind: "balance" }
  | { readonly kind: "compute" }
  | { readonly kind: "enqueue"; readonly holdSeconds: number }
  | { readonly kind: "screen" }

const ANSWERS_ALL = (types: readonly RequestType[], type: RequestType): Step =>
  types.includes(type) ? { kind: "answer" } : { kind: "refuse" }

const ASYNC_WORK: readonly RequestType[] = ["write", "fanout", "upload", "message"]

/** `processed` is whether a worker has already handled this request on its way here. */
function step(effect: Effect, type: RequestType, traffic: Traffic, processed: boolean): Step {
  switch (effect.kind) {
    case "source":
    case "failover":
    case "autoscale":
    case "secondRegion":
    case "monitor":
      return { kind: "refuse" }
    case "serve":
      if (effect.role === "database") return ANSWERS_ALL(["read", "write", "fanout", "message"], type)
      return type === "message" ? { kind: "refuse" } : { kind: "compute" }
    case "balance":
      return { kind: "balance" }
    case "cacheHits":
      return type === "read" ? { kind: "pass", answered: traffic.cacheHitRate } : { kind: "refuse" }
    case "replicateReads":
      return ANSWERS_ALL(["read"], type)
    case "edgeHits":
      if (type === "static") return { kind: "pass", answered: effect.staticHitRate }
      return type === "read" ? { kind: "pass", answered: traffic.edgeHitRate } : { kind: "refuse" }
    case "store":
      // An upload is stored only after a worker has processed it, or a bucket would make every pipeline optional.
      if (type === "upload" && !processed) return { kind: "refuse" }
      return ANSWERS_ALL(["read", "write", "static", "upload"], type)
    case "buffer":
      return ASYNC_WORK.includes(type) ? { kind: "enqueue", holdSeconds: effect.holdSeconds } : { kind: "refuse" }
    case "consume":
      return ASYNC_WORK.includes(type) ? { kind: "compute" } : { kind: "refuse" }
    case "shard":
      return ANSWERS_ALL(["read", "write", "fanout", "message"], type)
    case "holdConnections":
      return type === "message" ? { kind: "pass", answered: 0 } : { kind: "refuse" }
    case "rateLimit":
      return { kind: "screen" }
    case "breakCircuit":
      return { kind: "pass", answered: 0 }
    default: {
      const unhandled: never = effect
      return unhandled
    }
  }
}

/** When a node has several neighbors that take a request, it uses the lowest rank and splits across ties. */
const RANK: Readonly<Record<EffectKind, number>> = {
  rateLimit: 0,
  edgeHits: 1,
  balance: 2,
  holdConnections: 3,
  breakCircuit: 4,
  cacheHits: 5,
  buffer: 6,
  consume: 7,
  replicateReads: 8,
  serve: 9,
  shard: 10,
  store: 11,
  source: 99,
  failover: 99,
  autoscale: 99,
  secondRegion: 99,
  monitor: 99,
}

export const liveReplicas = (node: DesignNode): number => Math.max(0, Math.floor(node.replicas))

const isWrite = (type: RequestType): boolean => type !== "read" && type !== "static"

interface Walk {
  readonly type: RequestType
  readonly share: number
  readonly bots: number
  readonly fan: number
  readonly nodes: readonly string[]
  readonly sync: number | null
  readonly fanFrom: number | null
  readonly holdSeconds: number | null
  readonly processed: boolean
}

export function route(design: Design, traffic: Traffic): Routing {
  const byId = new Map(design.nodes.map((node) => [node.id, node]))
  const out = new Map<string, DesignNode[]>()
  for (const { from, to } of design.edges) {
    const target = byId.get(to)
    if (!byId.has(from) || !target) continue
    out.set(from, [...(out.get(from) ?? []), target])
  }
  const flows = new Map<string, Flow>()
  const leaves: Leaf[] = []
  const unrouted = new Set<RequestType>()
  const cycles = new Map<string, string[]>()

  const end = (walk: Walk, served: boolean, share = walk.share) => {
    if (share <= 0) return
    if (!served) unrouted.add(walk.type)
    leaves.push({
      type: walk.type,
      share,
      nodes: walk.nodes,
      sync: walk.sync ?? walk.nodes.length,
      fanFrom: walk.fanFrom,
      holdSeconds: walk.holdSeconds,
      served,
    })
  }

  const visit = (node: DesignNode, from: Walk) => {
    const walk: Walk = {
      ...from,
      nodes: [...from.nodes, node.id],
      processed: from.processed || COMPONENTS[node.kind].effect.kind === "consume",
    }
    const flow = flows.get(node.id) ?? { total: 0, writes: 0 }
    const load = walk.share * (1 + walk.bots) * walk.fan
    flow.total += load
    if (isWrite(walk.type)) flow.writes += load
    flows.set(node.id, flow)

    const here = step(COMPONENTS[node.kind].effect, walk.type, traffic, walk.processed)
    if (here.kind === "answer") return end(walk, true)
    const answered = here.kind === "pass" ? here.answered : 0
    end(walk, true, walk.share * answered)
    let next: Walk = { ...walk, share: walk.share * (1 - answered) }
    if (next.share <= 0) return
    if (here.kind === "screen") next = { ...next, bots: 0 }
    if (here.kind === "enqueue" && next.sync === null) {
      next = { ...next, sync: next.nodes.length, holdSeconds: here.holdSeconds }
    }

    const group = nextHop(node, next)
    if (group.length === 0) return end(next, false)
    if (here.kind === "compute" && walk.type === "fanout" && next.fan === 1) {
      const queued = COMPONENTS[group[0].kind].effect.kind === "buffer"
      if (!queued) next = { ...next, fan: traffic.fanout, fanFrom: next.sync === null ? next.nodes.length : null }
    }
    const weighted = here.kind === "balance" && group.some((target) => liveReplicas(target) > 0)
    const weights = group.map((target) => (weighted ? liveReplicas(target) : 1))
    const sum = weights.reduce((a, b) => a + b, 0)
    group.forEach((target, i) => visit(target, { ...next, share: (next.share * weights[i]) / sum }))
  }

  const nextHop = (node: DesignNode, walk: Walk): DesignNode[] => {
    const takers: DesignNode[] = []
    for (const target of out.get(node.id) ?? []) {
      if (step(COMPONENTS[target.kind].effect, walk.type, traffic, walk.processed).kind === "refuse") continue
      const seen = walk.nodes.indexOf(target.id)
      if (seen >= 0) {
        const loop = [...walk.nodes.slice(seen), target.id]
        cycles.set(loop.join(">"), loop)
        continue
      }
      takers.push(target)
    }
    const best = Math.min(...takers.map((target) => RANK[COMPONENTS[target.kind].effect.kind]))
    const group = takers.filter((target) => RANK[COMPONENTS[target.kind].effect.kind] === best)
    const balanced = COMPONENTS[node.kind].effect.kind === "balance"
    const live = group.filter((target) => liveReplicas(target) > 0)
    return balanced && live.length > 0 ? live : group
  }

  const sources = design.nodes.filter((node) => COMPONENTS[node.kind].effect.kind === "source")
  for (const type of REQUEST_TYPES) {
    const share = traffic.mix[type] ?? 0
    if (share <= 0) continue
    const start: Walk = {
      type,
      share,
      bots: traffic.bots,
      fan: 1,
      nodes: [],
      sync: null,
      fanFrom: null,
      holdSeconds: null,
      processed: false,
    }
    if (sources.length === 0) {
      end(start, false)
      continue
    }
    for (const source of sources) visit(source, { ...start, share: share / sources.length })
  }

  return {
    flows,
    leaves,
    unrouted: REQUEST_TYPES.filter((type) => unrouted.has(type)),
    cycles: [...cycles.values()],
  }
}
