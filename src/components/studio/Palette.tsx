import { useReactFlow } from "@xyflow/react"
import type { XYPosition } from "@xyflow/react"
import { memo, useRef } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { useShallow } from "zustand/react/shallow"
import { COMPONENTS } from "../../data/studio/components.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import type { CareerSoFar } from "../../data/studio/unlocks.ts"
import type { ComponentKind } from "../../game/studio/types.ts"
import { addNode, piecesLeft, useBoard } from "./boardStore.ts"
import type { BoardEdge, BoardNode } from "./boardStore.ts"
import { KIND_ICON, specLine, trayFor, trayWanted } from "./kinds.ts"

const NODE_W = 176
const NODE_H = 72
const DRAG_SLOP = 4

/**
 * The tray: the pieces this interview offers that the career has unlocked, each with how many the board still takes. Drag
 * a tile onto the board, or press it to drop one in its lane.
 */
export const Palette = memo(function Palette({ interview, career }: { interview: Interview; career: CareerSoFar }) {
  const rf = useReactFlow<BoardNode, BoardEdge>()
  const ghost = useRef<HTMLDivElement>(null)
  const drag = useRef<{ kind: ComponentKind; x: number; y: number; moved: boolean } | null>(null)
  // The click that follows a drag's pointerup must not drop a second node in the middle.
  const dropped = useRef(false)
  const pieces = trayFor(interview, career)
  const locked = trayWanted(interview) - pieces.length
  const left = useBoard(useShallow((state) => Object.fromEntries(pieces.map(({ kind }) => [kind, piecesLeft(state, kind)])) as Record<ComponentKind, number>))

  const place = (kind: ComponentKind, screen: XYPosition) => {
    const at = rf.screenToFlowPosition(screen)
    addNode(kind, { x: at.x - NODE_W / 2, y: at.y - NODE_H / 2 })
  }
  const placeInMiddle = (kind: ComponentKind) => {
    const pane = document.querySelector(".studio-board .react-flow")?.getBoundingClientRect()
    if (pane) place(kind, { x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 })
  }

  const onPointerDown = (kind: ComponentKind) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { kind, x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    const el = ghost.current
    if (!d || !el) return
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return
    if (!d.moved) {
      d.moved = true
      el.textContent = COMPONENTS[d.kind].name
      el.hidden = false
    }
    el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (ghost.current) ghost.current.hidden = true
    if (!d?.moved) return
    dropped.current = true
    const over = document.elementFromPoint(e.clientX, e.clientY)
    if (over?.closest(".studio-board .react-flow")) place(d.kind, { x: e.clientX, y: e.clientY })
  }
  const onPointerCancel = () => {
    drag.current = null
    if (ghost.current) ghost.current.hidden = true
  }

  return (
    <div className="studio-palette" role="toolbar" aria-label="Components" data-testid="studio-palette">
      {pieces.map(({ kind, limit }) => {
        const Icon = KIND_ICON[kind]
        const spec = COMPONENTS[kind]
        const remaining = left[kind]
        return (
          <button
            key={kind}
            type="button"
            className="studio-tile"
            data-testid="studio-tile"
            data-kind={kind}
            data-left={remaining}
            disabled={remaining <= 0}
            title={`${spec.name}. ${spec.goal} ${specLine(kind)}`}
            onPointerDown={onPointerDown(kind)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClick={() => {
              if (!dropped.current) placeInMiddle(kind)
              dropped.current = false
            }}
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
            <span className="studio-tile-name">{spec.name}</span>
            <span className="studio-tile-count" data-testid="studio-tile-count">{`${remaining} of ${limit}`}</span>
            <span className="studio-tile-spec">{specLine(kind)}</span>
          </button>
        )
      })}
      {locked > 0 ? <span className="studio-palette-more">{`${locked} more unlock as your career grows`}</span> : null}
      <div ref={ghost} className="studio-ghost" hidden aria-hidden />
    </div>
  )
})
