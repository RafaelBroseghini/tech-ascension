import { ConnectionLineType, Controls, Panel, ReactFlow, useReactFlow, ViewportPortal } from "@xyflow/react"
import type { IsValidConnection, OnConnectEnd } from "@xyflow/react"
import { memo, useCallback, useEffect, useRef } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { canConnect, clearNotice, explainRefusal, onConnect, onEdgesChange, onNodesChange, playing, runTraffic, useBoard } from "./boardStore.ts"
import { CELL, N } from "./diagram.ts"
import type { BoardEdge } from "./boardStore.ts"
import { ComponentNode } from "./ComponentNode.tsx"
import { TrafficLayer } from "./TrafficLayer.tsx"

const NODE_TYPES = { component: ComponentNode }
const EXTENT: [[number, number], [number, number]] = [[0, 0], [N * CELL, N * CELL]]
const DELETE_KEYS = ["Delete", "Backspace"]
const EDGE_DEFAULTS = { type: "smoothstep" } as const
const START = { x: 8, y: 40, zoom: 0.6 }
const NOTICE_MS = 6000
const PRO = { hideAttribution: true }
const isValid: IsValidConnection<BoardEdge> = (c) => canConnect(c)
/** A wire dropped on a piece that refuses it says why. */
const onConnectEnd: OnConnectEnd = (_event, state) => {
  if (state.isValid === false && state.fromNode && state.toNode) {
    const reversed = state.fromHandle?.type === "target"
    const [source, target] = reversed ? [state.toNode.id, state.fromNode.id] : [state.fromNode.id, state.toNode.id]
    explainRefusal({ source, target })
  }
}

/** The N by N grid behind the pieces: one square per cell. */
function Cells() {
  return (
    <ViewportPortal>
      {Array.from({ length: N * N }, (_, i) => (
        <div
          key={i}
          className="studio-cell"
          data-testid="studio-cell"
          style={{ transform: `translate(${(i % N) * CELL}px, ${Math.floor(i / N) * CELL}px)`, width: CELL, height: CELL }}
        />
      ))}
    </ViewportPortal>
  )
}

/** Why the last wire was refused, for a few seconds. */
function Notice() {
  const notice = useBoard((s) => s.notice)
  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(clearNotice, NOTICE_MS)
    return () => window.clearTimeout(id)
  }, [notice])
  return notice ? (
    <p className="studio-notice" role="status" data-testid="studio-notice">
      {notice}
    </p>
  ) : null
}

/** The board: nodes snap to a 16 px grid, wires are smooth steps, and a handle catches a wire within 40 px. */
export const Board = memo(function Board({ interview }: { interview: Interview }) {
  const nodes = useBoard((s) => s.nodes)
  const edges = useBoard((s) => s.edges)
  const running = useBoard((s) => playing(s) !== null)
  const studying = useBoard((s) => s.studying)
  // Fit a seeded board once on mount; a fresh one starts with The Users on the left at full size.
  const rf = useReactFlow()
  const wrap = useRef<HTMLDivElement>(null)
  // A fresh board shows every lane at once, as large as the pane allows.
  const onInit = useCallback(() => {
    const width = wrap.current?.clientWidth ?? 0
    const height = wrap.current?.clientHeight ?? 0
    if (width <= 0 || height <= 0) return
    const zoom = Math.min(1.2, (width - 16) / (N * CELL), (height - 16) / (N * CELL))
    void rf.setViewport({ x: (width - N * CELL * zoom) / 2, y: (height - N * CELL * zoom) / 2, zoom })
  }, [rf])
  return (
    <div className="studio-board" data-testid="studio-board" ref={wrap}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onInit={onInit}
        isValidConnection={isValid}
        defaultEdgeOptions={EDGE_DEFAULTS}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={40}
        nodeExtent={EXTENT}
        deleteKeyCode={studying ? null : DELETE_KEYS}
        nodesDraggable={!studying}
        nodesConnectable={!studying}
        edgesFocusable={!studying}
        defaultViewport={START}
        minZoom={0.25}
        maxZoom={2}
        proOptions={PRO}
      >
        <Controls showInteractive={false} position="top-right" />
        <Panel position="top-left" className="studio-toolbar">
          <button type="button" className="studio-run-traffic" data-testid="studio-run-traffic" disabled={running} onClick={() => runTraffic(interview)}>
            Run traffic
          </button>
        </Panel>
        <Cells />
        <TrafficLayer />
      </ReactFlow>
      <Notice />
      {studying ? (
        <p className="studio-studying" role="status" data-testid="studio-studying">
          The engineers' board, studied. Read it, run its traffic, then go back to yours.
        </p>
      ) : null}
    </div>
  )
})
