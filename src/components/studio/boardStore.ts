import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react"
import type { Connection, Edge, EdgeChange, Node, NodeChange, XYPosition } from "@xyflow/react"
import { create } from "zustand"
import type { Interview } from "../../data/studio/challenges.ts"
import { refusal } from "../../data/studio/components.ts"
import { useGame } from "../../game/store.ts"
import { evaluate } from "../../game/studio/evaluate.ts"
import { interviewById, startDesign } from "../../game/studio/interviews.ts"
import type { Offer } from "../../game/studio/interviews.ts"
import { starsOf } from "../../game/studio/score.ts"
import type { Stars, Verdict } from "../../game/studio/score.ts"
import type { ComponentKind, Design, RunResult } from "../../game/studio/types.ts"
import { cellAt, cellOf, edgeId, freeCell, leafPaths, placeDesign, positionOf, sameCell } from "./diagram.ts"
import type { Cell } from "./diagram.ts"
import { trayLimit } from "./kinds.ts"
import type { TrafficPath } from "./diagram.ts"

export type NodeData = {
  readonly kind: ComponentKind
  readonly replicas: number
  /** Placed by the interview: it cannot be removed. */
  readonly locked?: boolean
}
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
  /** The offer a real pass earned; null for a No hire and for practice. */
  readonly offer: Offer | null
  /** Stars this run earned. */
  readonly stars: Stars
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

/** Free traffic on the current draft: facts only, so it carries no verdict. */
export interface Demo {
  readonly paths: readonly TrafficPath[]
  readonly p95Ms: number
  readonly targetP95Ms: number
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
  /** Why the last wire was refused, until the next edit or a few seconds pass. */
  readonly notice: string | null
  /** The last Run traffic on this board. */
  readonly demo: Demo | null
  /** The engineers' board is on screen, read-only; `stash` holds the player's own board until they go back. */
  readonly studying: boolean
  readonly stash: Pick<Sheet, "nodes" | "edges" | "edits" | "run"> | null
  /** Every interview's sheet, kept while another one is on the board and across closing the whiteboard. */
  readonly sheets: Readonly<Record<string, Sheet>>
}

export const useBoard = create<BoardState>(() => ({ interviewId: null, notice: null, demo: null, studying: false, stash: null, nodes: [], edges: [], edits: 0, run: null, sheets: {} }))

let version = 0
const nextEdit = () => ++version

const nodeOf = (id: string, kind: ComponentKind, replicas: number, position: XYPosition, locked = false): BoardNode => ({
  id,
  type: "component",
  position: positionOf(cellAt(position.x, position.y)),
  data: locked ? { kind, replicas, locked } : { kind, replicas },
  deletable: kind !== "users" && !locked,
})

const edgeOf = (source: string, target: string): BoardEdge => ({ id: edgeId(source, target), source, target, type: "smoothstep" })

/** A board seeded from a saved submission, laid out the way the desk draws it. */
export function layout(design: Design, locked: ReadonlySet<string> = new Set()): Pick<Sheet, "nodes" | "edges"> {
  const placed = placeDesign(design)
  return {
    nodes: placed.nodes.map((n) => nodeOf(n.id, n.kind, n.replicas, n, locked.has(n.id))),
    edges: placed.edges.map((e) => edgeOf(e.from, e.to)),
  }
}

