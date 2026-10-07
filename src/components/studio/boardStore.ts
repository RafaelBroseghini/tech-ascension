import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react"
import type { Connection, Edge, EdgeChange, Node, NodeChange, XYPosition } from "@xyflow/react"
import { create } from "zustand"
import type { Interview } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { evaluate } from "../../game/studio/evaluate.ts"
import { route } from "../../game/studio/route.ts"
import type { Verdict } from "../../game/studio/score.ts"
import type { ComponentKind, Design, RunResult, Scenario } from "../../game/studio/types.ts"

export type NodeData = { readonly kind: ComponentKind; readonly replicas: number }
export type BoardNode = Node<NodeData, "component">
export type BoardEdge = Edge

export const GRID = 16
export const REVEAL_MS = 2500

/** One submission as the board shows it. Heat and the traffic only apply while the board is still the one sent. */
export interface Run {
  readonly verdict: Verdict
  /** Spendable XP the No hire took. */
  readonly penalty: number
  readonly result: RunResult
  /** Edge id to the share of requests that cross it in the first phase. */
  readonly flows: Readonly<Record<string, number>>
  /** `edits` when it was sent. */
  readonly edits: number
  readonly startedAt: number
  readonly revealing: boolean
}

interface Sheet {
  readonly nodes: BoardNode[]
  readonly edges: BoardEdge[]
  /** The design's version: unique across every sheet, so one number names one design. Moves keep it. */
  readonly edits: number
  readonly run: Run | null
}

interface BoardState extends Sheet {
  readonly interviewId: string | null
  /** Every interview's sheet, kept while another one is on the board and across closing the whiteboard. */
  readonly sheets: Readonly<Record<string, Sheet>>
}

export const useBoard = create<BoardState>(() => ({ interviewId: null, nodes: [], edges: [], edits: 0, run: null, sheets: {} }))

let version = 0
const nextEdit = () => ++version

const snap = (v: number) => Math.round(v / GRID) * GRID

const nodeOf = (id: string, kind: ComponentKind, replicas: number, position: XYPosition): BoardNode => ({
  id,
  type: "component",
  position: { x: snap(position.x), y: snap(position.y) },
  data: { kind, replicas },
  deletable: kind !== "users",
})

const edgeOf = (source: string, target: string): BoardEdge => ({ id: `${source}>${target}`, source, target, type: "smoothstep" })

/** Lays a design out left to right by its distance from The Users, for a board seeded from a saved submission. */
export function layout(design: Design): Pick<Sheet, "nodes" | "edges"> {
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
    return nodeOf(n.id, n.kind, n.replicas, { x: 32 + col * 224, y: 64 + row * 128 })
  })
  const ids = new Set(nodes.map((n) => n.id))
  const edges = design.edges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => edgeOf(e.from, e.to))
  return { nodes, edges }
}

const EMPTY: Design = { nodes: [{ id: "users", kind: "users", replicas: 1 }], edges: [] }

/** Shows `interviewId`'s sheet, starting it from `seed` (the last submission) or from The Users alone. */
export function showInterview(interviewId: string, seed: Design | null): void {
  useBoard.setState((s) => {
    if (s.interviewId === interviewId) return s
    const sheets = s.interviewId ? { ...s.sheets, [s.interviewId]: { nodes: s.nodes, edges: s.edges, edits: s.edits, run: s.run } } : s.sheets
    const kept = sheets[interviewId]
    const edits = nextEdit()
    if (!kept) return { interviewId, sheets, ...layout(seed && seed.nodes.length > 0 ? seed : EMPTY), edits, run: null }
    const run = kept.run && kept.run.edits === kept.edits ? { ...kept.run, edits } : kept.run
    return { interviewId, sheets, nodes: kept.nodes, edges: kept.edges, edits, run }
  })
}

export const designOf = (nodes: readonly BoardNode[], edges: readonly BoardEdge[]): Design => ({
  nodes: nodes.map((n) => ({ id: n.id, kind: n.data.kind, replicas: n.data.replicas })),
  edges: edges.map((e) => ({ from: e.source, to: e.target })),
})

let draft: { edits: number; design: Design } | null = null

