import { laneIndex } from "../../data/studio/components.ts"
import { evaluate, trafficOf } from "../../game/studio/evaluate.ts"
import { route } from "../../game/studio/route.ts"
import type { ComponentKind, Design, DesignEdge, Scenario } from "../../game/studio/types.ts"

/**
 * A design as the whiteboard draws it. The save keeps a design without positions, so each node goes in its lane: left to
 * right from The Users to the data.
 */

export const GRID = 16
export const COLUMN = 208
export const ROW = 128

/** `col` and `row` are the node's cell; `x` and `y` are its board position, one `COLUMN` by `ROW` per cell. */
type Placed = {
  readonly id: string
  readonly kind: ComponentKind
  readonly replicas: number
  readonly col: number
  readonly row: number
  readonly x: number
  readonly y: number
}

export const snap = (v: number) => Math.round(v / GRID) * GRID

export const edgeId = (from: string, to: string) => `${from}>${to}`

/** The x of a lane's column: one `COLUMN` per lane, so a piece's lane is readable from where it sits. */
export const laneX = (kind: ComponentKind): number => snap(32 + laneIndex(kind) * COLUMN)

/** Each node's spot on the board: its lane's column, and the first free row down it in the design's order. */
export function placeDesign(design: Design): { nodes: Placed[]; edges: DesignEdge[] } {
  const rows = new Map<number, number>()
  const nodes = design.nodes.map((n) => {
    const col = laneIndex(n.kind)
    const row = rows.get(col) ?? 0
    rows.set(col, row + 1)
    return { id: n.id, kind: n.kind, replicas: n.replicas, col, row, x: laneX(n.kind), y: snap(64 + row * ROW) }
  })
  const ids = new Set(nodes.map((n) => n.id))
  return { nodes, edges: design.edges.filter((e) => ids.has(e.from) && ids.has(e.to)) }
}

/**
 * One way a request travels: the node ids from The Users to where it ends, and the share of requests that take it.
 * `dies` is where part of them stop: the index in `nodes` of the node that drops them, and the share of this path's
 * requests it drops. A path nothing answers dies at its last node.
 */
export type TrafficPath = {
  readonly nodes: readonly string[]
  readonly share: number
  readonly dies: { readonly at: number; readonly share: number } | null
}

/** Every route the first phase's requests take, one per distinct node path, for the traffic dots. */
export function leafPaths(design: Design, scenario: Scenario): TrafficPath[] {
  const phase = scenario.phases[0]
  const calm: Scenario = { ...scenario, phases: [{ ...phase, fault: undefined }] }
  const routing = route(design, trafficOf(calm.phases[0], calm))
  const busy = new Map(evaluate(design, calm).phases[0].hot.map((node) => [node.id, node.utilization]))
  const merged = new Map<string, { nodes: readonly string[]; share: number; dead: number; at: number }>()
  for (const leaf of routing.leaves) {
    const key = leaf.nodes.join(">")
    const sync = leaf.nodes.slice(0, leaf.sync)
    const survive = leaf.served ? sync.reduce((kept, id) => kept * Math.min(1, 1 / Math.max(1, busy.get(id) ?? 0)), 1) : 0
    const first = leaf.served ? sync.findIndex((id) => (busy.get(id) ?? 0) > 1) : leaf.nodes.length - 1
    const row = merged.get(key) ?? { nodes: leaf.nodes, share: 0, dead: 0, at: Infinity }
    row.share += leaf.share
    row.dead += leaf.share * (1 - survive)
    if (survive < 1) row.at = Math.min(row.at, Math.max(0, first))
    merged.set(key, row)
  }
  return [...merged.values()].map((row) => ({
    nodes: row.nodes,
    share: row.share,
    dies: row.dead > 1e-9 ? { at: row.at, share: Math.min(1, row.dead / row.share) } : null,
  }))
}
