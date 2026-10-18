import { ChevronUp } from "lucide-react"
import { useRef } from "react"
import type { PointerEvent } from "react"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { dockOffset, isDockTap, settleDock } from "../game/shopDock.ts"

interface Press {
  readonly id: number
  readonly y: number
  readonly t: number
  readonly docked: number
  readonly open: number
  moved: boolean
}

/**
 * The handle on top of the phone shop (portrait only; mobile.css hides it elsewhere). Drag it down to dock the shop to a
 * bar, tap it or drag it up to open it again. From the keyboard it toggles both ways. While the finger is down the sheet follows it through an inline
 * max-height, so the stage grows and shrinks live; on release the class takes over and the CSS transition settles it.
 */
export function ShopGrip({ docked, label, fresh, onDock }: { docked: boolean; label: string; fresh: boolean; onDock: (docked: boolean) => void }) {
  const press = useRef<Press | null>(null)
  // The open height, seen before the last dock, so a drag up from the bar has somewhere to go.
  const openHeight = useRef(0)
  // A drag ends in a click on the same button; that click must not flip the sheet back.
  const swallowClick = useRef(false)

  const sheetOf = (el: Element) => el.closest<HTMLElement>(".shop")

  const release = (sheet: HTMLElement) => {
    // After React has committed the new class, so the transition runs from where the finger left the sheet.
    requestAnimationFrame(() => {
      sheet.style.removeProperty("max-height")
      sheet.classList.remove("is-dragging")
    })
  }

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    swallowClick.current = false
    if (event.button !== 0) return
    const sheet = sheetOf(event.currentTarget)
    if (!sheet) return
    const height = sheet.getBoundingClientRect().height
    if (!docked) openHeight.current = height
    const open = openHeight.current || Math.round(window.innerHeight * 0.5)
    const bar = docked ? height : parseFloat(getComputedStyle(sheet).getPropertyValue("--shop-dock-h")) || 46
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = { id: event.pointerId, y: event.clientY, t: event.timeStamp, docked: bar, open, moved: false }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    const sheet = sheetOf(event.currentTarget)
    if (!p || p.id !== event.pointerId || !sheet) return
    const dy = event.clientY - p.y
    if (!p.moved && isDockTap(dy)) return
    p.moved = true
    sheet.classList.add("is-dragging")
    const travel = p.open - p.docked
    const offset = dockOffset(docked, dy, travel)
    sheet.style.maxHeight = `${docked ? p.docked + offset : p.open - offset}px`
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    const sheet = sheetOf(event.currentTarget)
    if (!p || p.id !== event.pointerId) return
    press.current = null
    if (!p.moved || !sheet) return
    swallowClick.current = true
    const next = settleDock({ docked, dy: event.clientY - p.y, ms: event.timeStamp - p.t, travel: p.open - p.docked })
    if (next !== docked) onDock(next)
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
      aria-label={docked ? `Open shop: ${label}` : "Dock shop"}
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
        // A tap on the open grip is too easily a tab tap that landed high; docking is a drag, or the keyboard.
        if (event.detail !== 0) return
        openHeight.current = sheetOf(event.currentTarget)?.getBoundingClientRect().height ?? 0
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
