import { ChevronUp } from "lucide-react"
import { useRef } from "react"
import type { PointerEvent } from "react"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { isDockTap, settleSheet, sheetHeight } from "../game/shopDock.ts"
import type { SheetDrag, SheetMode } from "../game/shopDock.ts"

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
}

/**
 * The handle on top of the phone shop (portrait only; mobile.css hides it elsewhere). From two rows, drag it down to
 * dock the shop to a bar, or up to expand the sheet (as high as the bottom of the top bar; it stays there). Tap the bar
 * to open it; tap the grip of an expanded sheet to return to two rows. From the keyboard it steps expanded, two rows,
 * docked. While the finger is down the sheet follows it through inline heights, so the stage grows and shrinks live; on
 * release the classes take over and the CSS transition settles it.
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
  // The two-row height, seen the last time the sheet rested there, so a drag from the bar or from expanded has somewhere to go.
  const rowsHeight = useRef(0)
  // A drag ends in a click on the same button; that click must not flip the sheet back.
  const swallowClick = useRef(false)

  const sheetOf = (el: Element) => el.closest<HTMLElement>(".shop")

  const release = (sheet: HTMLElement) => {
    // After React has committed the new class, so the transition runs from where the finger left the sheet.
    requestAnimationFrame(() => {
      sheet.style.removeProperty("max-height")
      sheet.style.removeProperty("height")
      sheet.classList.remove("is-dragging", "is-expanding")
    })
  }

  const dragOf = (p: Press, dy: number): SheetDrag => ({ mode: p.mode, height: p.height, dy, ms: 0, rowsHeight: p.rowsHeight, maxHeight: p.maxHeight, dockHeight: p.dockHeight })

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    swallowClick.current = false
    if (event.button !== 0) return
    const sheet = sheetOf(event.currentTarget)
    if (!sheet) return
    const box = sheet.getBoundingClientRect()
    const mode: SheetMode = docked ? "docked" : expanded !== null ? "expanded" : "rows"
    if (mode === "rows") rowsHeight.current = box.height
    const rows = rowsHeight.current || Math.round(window.innerHeight * 0.5)
    const dockHeight = docked ? box.height : parseFloat(getComputedStyle(sheet).getPropertyValue("--shop-dock-h")) || 46
    // Never past the top bar: the sheet's foot is fixed, so the room is what lies between the bar and it.
    const barBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = { id: event.pointerId, y: event.clientY, t: event.timeStamp, mode, height: box.height, rowsHeight: rows, maxHeight: box.bottom - barBottom, dockHeight, moved: false }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    const sheet = sheetOf(event.currentTarget)
    if (!p || p.id !== event.pointerId || !sheet) return
    const dy = event.clientY - p.y
    if (!p.moved && isDockTap(dy)) return
    p.moved = true
    sheet.classList.add("is-dragging")
    const height = sheetHeight(dragOf(p, dy))
    sheet.style.maxHeight = `${height}px`
    // Above two rows the list fills the sheet, so it must not hold its two-row cap.
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
    if (next.mode === "expanded") onExpand(next.height ?? null)
    else {
      onExpand(null)
      if ((next.mode === "docked") !== docked) onDock(next.mode === "docked")
    }
    release(sheet)
  }

  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    const sheet = sheetOf(event.currentTarget)
    if (!p || p.id !== event.pointerId) return
    press.current = null
    if (sheet) release(sheet)
  }

  return (
    <button
      type="button"
      className="shop-grip"
      data-testid="shop-grip"
      aria-expanded={!docked}
      aria-label={docked ? `Open shop: ${label}` : expanded !== null ? "Shrink shop to two rows" : "Dock shop"}
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
        // A tap on an expanded grip returns to two rows.
        if (expanded !== null) {
          onExpand(null)
          return
        }
        // A tap on the two-row grip is too easily a tab tap that landed high; docking is a drag, or the keyboard.
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
