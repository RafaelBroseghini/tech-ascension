import { Background, BackgroundVariant, ConnectionLineType, Controls, Panel, ReactFlow, useReactFlow, ViewportPortal } from "@xyflow/react"
import type { IsValidConnection, OnConnectEnd } from "@xyflow/react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { LANES } from "../../data/studio/components.ts"
import { canConnect, clearNotice, explainRefusal, onConnect, onEdgesChange, onNodesChange, playing, runTraffic, useBoard } from "./boardStore.ts"
import { COLUMN, GRID } from "./diagram.ts"
import type { BoardEdge } from "./boardStore.ts"
import { ComponentNode } from "./ComponentNode.tsx"
import { TrafficLayer } from "./TrafficLayer.tsx"

const NODE_TYPES = { component: ComponentNode }
const SNAP: [number, number] = [GRID, GRID]
const DELETE_KEYS = ["Delete", "Backspace"]
const EDGE_DEFAULTS = { type: "smoothstep" } as const
const FIT = { padding: 0.25, maxZoom: 1 }
const START = { x: 8, y: 40, zoom: 0.6 }
const LANE_LEFT = 16
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

/** The lanes behind the pieces, from The Users to the data, so the direction rules can be seen. */
function Lanes() {
  return (
    <ViewportPortal>
      {LANES.map((lane, i) => (
        <div
          key={lane.id}
          className="studio-lane"
          data-testid="studio-lane"
          data-lane={lane.id}
          style={{ transform: `translate(${LANE_LEFT + i * COLUMN - 8}px, -400px)`, width: COLUMN - 16 }}
        >
          <span>{lane.name}</span>
        </div>
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
  const [fit] = useState(() => nodes.length > 1)
  const rf = useReactFlow()
  const wrap = useRef<HTMLDivElement>(null)
  // A fresh board shows every lane at once, as large as the pane allows.
  const onInit = useCallback(() => {
    const width = wrap.current?.clientWidth ?? 0
    if (!fit && width > 0) void rf.setViewport({ x: 8, y: 40, zoom: Math.min(1, Math.max(0.4, (width - 16) / (LANES.length * COLUMN))) })
  }, [fit, rf])
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
        snapToGrid
        snapGrid={SNAP}
        deleteKeyCode={studying ? null : DELETE_KEYS}
        nodesDraggable={!studying}
        nodesConnectable={!studying}
        edgesFocusable={!studying}
        fitView={fit}
        fitViewOptions={FIT}
        defaultViewport={START}
        minZoom={0.25}
        maxZoom={2}
        proOptions={PRO}
      >
        <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} />
        <Controls showInteractive={false} position="top-right" />
        <Panel position="top-left" className="studio-toolbar">
          <button type="button" className="studio-run-traffic" data-testid="studio-run-traffic" disabled={running} onClick={() => runTraffic(interview)}>
            Run traffic
          </button>
        </Panel>
        <Lanes />
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
