import { route } from "../../game/studio/route.ts"
import type { ComponentKind, Design, DesignEdge, Scenario } from "../../game/studio/types.ts"

/**
 * A design as both the whiteboard and the desk draw it. The save keeps a design without positions, so both lay it out
 * the same way: left to right by distance from The Users. Nothing here imports `@xyflow/react`, so the desk can.
 */

export const GRID = 16
export const COLUMN = 224
export const ROW = 128

export type Placed = { readonly id: string; readonly kind: ComponentKind; readonly replicas: number; readonly x: number; readonly y: number }

export const snap = (v: number) => Math.round(v / GRID) * GRID

export const edgeId = (from: string, to: string) => `${from}>${to}`

/** Each node's spot on the board, by its distance from The Users; nodes nothing reaches go in one column after the rest. */
export function placeDesign(design: Design): { nodes: Placed[]; edges: DesignEdge[] } {
  const depth = new Map<string, number>()
  const queue = design.nodes.filter((n) => n.kind === "users").map((n) => n.id)
  for (const id of queue) depth.set(id, 0)
  while (queue.length > 0) {
    const id = queue.shift() as string
    for (const e of design.edges) {
      if (e.from !== id || depth.has(e.to)) continue
      depth.set(e.to, (depth.get(id) ?? 0) + 1)
      queue.push(e.to)
    }
  }
  const rows = new Map<number, number>()
  const nodes = design.nodes.map((n) => {
    const col = depth.get(n.id) ?? Math.max(0, ...depth.values()) + 1
    const row = rows.get(col) ?? 0
    rows.set(col, row + 1)
    return { id: n.id, kind: n.kind, replicas: n.replicas, x: snap(32 + col * COLUMN), y: snap(64 + row * ROW) }
  })
  const ids = new Set(nodes.map((n) => n.id))
  return { nodes, edges: design.edges.filter((e) => ids.has(e.from) && ids.has(e.to)) }
}

/** The share of the first phase's requests that crosses each edge, keyed by `edgeId`, for the traffic dots. */
export function edgeFlows(design: Design, scenario: Scenario): Record<string, number> {
  const phase = scenario.phases[0]
  const routing = route(design, { mix: phase.mix, cacheHitRate: scenario.cacheHitRate, edgeHitRate: scenario.edgeHitRate, fanout: scenario.fanout, bots: 0 })
  const flows: Record<string, number> = {}
  for (const leaf of routing.leaves) {
    for (let i = 1; i < leaf.nodes.length; i++) {
      const id = edgeId(leaf.nodes[i - 1], leaf.nodes[i])
      flows[id] = (flows[id] ?? 0) + leaf.share
    }
  }
  return flows
}
