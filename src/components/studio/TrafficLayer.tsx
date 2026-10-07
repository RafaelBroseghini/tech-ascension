import { useReactFlow } from "@xyflow/react"
import { useReducedMotion } from "motion/react"
import { useEffect, useRef } from "react"
import { REVEAL_MS, useBoard } from "./boardStore.ts"
import type { BoardEdge, BoardNode } from "./boardStore.ts"
import { animate, laneOf, paintDots } from "./traffic.ts"
import type { Lane, Pt } from "./traffic.ts"

/** Corner points of each drawn edge path, in board coordinates, read from the edge's `d`. */
function lanesOf(root: HTMLElement, flows: Readonly<Record<string, number>>): Lane[] {
  const lanes: Lane[] = []
  for (const [id, share] of Object.entries(flows)) {
    const path = root.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${CSS.escape(id)}"] .react-flow__edge-path`)
    const numbers = path?.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g)?.map(Number)
    if (!numbers || numbers.length < 4) continue
    const points: Pt[] = []
    for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] })
    lanes.push(laneOf(points, Math.max(1, Math.min(8, Math.round(share * 8)))))
  }
  return lanes
}

/**
 * The submission's traffic as dots on one canvas over the board. The loop reads the viewport and the store each
 * frame and never sets React state; it runs only while a reveal plays and the tab is visible.
 */
export function TrafficLayer() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const revealing = useBoard((s) => Boolean(s.run?.revealing && s.run.edits === s.edits))
  const reduced = useReducedMotion()
  const rf = useReactFlow<BoardNode, BoardEdge>()

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext("2d")
    if (!revealing || !el || !ctx) return
    const root = el.closest<HTMLElement>(".react-flow")
    if (!root) return
    const color = getComputedStyle(el).color
    let cache: { nodes: unknown; edges: unknown; lanes: Lane[] } | null = null

    const stop = animate((now) => {
      const s = useBoard.getState()
      if (!s.run?.revealing) return false
      if (!cache || cache.nodes !== s.nodes || cache.edges !== s.edges) cache = { nodes: s.nodes, edges: s.edges, lanes: lanesOf(root, s.run.flows) }
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== Math.round(w * dpr)) el.width = Math.round(w * dpr)
      if (el.height !== Math.round(h * dpr)) el.height = Math.round(h * dpr)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
      const v = rf.getViewport()
      ctx.setTransform(dpr * v.zoom, 0, 0, dpr * v.zoom, dpr * v.x, dpr * v.y)
      ctx.fillStyle = color
      const t = (now - s.run.startedAt) / REVEAL_MS
      ctx.globalAlpha = reduced ? 0.35 + 0.35 * Math.sin(t * Math.PI * 4) : 1
      paintDots(ctx, cache.lanes, reduced ? 0 : (t * 2) % 1, 3.5)
      return true
    })
    return () => {
      stop()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
    }
  }, [revealing, reduced, rf])

  return <canvas ref={canvas} className="studio-traffic" aria-hidden />
}
