import { laneIndex } from "../../data/studio/components.ts"
import { route } from "../../game/studio/route.ts"
import type { ComponentKind, Design, DesignEdge, Scenario } from "../../game/studio/types.ts"

/**
 * A design as the whiteboard draws it. The save keeps a design without positions, so each node goes in its lane: left to
 * right from The Users to the data.
 */

export const GRID = 16
export const COLUMN = 224
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

/** One way a request travels: the node ids from The Users to where it ends, and the share of requests that take it. */
export type TrafficPath = { readonly nodes: readonly string[]; readonly share: number }

/** Every route the first phase's requests take, one per distinct node path, for the traffic dots. */
export function leafPaths(design: Design, scenario: Scenario): TrafficPath[] {
  const routing = route(design, { features: scenario.features, cacheHitRate: scenario.cacheHitRate, edgeHitRate: scenario.edgeHitRate, fanout: scenario.fanout, bots: 0 })
  const shares = new Map<string, TrafficPath>()
  for (const leaf of routing.leaves) {
    const key = leaf.nodes.join(">")
    shares.set(key, { nodes: leaf.nodes, share: (shares.get(key)?.share ?? 0) + leaf.share })
  }
  return [...shares.values()]
}
