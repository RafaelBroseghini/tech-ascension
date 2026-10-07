import { useReactFlow } from "@xyflow/react"
import type { XYPosition } from "@xyflow/react"
import { memo, useRef } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { COMPONENTS } from "../../data/studio/components.ts"
import type { CareerSoFar } from "../../data/studio/unlocks.ts"
import type { ComponentKind } from "../../game/studio/types.ts"
import { addNode, GRID, useBoard } from "./boardStore.ts"
import type { BoardEdge, BoardNode } from "./boardStore.ts"
import { KIND_ICON, PALETTE_ORDER, paletteKinds, specLine } from "./kinds.ts"

const NODE_W = 176
const NODE_H = 72
const DRAG_SLOP = 4

/** The first spot near `at` that no node already sits on, so repeated taps fan out instead of stacking. */
function freeSpot(at: XYPosition): XYPosition {
  const taken = useBoard.getState().nodes.map((n) => n.position)
  let spot = at
  for (let i = 0; i < 24 && taken.some((p) => Math.abs(p.x - spot.x) < NODE_W / 2 && Math.abs(p.y - spot.y) < NODE_H / 2); i++) {
    spot = { x: spot.x + GRID * 2, y: spot.y + GRID * 2 }
  }
  return spot
}

/** The components this career has unlocked. Drag a tile onto the board, or press it to drop one in the middle. */
export const Palette = memo(function Palette({ career }: { career: CareerSoFar }) {
  const rf = useReactFlow<BoardNode, BoardEdge>()
  const ghost = useRef<HTMLDivElement>(null)
  const drag = useRef<{ kind: ComponentKind; x: number; y: number; moved: boolean } | null>(null)
  // The click that follows a drag's pointerup must not drop a second node in the middle.
  const dropped = useRef(false)
  const kinds = paletteKinds(career)
  const locked = PALETTE_ORDER.length - kinds.length

  const place = (kind: ComponentKind, screen: XYPosition) => {
    const at = rf.screenToFlowPosition(screen)
    addNode(kind, freeSpot({ x: at.x - NODE_W / 2, y: at.y - NODE_H / 2 }))
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
      {kinds.map((kind) => {
        const Icon = KIND_ICON[kind]
        const spec = COMPONENTS[kind]
        return (
          <button
            key={kind}
            type="button"
            className="studio-tile"
            data-testid="studio-tile"
            data-kind={kind}
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
            <span className="studio-tile-spec">{specLine(kind)}</span>
          </button>
        )
      })}
      {locked > 0 ? <span className="studio-palette-more">{`${locked} more unlock as your career grows`}</span> : null}
      <div ref={ghost} className="studio-ghost" hidden aria-hidden />
    </div>
  )
})
