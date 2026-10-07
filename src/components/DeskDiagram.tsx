import { Presentation } from "lucide-react"
import { memo, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { COMPONENTS } from "../data/studio/components.ts"
import { INTERVIEWS } from "../data/studio/challenges.ts"
import type { Interview } from "../data/studio/challenges.ts"
import { useGame } from "../game/store.ts"
import { interviewById } from "../game/studio/interviews.ts"
import type { Design } from "../game/studio/types.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { edgeFlows, edgeId, placeDesign } from "./studio/diagram.ts"
import type { Placed } from "./studio/diagram.ts"
import { KIND_ICON } from "./studio/kinds.ts"
import { getStudioView, subscribeStudioView } from "./studio/launcher.ts"
import { jobOf, lastPassed, nextInterview, statusLine, useStatuses } from "./studio/status.ts"
import { animate, laneOf, paintDots } from "./studio/traffic.ts"
import type { Lane, Pt } from "./studio/traffic.ts"

const NODE_W = 192
const NODE_H = 56
/** The desk spreads the whiteboard's cells wider than the board does, so wires are long enough to carry dots. */
const COLUMN = 272
const ROW = 96
/** Dots on one wire stay at least this far apart. */
const DOT_GAP = 56
const PAD = 32
/** One trip along an edge takes this long, so the dots drift rather than race. */
const LAP_MS = 6_000
/** The desk's dots repaint at most this often (about 30 per second). */
const FRAME_MS = 32
const MAX_DOTS = 3
const LONG_NAME = 20

type Drawing = {
  readonly view: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  readonly nodes: readonly Placed[]
  readonly wires: readonly { readonly id: string; readonly d: string }[]
  readonly lanes: readonly Lane[]
}

/** A wire leaves the right edge of its source and enters the left edge of its target in one step. */
function wirePoints(from: Pt, to: Pt): Pt[] {
  const a = { x: from.x + NODE_W, y: from.y + NODE_H / 2 }
  const b = { x: to.x, y: to.y + NODE_H / 2 }
  const mid = (a.x + b.x) / 2
  return [a, { x: mid, y: a.y }, { x: mid, y: b.y }, b]
}

function drawingOf(design: Design, interview: Interview): Drawing {
  const placed = placeDesign(design)
  const nodes = placed.nodes.map((n) => ({ ...n, x: n.col * COLUMN, y: n.row * ROW }))
  const at = new Map(nodes.map((n) => [n.id, n]))
  const flows = edgeFlows(design, interview.scenario)
  const wires: { id: string; d: string }[] = []
  const lanes: Lane[] = []
  for (const e of placed.edges) {
    const points = wirePoints(at.get(e.from) as Pt, at.get(e.to) as Pt)
    const id = edgeId(e.from, e.to)
    wires.push({ id, d: `M${points.map((p) => `${p.x} ${p.y}`).join(" L")}` })
    const share = flows[id] ?? 0
    if (share <= 0) continue
    const lane = laneOf(points, 1)
    lanes.push({ ...lane, dots: Math.max(1, Math.min(Math.round(share * MAX_DOTS), Math.floor(lane.total / DOT_GAP))) })
  }
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const x = Math.min(...xs) - PAD
  const y = Math.min(...ys) - PAD
  return { view: { x, y, w: Math.max(...xs) + NODE_W + PAD - x, h: Math.max(...ys) + NODE_H + PAD - y }, nodes, wires, lanes }
}

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Slow dots along the drawing's wires, on one canvas laid over the SVG with the same fit. The loop runs about 30 times
 * a second, sleeps while the tab is hidden or the whiteboard covers the desk, and never sets React state.
 */
function DeskTraffic({ drawing }: { drawing: Drawing }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const covered = useSyncExternalStore(subscribeStudioView, () => getStudioView().open, () => false)

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext("2d")
    if (!el || !ctx || covered || drawing.lanes.length === 0) return
    let color = getComputedStyle(el).color
    let fit = { scale: 1, x: 0, y: 0, dpr: 1 }
    const measure = () => {
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
      const { view } = drawing
      const scale = Math.min(w / view.w, h / view.h)
      fit = { scale, x: (w - view.w * scale) / 2 - view.x * scale, y: (h - view.h * scale) / 2 - view.y * scale, dpr }
    }
    const paint = (now: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
      ctx.setTransform(fit.dpr * fit.scale, 0, 0, fit.dpr * fit.scale, fit.dpr * fit.x, fit.dpr * fit.y)
      ctx.fillStyle = color
      paintDots(ctx, drawing.lanes, (now / LAP_MS) % 1, 4)
    }
    measure()
    const resized = new ResizeObserver(() => {
      measure()
      paint(performance.now())
    })
    resized.observe(el)
    // A theme swap rewrites the tokens on the root; read the dot color again then, not every frame.
    const themed = new MutationObserver(() => (color = getComputedStyle(el).color))
    themed.observe(document.documentElement, { attributes: true })
    let last = 0
    const stop = reducedMotion()
      ? () => {}
      : animate((now) => {
          if (now - last >= FRAME_MS) {
            last = now
            paint(now)
          }
          return true
        })
    paint(reducedMotion() ? 0 : performance.now())
    return () => {
      stop()
      resized.disconnect()
      themed.disconnect()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
    }
  }, [drawing, covered])

  return <canvas ref={canvas} className="desk-diagram-dots" aria-hidden />
}

