import { useReactFlow } from "@xyflow/react"
import { useReducedMotion } from "motion/react"
import { useEffect, useRef } from "react"
import { REVEAL_MS, useBoard } from "./boardStore.ts"
import type { BoardEdge, BoardNode } from "./boardStore.ts"

type Pt = { x: number; y: number }
type Lane = { points: Pt[]; length: number[]; total: number; dots: number }

/** Corner points of each drawn edge path, in board coordinates, read from the edge's `d`. */
function lanesOf(root: HTMLElement, flows: Readonly<Record<string, number>>): Lane[] {
  const lanes: Lane[] = []
  for (const [id, share] of Object.entries(flows)) {
    const path = root.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${CSS.escape(id)}"] .react-flow__edge-path`)
    const numbers = path?.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g)?.map(Number)
    if (!numbers || numbers.length < 4) continue
    const points: Pt[] = []
    for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] })
    const length = [0]
    for (let i = 1; i < points.length; i++) length.push(length[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
    lanes.push({ points, length, total: length[length.length - 1] || 1, dots: Math.max(1, Math.min(8, Math.round(share * 8))) })
  }
  return lanes
}

function pointAt(lane: Lane, f: number): Pt {
  const d = f * lane.total
  let i = 1
  while (i < lane.length.length - 1 && lane.length[i] < d) i++
  const span = lane.length[i] - lane.length[i - 1] || 1
  const t = Math.min(1, Math.max(0, (d - lane.length[i - 1]) / span))
  const a = lane.points[i - 1]
  const b = lane.points[i]
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
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
    let raf = 0

    const frame = (now: number) => {
      raf = 0
      const s = useBoard.getState()
      if (!s.run?.revealing) return
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
      for (const lane of cache.lanes) {
        for (let k = 0; k < lane.dots; k++) {
          const f = reduced ? (k + 0.5) / lane.dots : (t * 2 + k / lane.dots) % 1
          const p = pointAt(lane, f)
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (!document.hidden) raf = requestAnimationFrame(frame)
    }
    const resume = () => {
      if (!document.hidden && raf === 0) raf = requestAnimationFrame(frame)
    }
    document.addEventListener("visibilitychange", resume)
    raf = requestAnimationFrame(frame)
    return () => {
      document.removeEventListener("visibilitychange", resume)
      cancelAnimationFrame(raf)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
    }
  }, [revealing, reduced, rf])

  return <canvas ref={canvas} className="studio-traffic" aria-hidden />
}
