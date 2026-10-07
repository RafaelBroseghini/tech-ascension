import { Background, BackgroundVariant, ConnectionLineType, Controls, ReactFlow } from "@xyflow/react"
import type { IsValidConnection } from "@xyflow/react"
import { memo, useState } from "react"
import { canConnect, GRID, onConnect, onEdgesChange, onNodesChange, useBoard } from "./boardStore.ts"
import type { BoardEdge } from "./boardStore.ts"
import { ComponentNode } from "./ComponentNode.tsx"
import { TrafficLayer } from "./TrafficLayer.tsx"

const NODE_TYPES = { component: ComponentNode }
const SNAP: [number, number] = [GRID, GRID]
const DELETE_KEYS = ["Delete", "Backspace"]
const EDGE_DEFAULTS = { type: "smoothstep" } as const
const FIT = { padding: 0.25, maxZoom: 1 }
const START = { x: 48, y: 160, zoom: 1 }
const PRO = { hideAttribution: true }
const isValid: IsValidConnection<BoardEdge> = (c) => canConnect(c)

/** The board: nodes snap to a 16 px grid, wires are smooth steps, and a handle catches a wire within 40 px. */
export const Board = memo(function Board() {
  const nodes = useBoard((s) => s.nodes)
  const edges = useBoard((s) => s.edges)
  // Fit a seeded board once on mount; a fresh one starts with The Users on the left at full size.
  const [fit] = useState(() => nodes.length > 1)
  return (
    <div className="studio-board" data-testid="studio-board">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValid}
        defaultEdgeOptions={EDGE_DEFAULTS}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={40}
        snapToGrid
        snapGrid={SNAP}
        deleteKeyCode={DELETE_KEYS}
        fitView={fit}
        fitViewOptions={FIT}
        defaultViewport={START}
        minZoom={0.25}
        maxZoom={2}
        proOptions={PRO}
      >
        <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} />
        <Controls showInteractive={false} position="top-right" />
        <TrafficLayer />
      </ReactFlow>
    </div>
  )
})
