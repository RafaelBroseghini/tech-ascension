import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react"
import type { Connection, Edge, EdgeChange, Node, NodeChange, XYPosition } from "@xyflow/react"
import { create } from "zustand"
import type { Interview } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { evaluate } from "../../game/studio/evaluate.ts"
import { THE_USERS_ALONE } from "../../game/studio/interviews.ts"
import type { Verdict } from "../../game/studio/score.ts"
import type { ComponentKind, Design, RunResult } from "../../game/studio/types.ts"
import { edgeId, leafPaths, placeDesign, snap } from "./diagram.ts"
import type { TrafficPath } from "./diagram.ts"

export type NodeData = { readonly kind: ComponentKind; readonly replicas: number }
export type BoardNode = Node<NodeData, "component">
export type BoardEdge = Edge

export const REVEAL_MS = 2500

/** One submission as the board shows it. Heat and the traffic only apply while the board is still the one sent. */
export interface Run {
  readonly verdict: Verdict
  /** A rerun of a passed interview: it judges the board against the targets and changes nothing in the career. */
  readonly practice: boolean
  /** A practice run that beat the best on record. */
  readonly newBest: boolean
  /** Spendable XP the No hire took. */
  readonly penalty: number
  readonly result: RunResult
  /** The board that was sent, so the report can name its nodes after the board changes. */
  readonly design: Design
  /** The routes the first phase's requests take, from The Users down, for the traffic dots. */
  readonly paths: readonly TrafficPath[]
  /** The interview's p95 target, which sets how fast the dots travel against `result.p95Ms`. */
  readonly targetP95Ms: number
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

const nodeOf = (id: string, kind: ComponentKind, replicas: number, position: XYPosition): BoardNode => ({
  id,
  type: "component",
  position: { x: snap(position.x), y: snap(position.y) },
  data: { kind, replicas },
  deletable: kind !== "users",
})

const edgeOf = (source: string, target: string): BoardEdge => ({ id: edgeId(source, target), source, target, type: "smoothstep" })

/** A board seeded from a saved submission, laid out the way the desk draws it. */
export function layout(design: Design): Pick<Sheet, "nodes" | "edges"> {
  const placed = placeDesign(design)
  return {
    nodes: placed.nodes.map((n) => nodeOf(n.id, n.kind, n.replicas, n)),
    edges: placed.edges.map((e) => edgeOf(e.from, e.to)),
  }
}

/** Shows `interviewId`'s sheet, starting it from `seed` (the last submission) or from The Users alone. */
export function showInterview(interviewId: string, seed: Design | null): void {
  useBoard.setState((s) => {
    if (s.interviewId === interviewId) return s
    const sheets = s.interviewId ? { ...s.sheets, [s.interviewId]: { nodes: s.nodes, edges: s.edges, edits: s.edits, run: s.run } } : s.sheets
    const kept = sheets[interviewId]
    const edits = nextEdit()
    if (!kept) return { interviewId, sheets, ...layout(seed && seed.nodes.length > 0 ? seed : THE_USERS_ALONE), edits, run: null }
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

type Judged = Pick<Run, "verdict" | "result" | "practice" | "newBest" | "penalty">

function startRun(interview: Interview, design: Design, judged: Judged): void {
  const run: Omit<Run, "edits" | "startedAt" | "revealing"> = {
    ...judged,
    design,
    paths: leafPaths(design, interview.scenario),
    targetP95Ms: interview.targets.p95Ms,
  }
  useBoard.setState((s) => ({ run: { ...run, edits: s.edits, startedAt: performance.now(), revealing: true } }))
}

/** Sends the board to the interviewer once, then plays the traffic reveal over the result. */
export function submitBoard(interview: Interview): void {
  const design = draftOf(useBoard.getState())
  const verdict = useGame.getState().submitWhiteboard(interview.id, design)
  if (!verdict) return
  const penalty = useGame.getState().lastInterview?.penalty ?? 0
  startRun(interview, design, { verdict, result: evaluate(design, interview.scenario), practice: false, newBest: false, penalty })
}

/** Reruns a passed interview against its targets and plays the same reveal. Nothing in the career changes. */
export function practiceBoard(interview: Interview): void {
  const design = draftOf(useBoard.getState())
  const run = useGame.getState().practiceWhiteboard(interview.id, design)
  if (!run) return
  startRun(interview, design, { verdict: run.verdict, result: run.result, practice: true, newBest: run.newBest, penalty: 0 })
}

export function endReveal(): void {
  useBoard.setState((s) => (s.run?.revealing ? { run: { ...s.run, revealing: false } } : s))
}

/** The run, while the board on screen is still the one it judged. */
export const currentRun = (s: BoardState): Run | null => (s.run && s.run.edits === s.edits ? s.run : null)
