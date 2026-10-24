import { ChevronUp } from "lucide-react"
import { useEffect, useRef } from "react"
import type { PointerEvent } from "react"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { isDockTap, releaseSpeed, settleSheet, sheetHeight, smoothSpeed } from "../game/shopDock.ts"
import type { SheetDrag, SheetMode } from "../game/shopDock.ts"
import { springSheet } from "./shopMotion.ts"

interface Press {
  readonly id: number
  readonly y: number
  readonly t: number
  readonly mode: SheetMode
  readonly height: number
  readonly rowsHeight: number
  readonly maxHeight: number
  readonly dockHeight: number
  moved: boolean
  /** The finger's last position and time, and its smoothed speed in px/ms (positive is down), for the release. */
  lastY: number
  lastT: number
  speed: number
}

/**
 * The handle on top of the phone shop (portrait only; mobile.css hides it elsewhere). From three rows, drag it down to
 * dock the shop to a bar, or up to expand the sheet (as high as the top of the screen; it stays there). Tap the bar
 * to open it; tap the grip of an expanded sheet to return to three rows. From the keyboard it steps expanded, three rows,
 * docked. While the finger is down the sheet follows it through inline heights, so the stage grows and shrinks live; on
 * release the classes say where it rests and a Motion spring carries it there from where the finger left it, with the
 * finger's speed (shopMotion.ts). Without Motion the CSS transition settles it instead.
 */
export function ShopGrip({
  docked,
  expanded,
  label,
  fresh,
  onDock,
  onExpand,
}: {
  docked: boolean
  expanded: number | null
  label: string
  fresh: boolean
  onDock: (docked: boolean) => void
  onExpand: (height: number | null) => void
}) {
  const press = useRef<Press | null>(null)
  // The three-row height, seen the last time the sheet rested there, so a drag from the bar or from expanded has somewhere to go.
  const rowsHeight = useRef(0)
  // A drag ends in a click on the same button; that click must not flip the sheet back.
  const swallowClick = useRef(false)

  const sheetOf = (el: Element) => el.closest<HTMLElement>(".shop")

  // The spring that is carrying the sheet home after a release. A finger that lands on the sheet meanwhile takes it over.
  const settling = useRef<{ stop: () => void } | null>(null)
  const settled = useRef<HTMLElement | null>(null)
  useEffect(
    () => () => {
      settling.current?.stop()
      settled.current?.classList.remove("is-dragging", "is-expanding")
      settled.current?.style.removeProperty("max-height")
      settled.current?.style.removeProperty("height")
    },
    [],
  )

  const release = (sheet: HTMLElement, speed: number) => {
    // Read before the state below commits, while the sheet is still where the finger left it.
    const from = sheet.getBoundingClientRect().height
    settling.current = springSheet(sheet, from, speed)
    settled.current = sheet
  }

  const dragOf = (p: Press, dy: number): SheetDrag => ({ mode: p.mode, height: p.height, dy, ms: 0, rowsHeight: p.rowsHeight, maxHeight: p.maxHeight, dockHeight: p.dockHeight })

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    swallowClick.current = false
    if (event.button !== 0) return
    const sheet = sheetOf(event.currentTarget)
    if (!sheet) return
    settling.current?.stop()
    settling.current = null
    const box = sheet.getBoundingClientRect()
    const mode: SheetMode = docked ? "docked" : expanded !== null ? "expanded" : "rows"
    if (mode === "rows") rowsHeight.current = box.height
    const rows = rowsHeight.current || Math.round(window.innerHeight * 0.5)
    const dockHeight = docked ? box.height : parseFloat(getComputedStyle(sheet).getPropertyValue("--shop-dock-h")) || 46
    // Never off the screen: the sheet's foot is fixed, so the room is what lies above it.
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = { id: event.pointerId, y: event.clientY, t: event.timeStamp, mode, height: box.height, rowsHeight: rows, maxHeight: box.bottom, dockHeight, moved: false, lastY: event.clientY, lastT: event.timeStamp, speed: 0 }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    const sheet = sheetOf(event.currentTarget)
    if (!p || p.id !== event.pointerId || !sheet) return
    const dy = event.clientY - p.y
    p.speed = smoothSpeed(p.speed, event.clientY - p.lastY, event.timeStamp - p.lastT)
    p.lastY = event.clientY
    p.lastT = event.timeStamp
    if (!p.moved && isDockTap(dy)) return
    p.moved = true
    sheet.classList.add("is-dragging")
    const height = sheetHeight(dragOf(p, dy))
    sheet.style.maxHeight = `${height}px`
    // Above three rows the list fills the sheet, so it must not hold its three-row cap.
    const growing = p.mode === "expanded" || (p.mode === "rows" && dy < 0)
    sheet.classList.toggle("is-expanding", growing)
    if (growing) sheet.style.height = `${height}px`
    else sheet.style.removeProperty("height")
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    const sheet = sheetOf(event.currentTarget)
    if (!p || p.id !== event.pointerId) return
    press.current = null
    if (!p.moved || !sheet) return
    swallowClick.current = true
    const next = settleSheet({ ...dragOf(p, event.clientY - p.y), ms: event.timeStamp - p.t })
    release(sheet, releaseSpeed(p.speed, event.timeStamp - p.lastT))
    if (next.mode === "expanded") onExpand(next.height ?? null)
    else {
      onExpand(null)
      if ((next.mode === "docked") !== docked) onDock(next.mode === "docked")
    }
  }

  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    const sheet = sheetOf(event.currentTarget)
    if (!p || p.id !== event.pointerId) return
    press.current = null
    if (sheet) release(sheet, 0)
  }

  return (
    <button
      type="button"
      className="shop-grip"
      data-testid="shop-grip"
      aria-expanded={!docked}
      aria-label={docked ? `Open shop: ${label}` : expanded !== null ? "Shrink shop to three rows" : "Dock shop"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={(event) => {
        if (swallowClick.current) {
          swallowClick.current = false
          return
        }
        if (docked) {
          onDock(false)
          return
        }
        // A tap on an expanded grip returns to three rows.
        if (expanded !== null) {
          onExpand(null)
          return
        }
        // A tap on the three-row grip is too easily a tab tap that landed high; docking is a drag, or the keyboard.
        if (event.detail !== 0) return
        rowsHeight.current = sheetOf(event.currentTarget)?.getBoundingClientRect().height ?? 0
        onDock(true)
      }}
    >
      <i className="shop-grip-pill" aria-hidden />
      <span className="shop-grip-bar" aria-hidden>
        <ChevronUp {...UI_ICON_SM} aria-hidden />
        <span>Shop · {label}</span>
        {fresh ? <i className="deal-dot" /> : null}
      </span>
    </button>
  )
}
