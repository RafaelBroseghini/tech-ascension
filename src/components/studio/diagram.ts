import { route } from "../../game/studio/route.ts"
import type { ComponentKind, Design, DesignEdge, Scenario } from "../../game/studio/types.ts"

/**
 * A design as the whiteboard draws it. The save keeps a design without positions, so each node goes in a cell: left to
 * right by distance from The Users.
 */

export const GRID = 16
const COLUMN = 224
const ROW = 128

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
    return { id: n.id, kind: n.kind, replicas: n.replicas, col, row, x: snap(32 + col * COLUMN), y: snap(64 + row * ROW) }
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