/** The design on the board, as one object per edit: a move or a selection returns the same one. */
export function draftOf(s: BoardState): Design {
  if (draft?.edits !== s.edits) draft = { edits: s.edits, design: designOf(s.nodes, s.edges) }
  return draft.design
}

/** Moves and selection keep the run on screen; anything that changes the design counts as an edit. */
export function onNodesChange(changes: NodeChange<BoardNode>[]): void {
  const edit = changes.some((c) => c.type === "remove" || c.type === "add" || c.type === "replace")
  useBoard.setState((s) => ({ nodes: applyNodeChanges(changes, s.nodes), edits: edit ? nextEdit() : s.edits }))
}

export function onEdgesChange(changes: EdgeChange<BoardEdge>[]): void {
  const edit = changes.some((c) => c.type === "remove" || c.type === "add" || c.type === "replace")
  useBoard.setState((s) => ({ edges: applyEdgeChanges(changes, s.edges), edits: edit ? nextEdit() : s.edits }))
}

export function canConnect(c: Pick<Connection, "source" | "target">): boolean {
  const { nodes, edges } = useBoard.getState()
  if (!c.source || !c.target || c.source === c.target) return false
  if (nodes.find((n) => n.id === c.target)?.data.kind === "users") return false
  return !edges.some((e) => e.source === c.source && e.target === c.target)
}

export function onConnect(c: Connection): void {
  if (!canConnect(c)) return
  useBoard.setState((s) => ({ edges: [...s.edges, edgeOf(c.source, c.target)], edits: nextEdit() }))
}

export function addNode(kind: ComponentKind, at: XYPosition): string {
  const { nodes } = useBoard.getState()
  let n = 1
  while (nodes.some((node) => node.id === `${kind}-${n}`)) n++
  const id = `${kind}-${n}`
  useBoard.setState((s) => ({
    nodes: [...s.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)), { ...nodeOf(id, kind, 1, at), selected: true }],
    edits: nextEdit(),
  }))
  return id
}

export const MAX_REPLICAS = 99

export function setReplicas(id: string, replicas: number): void {
  const next = Math.max(1, Math.min(MAX_REPLICAS, Math.floor(replicas)))
  useBoard.setState((s) => ({
    nodes: s.nodes.map((n) => (n.id === id && n.data.replicas !== next ? { ...n, data: { ...n.data, replicas: next } } : n)),
    edits: nextEdit(),
  }))
}

export function removeNode(id: string): void {
  useBoard.setState((s) => {
    if (s.nodes.find((n) => n.id === id)?.data.kind === "users") return s
    return {
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      edits: nextEdit(),
    }
  })
}

/** The share of the first phase's requests that crosses each edge, for the traffic dots. */
export function edgeFlows(design: Design, scenario: Scenario): Record<string, number> {
  const phase = scenario.phases[0]
  const routing = route(design, { mix: phase.mix, cacheHitRate: scenario.cacheHitRate, edgeHitRate: scenario.edgeHitRate, fanout: scenario.fanout, bots: 0 })
  const flows: Record<string, number> = {}
  for (const leaf of routing.leaves) {
    for (let i = 1; i < leaf.nodes.length; i++) {
      const id = `${leaf.nodes[i - 1]}>${leaf.nodes[i]}`
      flows[id] = (flows[id] ?? 0) + leaf.share
    }
  }
  return flows
}

export function startRun(run: Omit<Run, "edits" | "startedAt" | "revealing">): void {
  useBoard.setState((s) => ({ run: { ...run, edits: s.edits, startedAt: performance.now(), revealing: true } }))
}

/** Sends the board to the interviewer once, then plays the traffic reveal over the result. */
export function submitBoard(interview: Interview): void {
  const design = draftOf(useBoard.getState())
  const verdict = useGame.getState().submitWhiteboard(interview.id, design)
  if (!verdict) return
  const penalty = useGame.getState().lastInterview?.penalty ?? 0
  startRun({ verdict, penalty, result: evaluate(design, interview.scenario), flows: edgeFlows(design, interview.scenario) })
}

export function endReveal(): void {
  useBoard.setState((s) => (s.run?.revealing ? { run: { ...s.run, revealing: false } } : s))
}

/** The run, while the board on screen is still the one it judged. */
export const currentRun = (s: BoardState): Run | null => (s.run && s.run.edits === s.edits ? s.run : null)