/** Shows `interviewId`'s sheet, starting it from `seed` (the last submission) or from The Users and the locked pieces. */
export function showInterview(interviewId: string, seed: Design | null): void {
  const interview = interviewById(interviewId)
  const locked = new Set(interview?.locked.map((n) => n.id))
  useBoard.setState((current) => {
    if (current.interviewId === interviewId) return current
    // Leaving for another interview puts the player's own board back first.
    const s = current.studying && current.stash ? { ...current, ...current.stash } : current
    const sheets = s.interviewId ? { ...s.sheets, [s.interviewId]: { nodes: s.nodes, edges: s.edges, edits: s.edits, run: s.run } } : s.sheets
    const kept = sheets[interviewId]
    const edits = nextEdit()
    const start = interview ? startDesign(interview) : { nodes: [], edges: [] }
    const fresh = { interviewId, sheets, notice: null, demo: null, studying: false, stash: null, edits }
    if (!kept) return { ...fresh, ...layout(seed && seed.nodes.length > 0 ? seed : start, locked), run: null }
    const run = kept.run && kept.run.edits === kept.edits ? { ...kept.run, edits } : kept.run
    return { ...fresh, nodes: kept.nodes, edges: kept.edges, run }
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
  useBoard.setState((s) => {
    // A piece jumps from cell to cell and never lands on another piece.
    const kept = changes.flatMap((c) => {
      if (c.type !== "position" || !c.position) return [c]
      const cell = cellAt(c.position.x, c.position.y)
      const blocked = s.nodes.some((n) => n.id !== c.id && sameCell(cellOf(n.position), cell))
      return blocked ? [] : [{ ...c, position: positionOf(cell) }]
    })
    return { nodes: applyNodeChanges(kept, s.nodes), edits: edit ? nextEdit() : s.edits, notice: edit ? null : s.notice }
  })
}

export function onEdgesChange(changes: EdgeChange<BoardEdge>[]): void {
  const edit = changes.some((c) => c.type === "remove" || c.type === "add" || c.type === "replace")
  useBoard.setState((s) => ({ edges: applyEdgeChanges(changes, s.edges), edits: edit ? nextEdit() : s.edits }))
}

/** Why a wire is refused, in one line; null when the table allows it and the board does not have it yet. */
export function connectRefusal(c: Pick<Connection, "source" | "target">): string | null {
  const { nodes } = useBoard.getState()
  if (!c.source || !c.target || c.source === c.target) return null
  const from = nodes.find((n) => n.id === c.source)?.data.kind
  const to = nodes.find((n) => n.id === c.target)?.data.kind
  if (!from || !to) return null
  return refusal(from, to)
}

export function canConnect(c: Pick<Connection, "source" | "target">): boolean {
  const { edges } = useBoard.getState()
  if (!c.source || !c.target || c.source === c.target) return false
  if (connectRefusal(c) !== null) return false
  return !edges.some((e) => e.source === c.source && e.target === c.target)
}

/** Says why a dropped wire was refused. A wire that fell on empty canvas, or that the board already has, says nothing. */
export function explainRefusal(c: Pick<Connection, "source" | "target">): void {
  const notice = connectRefusal(c)
  if (notice) useBoard.setState({ notice })
}

export const clearNotice = (): void => useBoard.setState({ notice: null })

export function onConnect(c: Connection): void {
  if (!canConnect(c)) return
  useBoard.setState((s) => ({ edges: [...s.edges, edgeOf(c.source, c.target)], edits: nextEdit(), notice: null }))
}

/** How many more of `kind` this board takes: the tray's count for the interview, less what is placed. */
export function piecesLeft(s: Pick<BoardState, "interviewId" | "nodes">, kind: ComponentKind): number {
  const interview = s.interviewId ? interviewById(s.interviewId) : undefined
  if (!interview) return Infinity
  return trayLimit(interview, kind) - s.nodes.filter((n) => n.data.kind === kind).length
}

/** Drops a piece into the free cell nearest `at`, or the column of its role when `at` is taken. Null when the tray has none left or the grid is full. */
export function addNode(kind: ComponentKind, at: XYPosition): string | null {
  const state = useBoard.getState()
  if (piecesLeft(state, kind) <= 0) return null
  const { nodes } = state
  const cell = freeCell(cellAt(at.x, at.y), nodes.map((n) => cellOf(n.position)) as Cell[])
  if (!cell) return null
  let n = 1
  while (nodes.some((node) => node.id === `${kind}-${n}`)) n++
  const id = `${kind}-${n}`
  useBoard.setState((s) => ({
    nodes: [...s.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)), { ...nodeOf(id, kind, 1, positionOf(cell)), selected: true }],
    edits: nextEdit(),
    notice: null,
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
    const gone = s.nodes.find((n) => n.id === id)
    if (gone?.data.kind === "users" || gone?.data.locked) return s
    return {
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      edits: nextEdit(),
    }
  })
}

type Judged = Pick<Run, "verdict" | "result" | "practice" | "newBest" | "penalty" | "offer" | "stars">

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
  const last = useGame.getState().lastInterview
  const result = evaluate(design, interview.scenario)
  startRun(interview, design, {
    verdict,
    result,
    practice: false,
    newBest: false,
    penalty: last?.penalty ?? 0,
    offer: last?.offer ?? null,
    stars: starsOf(result, interview.targets, verdict),
  })
}

