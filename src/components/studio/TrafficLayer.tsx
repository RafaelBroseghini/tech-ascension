import { useReactFlow } from "@xyflow/react"
import { useReducedMotion } from "motion/react"
import { useEffect, useRef } from "react"
import { playing, REVEAL_MS, useBoard } from "./boardStore.ts"
import type { BoardEdge, BoardNode } from "./boardStore.ts"
import { edgeId } from "./diagram.ts"
import type { TrafficPath } from "./diagram.ts"
import { animate, dotsAt, fractionAt, laneOf, paintDots, stillDots, travelMs } from "./traffic.ts"
import type { Lane, Pt } from "./traffic.ts"

/** Corner points of one drawn edge, in board coordinates, read from the edge's `d`. Null while the edge is not on screen. */
function edgePoints(root: HTMLElement, id: string): Pt[] | null {
  const path = root.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${CSS.escape(id)}"] .react-flow__edge-path`)
  const numbers = path?.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g)?.map(Number)
  if (!numbers || numbers.length < 4) return null
  const points: Pt[] = []
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] })
  return points
}

/** One lane per path: the drawn edges of each consecutive node pair, joined from The Users to the end. */
function lanesOf(root: HTMLElement, paths: readonly TrafficPath[]): Lane[] {
  const lanes: Lane[] = []
  for (const path of paths) {
    const points: Pt[] = []
    const reach = [0]
    let drawn = path.nodes.length > 1
    for (let i = 1; i < path.nodes.length && drawn; i++) {
      const edge = edgePoints(root, edgeId(path.nodes[i - 1], path.nodes[i]))
      if (edge) {
        points.push(...(points.length > 0 ? edge.slice(1) : edge))
        reach.push(points.length - 1)
      } else drawn = false
    }
    if (!drawn) continue
    const lane = laneOf(points, Math.max(1, Math.min(8, Math.round(path.share * 8))))
    const dead = path.dies ? { at: fractionAt(lane, reach[Math.min(path.dies.at, reach.length - 1)]), share: path.dies.share } : null
    lanes.push({ ...lane, dead })
  }
  return lanes
}

/**
 * The submission's traffic as dots on one canvas over the board. The loop reads the viewport and the store each
 * frame and never sets React state; it runs only while a reveal plays and the tab is visible.
 */
export function TrafficLayer() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const revealing = useBoard((s) => playing(s) !== null)
  const reduced = useReducedMotion()
  const rf = useReactFlow<BoardNode, BoardEdge>()

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext("2d")
    if (!revealing || !el || !ctx) return
    const root = el.closest<HTMLElement>(".react-flow")
    if (!root) return
    const style = getComputedStyle(el)
    const color = style.color
    const deadColor = style.getPropertyValue("--traffic-dead").trim() || "#f38ba8"
    let cache: { nodes: unknown; edges: unknown; paths: unknown; lanes: Lane[] } | null = null

    const stop = animate((now) => {
      const s = useBoard.getState()
      const play = playing(s)
      if (!play) return false
      if (!cache || cache.nodes !== s.nodes || cache.edges !== s.edges || cache.paths !== play.paths) {
        cache = { nodes: s.nodes, edges: s.edges, paths: play.paths, lanes: lanesOf(root, play.paths) }
      }
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
      const elapsed = now - play.startedAt
      if (reduced) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin((elapsed / REVEAL_MS) * Math.PI * 4)
        for (const lane of cache.lanes) paintDots(ctx, stillDots(lane), 3.5, deadColor)
      } else {
        ctx.globalAlpha = 1
        const { p95Ms } = play
        const travel = travelMs(p95Ms, play.targetP95Ms)
        for (const lane of cache.lanes) paintDots(ctx, dotsAt(lane, elapsed, travel, !Number.isFinite(p95Ms)), 3.5, deadColor)
      }
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
