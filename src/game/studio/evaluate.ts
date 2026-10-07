import { COMPONENTS, FAULT_LINES } from "../../data/studio/components.ts"
import { liveReplicas, REQUEST_TYPES, route, type Routing, type Traffic } from "./route.ts"
import type { Design, DesignNode, Effect, EffectKind, NodeLoad, Phase, PhaseResult, RequestType, RunResult, Scenario } from "./types.ts"

const MINUTES_PER_MONTH = 30 * 24 * 60
/** Latency stops stretching at 95% busy; past that the node drops requests instead. */
const MAX_STRETCH_UTILIZATION = 0.95

const effectOf = (node: DesignNode): Effect => COMPONENTS[node.kind].effect

const isKind = <K extends EffectKind>(effect: Effect, kind: K): effect is Extract<Effect, { kind: K }> => effect.kind === kind

/** The effect of the first live node of a design-wide kind, such as the monitor. */
function present<K extends EffectKind>(design: Design, kind: K): Extract<Effect, { kind: K }> | null {
  for (const node of design.nodes) {
    const effect = effectOf(node)
    if (liveReplicas(node) > 0 && isKind(effect, kind)) return effect
  }
  return null
}

const isCompute = (node: DesignNode): boolean => {
  const effect = effectOf(node)
  return effect.kind === "serve" && effect.role === "compute"
}

const isDatabase = (node: DesignNode): boolean => {
  const effect = effectOf(node)
  return effect.kind === "serve" && effect.role === "database"
}

/** Ids behind a balancer, the only place where replicas back each other up. */
function frontedByBalance(design: Design): Set<string> {
  const byId = new Map(design.nodes.map((n) => [n.id, n]))
  const fronted = new Set<string>()
  for (const { from, to } of design.edges) {
    const source = byId.get(from)
    if (source && byId.has(to) && effectOf(source).kind === "balance") fronted.add(to)
  }
  return fronted
}

/** Database id to the pair uptime of a live standby wired to it, either direction. */
function failoverPairs(design: Design): Map<string, number> {
  const byId = new Map(design.nodes.map((n) => [n.id, n]))
  const pairs = new Map<string, number>()
  for (const { from, to } of design.edges) {
    for (const [db, standby] of [
      [byId.get(from), byId.get(to)],
      [byId.get(to), byId.get(from)],
    ]) {
      if (!db || !standby || !isDatabase(db) || liveReplicas(standby) === 0) continue
      const effect = effectOf(standby)
      if (isKind(effect, "failover")) pairs.set(db.id, effect.pairUptime)
    }
  }
  return pairs
}

export function costPerMonth(design: Design): number {
  const autoscale = present(design, "autoscale")
  const region = present(design, "secondRegion")
  const total = design.nodes.reduce((sum, node) => {
    const markup = autoscale && isCompute(node) ? 1 + autoscale.costMarkup : 1
    return sum + COMPONENTS[node.kind].costPerMonth * liveReplicas(node) * markup
  }, 0)
  return region ? total * 2 : total
}

function trafficOf(phase: Phase, scenario: Scenario): Traffic {
  const fault = phase.fault
  return {
    mix: phase.mix,
    cacheHitRate: fault?.kind === "flushCache" ? 0 : scenario.cacheHitRate,
    edgeHitRate: scenario.edgeHitRate,
    fanout: scenario.fanout,
    bots: fault?.kind === "botFlood" ? fault.bots : 0,
  }
}

const withReplicas = (design: Design, live: ReadonlyMap<string, number>): Design => ({
  ...design,
  nodes: design.nodes.map((node) => ({ ...node, replicas: live.get(node.id) ?? liveReplicas(node) })),
})