function PassedDiagram({ interview, design }: { interview: Interview; design: Design }) {
  const drawing = useMemo(() => drawingOf(design, interview), [design, interview])
  const { view } = drawing
  return (
    <div className="desk-diagram" data-testid="desk-diagram" data-interview={interview.id} aria-hidden>
      <p className="desk-diagram-caption">
        <Presentation {...UI_ICON_SM} aria-hidden />
        Last passed whiteboard · {interview.name}
      </p>
      <div className="desk-diagram-board">
        <svg className="desk-diagram-svg" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet">
          {drawing.wires.map((wire) => (
            <path key={wire.id} className="desk-diagram-wire" d={wire.d} data-edge={wire.id} />
          ))}
          {drawing.nodes.map((node) => {
            const Icon = KIND_ICON[node.kind]
            const name = COMPONENTS[node.kind].name
            return (
              <g key={node.id} className="desk-diagram-node" data-kind={node.kind} transform={`translate(${node.x} ${node.y})`}>
                <rect width={NODE_W} height={NODE_H} rx={8} />
                <Icon x={12} y={NODE_H / 2 - 10} width={20} height={20} strokeWidth={1.75} />
                <text x={42} y={NODE_H / 2 + 4} textLength={name.length > LONG_NAME ? NODE_W - 54 : undefined} lengthAdjust="spacingAndGlyphs">
                  {name}
                </text>
                {node.replicas > 1 ? (
                  <text className="desk-diagram-count" x={NODE_W - 8} y={14} textAnchor="end">
                    ×{node.replicas}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
        <DeskTraffic drawing={drawing} />
      </div>
    </div>
  )
}

function NextPrompt({ interview, status }: { interview: Interview; status: string }) {
  return (
    <div className="desk-diagram" data-testid="desk-prompt" data-interview={interview.id} aria-hidden>
      <p className="desk-diagram-caption">
        <Presentation {...UI_ICON_SM} aria-hidden />
        Next interview · {interview.name}
      </p>
      <div className="desk-prompt-card">
        <p className="desk-prompt-kicker">For {jobOf(interview)?.name ?? "a job"}</p>
        <p className="desk-prompt-brief">{interview.brief}</p>
        <p className="desk-prompt-foot">{status}. The whiteboard button on the left opens it.</p>
      </div>
    </div>
  )
}

/**
 * The desk's backdrop, where the editor buffer used to be: the last passed whiteboard, drawn as a still SVG with slow
 * traffic dots, or before the first pass a dim card with the next interview's prompt. It sits behind the click
 * target and takes no pointer events.
 */
export const DeskDiagram = memo(function DeskDiagram() {
  const shownId = useGame((s) => lastPassed(s.interviews, s.journal.entries))
  const design = useGame((s) => (shownId ? s.interviews[shownId]?.design : undefined))
  const log = useGame((s) => s.interviews)
  const statuses = useStatuses()
  const shown = shownId ? interviewById(shownId) : undefined
  if (shown && design) return <PassedDiagram interview={shown} design={design} />
  const next = nextInterview(statuses)
  if (!next) return null
  return <NextPrompt interview={next} status={statusLine(statuses[INTERVIEWS.indexOf(next)], next, log)} />
})