/** Reruns a passed interview against its targets and plays the same reveal. Nothing in the career changes. */
export function practiceBoard(interview: Interview): void {
  const design = draftOf(useBoard.getState())
  const run = useGame.getState().practiceWhiteboard(interview.id, design)
  if (!run) return
  startRun(interview, design, { verdict: run.verdict, result: run.result, practice: true, newBest: run.newBest, penalty: 0, offer: null, stars: run.stars })
}

/** Swaps in the engineers' board, read-only, and marks the interview studied. The player's own board waits for `leaveStudy`. */
export function studyReference(interview: Interview): void {
  const reference = useGame.getState().studyReference(interview.id)
  if (!reference) return
  useBoard.setState((s) =>
    s.studying
      ? s
      : {
          studying: true,
          stash: { nodes: s.nodes, edges: s.edges, edits: s.edits, run: s.run },
          ...layout(reference, new Set(interview.locked.map((n) => n.id))),
          edits: nextEdit(),
          run: null,
          demo: null,
          notice: null,
        },
  )
}

export function leaveStudy(): void {
  useBoard.setState((s) => (s.studying && s.stash ? { studying: false, stash: null, nodes: s.stash.nodes, edges: s.stash.edges, run: null, demo: null, edits: nextEdit() } : s))
}

/**
 * Plays the current draft's traffic as dots, with a red dot wherever a request dies. It is free and unlimited, allowed
 * while the interview is open, and shows no verdict, no target and no pass or fail colour.
 */
export function runTraffic(interview: Interview): void {
  const design = draftOf(useBoard.getState())
  const result = evaluate(design, interview.scenario)
  const demo: Demo = {
    paths: leafPaths(design, interview.scenario),
    p95Ms: result.phases[0].p95Ms,
    targetP95Ms: interview.targets.p95Ms,
    edits: useBoard.getState().edits,
    startedAt: performance.now(),
    revealing: true,
  }
  useBoard.setState({ demo })
  window.setTimeout(() => useBoard.setState((s) => (s.demo === demo ? { demo: { ...demo, revealing: false } } : s)), REVEAL_MS)
}

export function endReveal(): void {
  useBoard.setState((s) => ({
    run: s.run?.revealing ? { ...s.run, revealing: false } : s.run,
    demo: s.demo?.revealing ? { ...s.demo, revealing: false } : s.demo,
  }))
}

/** What the traffic layer plays now: a Run traffic, else a Submit's reveal, while the board is still the one it ran on. */
export function playing(s: BoardState): Pick<Demo, "paths" | "p95Ms" | "targetP95Ms" | "startedAt"> | null {
  if (s.demo?.revealing && s.demo.edits === s.edits) return s.demo
  const run = s.run
  if (run?.revealing && run.edits === s.edits) return { paths: run.paths, p95Ms: run.result.p95Ms, targetP95Ms: run.targetP95Ms, startedAt: run.startedAt }
  return null
}

/** The run, while the board on screen is still the one it judged. */
export const currentRun = (s: BoardState): Run | null => (s.run && s.run.edits === s.edits ? s.run : null)