/** Expected uptime of the user-facing paths, weighted by the traffic each one carries. */
export function availability(design: Design, routing: Routing): { availability: number; singlePointsOfFailure: string[] } {
  const fronted = frontedByBalance(design)
  const pairs = failoverPairs(design)
  const monitor = present(design, "monitor")
  const region = present(design, "secondRegion")
  const redundant = (node: DesignNode) => pairs.has(node.id) || (fronted.has(node.id) && liveReplicas(node) >= 2)

  const uptime = new Map<string, number>()
  for (const node of design.nodes) {
    const base = COMPONENTS[node.kind].uptime
    const live = liveReplicas(node)
    const up = base === null ? 1 : live === 0 ? 0 : (pairs.get(node.id) ?? (fronted.has(node.id) ? 1 - (1 - base) ** live : base))
    uptime.set(node.id, monitor ? 1 - (1 - up) * (1 - monitor.downtimeCut) : up)
  }

  const onPath = new Set<string>()
  let weight = 0
  let up = 0
  for (const leaf of routing.leaves) {
    if (!leaf.served) continue
    const path = leaf.nodes.slice(0, leaf.sync)
    for (const id of path) onPath.add(id)
    weight += leaf.share
    up += leaf.share * path.reduce((a, id) => a * uptime.get(id)!, 1)
  }
  const single = weight > 0 ? up / weight : 0
  return {
    availability: region ? 1 - (1 - single) ** 2 : single,
    singlePointsOfFailure: design.nodes
      .filter((n) => onPath.has(n.id) && COMPONENTS[n.kind].uptime !== null && !redundant(n))
      .map((n) => n.id)
      .sort((a, b) => uptime.get(a)! - uptime.get(b)!),
  }
}

function p95(samples: { ms: number; weight: number }[]): number {
  const total = samples.reduce((a, s) => a + s.weight, 0)
  if (total <= 0) return Infinity
  const sorted = [...samples].sort((a, b) => a.ms - b.ms)
  let seen = 0
  for (const sample of sorted) {
    seen += sample.weight
    if (seen >= total * 0.95 - 1e-12) return sample.ms
  }
  return sorted[sorted.length - 1].ms
}

function runPhase(design: Design, scenario: Scenario, phase: Phase): { result: PhaseResult; cycles: Routing["cycles"] } {
  const fault = phase.fault ?? null
  const base = new Map(design.nodes.map((n) => [n.id, liveReplicas(n)]))
  const live = new Map(base)
  const fronted = frontedByBalance(design)
  const slowMs = new Map<string, number>()
  let rps = phase.rps
  let capacityBoost: (node: DesignNode) => number = () => 1
  let extraMs = 0
  let blackout = false

  switch (fault?.kind) {
    case "killReplica": {
      const victim = design.nodes.find((n) => n.kind === fault.target && (live.get(n.id) ?? 0) > 0)
      if (victim) live.set(victim.id, live.get(victim.id)! - 1)
      break
    }
    case "killDatabase": {
      const db = design.nodes.find((n) => isDatabase(n) && (live.get(n.id) ?? 0) > 0)
      if (db && !failoverPairs(design).has(db.id)) live.set(db.id, 0)
      break
    }
    case "slowDependency":
      for (const node of design.nodes) if (node.kind === fault.target) slowMs.set(node.id, fault.addedMs)
      break
    case "regionOutage": {
      const region = present(design, "secondRegion")
      if (region) extraMs = region.crossRegionMs
      else blackout = true
      break
    }
    case "spike": {
      rps *= fault.multiplier
      const multiplier = fault.multiplier
      if (present(design, "autoscale")) capacityBoost = (node) => (isCompute(node) ? multiplier : 1)
      break
    }
    case "flushCache":
    case "botFlood":
    case undefined:
      break
  }

  const routed = route(withReplicas(design, live), trafficOf(phase, scenario))
  const utilization = new Map<string, number>()
  const pinnedSurvival = new Map<string, number>()
  for (const node of design.nodes) {
    const flow = routed.flows.get(node.id)
    const spec = COMPONENTS[node.kind]
    const now = live.get(node.id)!
    const before = base.get(node.id)!
    // Without a balancer, requests still go to a dead replica and fail there.
    const pinned = now < before && now > 0 && !fronted.has(node.id)
    if (pinned) pinnedSurvival.set(node.id, now / before)
    if (!flow || flow.total <= 0) {
      utilization.set(node.id, 0)
      continue
    }
    const replicas = pinned ? before : now
    const capacity = spec.capacity === null ? (now > 0 ? Infinity : 0) : spec.capacity * replicas * capacityBoost(node)
    const writeCapacity =
      spec.writeCapacity === null
        ? capacity
        : spec.writeCapacity * (effectOf(node).kind === "shard" ? replicas : Math.min(replicas, 1))
    const ratio = (load: number, cap: number) => (load <= 0 ? 0 : cap <= 0 ? Infinity : load / cap)
    utilization.set(node.id, Math.max(ratio(flow.total * rps, capacity), ratio(flow.writes * rps, writeCapacity)))
  }

  const byId = new Map(design.nodes.map((n) => [n.id, n]))
  const syncSurvival = (id: string) => {
    const u = utilization.get(id)!
    return (u > 1 ? 1 / u : 1) * (pinnedSurvival.get(id) ?? 1)
  }
  const asyncSurvival = (id: string, hold: number) => {
    const u = utilization.get(id)!
    const backlog = (u - 1) * phase.seconds
    const kept = u > 1 ? (Number.isFinite(u) ? 1 - Math.max(0, backlog - hold) / (u * phase.seconds) : 0) : 1
    return kept * (pinnedSurvival.get(id) ?? 1)
  }
  const latencyOf = (id: string) => {
    const u = Math.min(utilization.get(id)!, MAX_STRETCH_UTILIZATION)
    return COMPONENTS[byId.get(id)!.kind].latencyMs / (1 - u) + (slowMs.get(id) ?? 0)
  }

  let success = 0
  let lag = 0
  const samples: { ms: number; weight: number }[] = []
  for (const leaf of routed.leaves) {
    if (!leaf.served || blackout) continue
    let kept = 1
    leaf.nodes.forEach((id, i) => {
      if (i < leaf.sync) {
        kept *= syncSurvival(id)
        return
      }
      const hold = leaf.holdSeconds ?? 0
      kept *= asyncSurvival(id, hold)
      const u = utilization.get(id)!
      if (u > 1) lag = Math.max(lag, Math.min((u - 1) * phase.seconds, hold))
    })
    success += leaf.share * kept
    if (kept <= 0) continue
    const breaker = leaf.nodes.findIndex((id, i) => i < leaf.sync && effectOf(byId.get(id)!).kind === "breakCircuit")
    let before = 0
    let after = 0
    for (let i = 0; i < leaf.sync; i++) {
      const ms = latencyOf(leaf.nodes[i]) * (leaf.fanFrom !== null && i >= leaf.fanFrom ? scenario.fanout : 1)
      if (breaker >= 0 && i > breaker) after += ms
      else before += ms
    }
    const breakerEffect = breaker >= 0 ? effectOf(byId.get(leaf.nodes[breaker])!) : null
    const cap = breakerEffect && isKind(breakerEffect, "breakCircuit") ? breakerEffect.timeoutMs : Infinity
    samples.push({ ms: before + Math.min(after, cap) + extraMs, weight: leaf.share * kept })
  }

  const hot: NodeLoad[] = design.nodes
    .filter((n) => (routed.flows.get(n.id)?.total ?? 0) > 0 && COMPONENTS[n.kind].capacity !== null)
    .map((n) => ({ id: n.id, utilization: utilization.get(n.id)! }))
    .sort((a, b) => b.utilization - a.utilization)

  const result: PhaseResult = {
    name: phase.name,
    fault,
    line: fault ? FAULT_LINES[fault.kind] : null,
    successRate: blackout ? 0 : success,
    p95Ms: blackout ? Infinity : p95(samples),
    lagSeconds: lag,
    hot,
    down: blackout ? design.nodes.map((n) => n.id) : design.nodes.filter((n) => live.get(n.id) === 0).map((n) => n.id),
    unrouted: routed.unrouted,
  }
  return { result, cycles: routed.cycles }
}

