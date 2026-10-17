import { laneIndex } from "../../data/studio/components.ts"
import { evaluate, trafficOf } from "../../game/studio/evaluate.ts"
import { route } from "../../game/studio/route.ts"
import type { ComponentKind, Design, DesignEdge, Scenario } from "../../game/studio/types.ts"

/**
 * A design as the whiteboard draws it: an N by N grid of square cells, one piece per cell. The save keeps a design
 * without positions, so each node starts in the column of its role (The Users at the left, the data at the right) and
 * the first free row down it.
 */

/** Cells on a side of the grid. */
export const N = 6
/** One cell, in board pixels; a piece is a `TILE` square centred in its cell. */
export const CELL = 120
export const TILE = 96
export const GRID = 16

export type Cell = { readonly col: number; readonly row: number }

const clamp = (v: number) => Math.max(0, Math.min(N - 1, v))

/** The cell a board position (a piece's top-left corner) falls in. */
export const cellAt = (x: number, y: number): Cell => ({ col: clamp(Math.round(x / CELL)), row: clamp(Math.round(y / CELL)) })

/** The board position of a piece in a cell. */
export const positionOf = (cell: Cell) => ({ x: cell.col * CELL + (CELL - TILE) / 2, y: cell.row * CELL + (CELL - TILE) / 2 })

/** The cell a piece sits in, from its board position. */
export const cellOf = (position: { x: number; y: number }): Cell => cellAt(position.x - (CELL - TILE) / 2, position.y - (CELL - TILE) / 2)

export const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row

/** The free cell nearest `want`, scanning its column first, then outward by distance. Null when the grid is full. */
export function freeCell(want: Cell, taken: readonly Cell[]): Cell | null {
  const all: Cell[] = []
  for (let col = 0; col < N; col++) for (let row = 0; row < N; row++) all.push({ col, row })
  const free = all.filter((cell) => !taken.some((t) => sameCell(t, cell)))
  const dist = (c: Cell) => Math.abs(c.col - want.col) * 2 + Math.abs(c.row - want.row)
  return free.sort((a, b) => dist(a) - dist(b))[0] ?? null
}

type Placed = { readonly id: string; readonly kind: ComponentKind; readonly replicas: number; readonly x: number; readonly y: number }

export const edgeId = (from: string, to: string) => `${from}>${to}`

export function placeDesign(design: Design): { nodes: Placed[]; edges: DesignEdge[] } {
  const taken: Cell[] = []
  const nodes = design.nodes.map((n) => {
    const cell = freeCell({ col: laneIndex(n.kind), row: 1 }, taken) ?? { col: 0, row: 0 }
    taken.push(cell)
    return { id: n.id, kind: n.kind, replicas: n.replicas, ...positionOf(cell) }
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
