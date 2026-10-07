export type ComponentKind =
  | "users"
  | "api"
  | "sql"
  | "lb"
  | "cache"
  | "replica"
  | "standby"
  | "cdn"
  | "blob"
  | "queue"
  | "worker"
  | "kv"
  | "socket"
  | "bouncer"
  | "autoscaler"
  | "breaker"
  | "region"
  | "oncall"

export type RequestType = "read" | "write" | "static" | "fanout" | "message" | "upload"

/** One mechanic per component. `route` switches on it once; `PRIORITY` ranks it as a next hop. */
export type Effect =
  | { readonly kind: "source" }
  | { readonly kind: "serve"; readonly role: "compute" | "database" }
  | { readonly kind: "balance" }
  | { readonly kind: "cacheHits" }
  | { readonly kind: "replicateReads" }
  | { readonly kind: "failover"; readonly pairUptime: number }
  | { readonly kind: "edgeHits"; readonly staticHitRate: number }
  | { readonly kind: "store" }
  | { readonly kind: "buffer"; readonly holdSeconds: number }
  | { readonly kind: "consume" }
  | { readonly kind: "shard" }
  | { readonly kind: "holdConnections" }
  | { readonly kind: "rateLimit" }
  | { readonly kind: "autoscale"; readonly costMarkup: number }
  | { readonly kind: "breakCircuit"; readonly timeoutMs: number }
  | { readonly kind: "secondRegion"; readonly crossRegionMs: number }
  | { readonly kind: "monitor"; readonly downtimeCut: number }

export type EffectKind = Effect["kind"]

/** `null` capacity means the component never saturates; `null` uptime means it never fails on its own. */
export interface Component {
  readonly name: string
  readonly goal: string
  readonly capacity: number | null
  /** Writes per second for one replica, when lower than `capacity`. Only `shard` multiplies it by replicas. */
  readonly writeCapacity: number | null
  readonly latencyMs: number
  readonly costPerMonth: number
  readonly uptime: number | null
  readonly effect: Effect
}

export interface DesignNode {
  readonly id: string
  readonly kind: ComponentKind
  /** Typed by the player; anything below 1 is a node that is down. */
  readonly replicas: number
}

export interface DesignEdge {
  readonly from: string
  readonly to: string
}

export interface Design {
  readonly nodes: readonly DesignNode[]
  readonly edges: readonly DesignEdge[]
}

export type Fault =
  | { readonly kind: "killReplica"; readonly target: ComponentKind }
  | { readonly kind: "killDatabase" }
  | { readonly kind: "flushCache" }
  | { readonly kind: "slowDependency"; readonly target: ComponentKind; readonly addedMs: number }
  | { readonly kind: "regionOutage" }
  | { readonly kind: "spike"; readonly multiplier: number }
  /** `bots` is bot traffic as a multiple of real traffic. */
  | { readonly kind: "botFlood"; readonly bots: number }

export type Mix = Readonly<Partial<Record<RequestType, number>>>

export interface Phase {
  readonly name: string
  readonly seconds: number
  readonly rps: number
  readonly mix: Mix
  readonly fault?: Fault
}

export interface Scenario {
  readonly phases: readonly [Phase, ...Phase[]]
  readonly cacheHitRate: number
  readonly edgeHitRate: number
  /** Timeline writes one `fanout` request turns into. */
  readonly fanout: number
}

export interface Targets {
  readonly successRate: number
  readonly p95Ms: number
  readonly maxLagSeconds: number
  readonly availability: number
  readonly budgetPerMonth: number
}

/** `faults` is `successRate` measured in the phases that carry a fault. */
export type TargetName = "budget" | "success" | "p95" | "lag" | "availability" | "faults"

export interface NodeLoad {
  readonly id: string
  /** Busy share of capacity. `Infinity` for a node that is down and still sent traffic. */
  readonly utilization: number
}

export interface PhaseResult {
  readonly name: string
  readonly fault: Fault | null
  /** The run log line for the fault, from `FAULT_LINES`. */
  readonly line: string | null
  readonly successRate: number
  readonly p95Ms: number
  readonly lagSeconds: number
  /** Busiest first. */
  readonly hot: readonly NodeLoad[]
  readonly down: readonly string[]
  readonly unrouted: readonly RequestType[]
}

export interface RunResult {
  readonly phases: readonly PhaseResult[]
  /** Worst phase without a fault. Phases with a fault only answer to `successRate`, as `faultSuccessRate`. */
  readonly successRate: number
  readonly p95Ms: number
  readonly lagSeconds: number
  /** Worst phase with a fault; 1 when the scenario has none. */
  readonly faultSuccessRate: number
  readonly availability: number
  readonly downtimeMinutesPerMonth: number
  readonly costPerMonth: number
  /** From the worst phase. */
  readonly hot: readonly NodeLoad[]
  /** Least reliable first. */
  readonly singlePointsOfFailure: readonly string[]
  readonly unrouted: readonly RequestType[]
  /** Each loop in the edges, as node ids from the first repeated node back to it. */
  readonly cycles: readonly (readonly string[])[]
}

export interface NaiveDesign {
  readonly name: string
  readonly design: Design
  readonly fails: TargetName
}

export interface Challenge {
  readonly id: string
  readonly name: string
  readonly scenario: Scenario
  readonly targets: Targets
  readonly reference: Design
  readonly naive: readonly [NaiveDesign, NaiveDesign, ...NaiveDesign[]]
}
