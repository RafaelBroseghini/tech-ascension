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

export type Consistency = "strong" | "eventual"

/** What users do, as a user story. Functional requirements are the unit of traffic: the router walks once per feature. */
export interface Feature {
  readonly id: string
  /** A user story in plain words: "A shopper checks out". */
  readonly story: string
  readonly request: RequestType
  /** Share of all requests, summing to 1 across the scenario's features. */
  readonly share: number
  /** A strong read must come from the primary: caches, CDNs and replicas refuse it. */
  readonly consistency: Consistency
  /** Must land in sql, kv or blob. A queue alone does not count until a worker stores it. */
  readonly durable: boolean
  /** May finish after the response, through a queue. A feature that isn't async can't be queued. */
  readonly async: boolean
}

export interface Phase {
  readonly name: string
  readonly seconds: number
  readonly rps: number
  readonly fault?: Fault
}

export interface Scenario {
  readonly phases: readonly [Phase, ...Phase[]]
  /** The same features in every phase: a fault changes what the design survives, never what users do. */
  readonly features: readonly [Feature, ...Feature[]]
  /**
   * Share of the reads that reach a cache and find their answer there. This is the rate after writes invalidate
   * entries, so the router adds no write discount of its own.
   */
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
export type TargetName = "budget" | "success" | "p95" | "lag" | "availability" | "faults" | "features"

/** Share of one feature's requests answered correctly. */
export interface FeatureServed {
  readonly id: string
  readonly story: string
  readonly served: number
}

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
  /** The features whose requests reach a node with nowhere to send them. */
  readonly unroutedFeatures: readonly string[]
  readonly features: readonly FeatureServed[]
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
  readonly unroutedFeatures: readonly string[]
  /** Each feature's share answered correctly in the worst phase without a fault. */
  readonly features: readonly FeatureServed[]
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