export function evaluate(design: Design, scenario: Scenario): RunResult {
  const runs = scenario.phases.map((phase) => runPhase(design, scenario, phase))
  const phases = runs.map((run) => run.result)
  const calm = phases.filter((p) => p.fault === null)
  const faulted = phases.filter((p) => p.fault !== null)
  const baseRouting = route(design, trafficOf({ ...scenario.phases[0], fault: undefined }, scenario))
  const { availability: uptime, singlePointsOfFailure } = availability(design, baseRouting)
  const worst = phases.reduce((a, b) => (b.successRate < a.successRate ? b : a))
  const cycles = new Map(runs.flatMap((run) => run.cycles).map((cycle) => [cycle.join(">"), cycle]))
  const unrouted = new Set<RequestType>(phases.flatMap((p) => p.unrouted))

  return {
    phases,
    successRate: Math.min(1, ...calm.map((p) => p.successRate)),
    p95Ms: Math.max(0, ...calm.map((p) => p.p95Ms)),
    lagSeconds: Math.max(0, ...calm.map((p) => p.lagSeconds)),
    faultSuccessRate: Math.min(1, ...faulted.map((p) => p.successRate)),
    availability: uptime,
    downtimeMinutesPerMonth: (1 - uptime) * MINUTES_PER_MONTH,
    costPerMonth: costPerMonth(design),
    hot: worst.hot,
    singlePointsOfFailure,
    unrouted: REQUEST_TYPES.filter((type) => unrouted.has(type)),
    cycles: [...cycles.values()],
  }
}
