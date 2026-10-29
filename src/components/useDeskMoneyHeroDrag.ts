import { useEffect, useRef, useState } from "react"
import type { PointerEvent, RefObject } from "react"

const DRAG_THRESHOLD_PX = 8

export function clampDeskHeroOffset(
  panel: DOMRect,
  box: DOMRect,
  currentX: number,
  currentY: number,
  nextX: number,
  nextY: number,
): { x: number; y: number } {
  const pad = 10
  let x = nextX
  let y = nextY
  const atOriginLeft = box.left - currentX
  const atOriginTop = box.top - currentY
  const left = atOriginLeft + x
  const top = atOriginTop + y
  if (left < panel.left + pad) x += panel.left + pad - left
  if (top < panel.top + pad) y += panel.top + pad - top
  if (left + box.width > panel.right - pad) x -= left + box.width - (panel.right - pad)
  if (top + box.height > panel.bottom - pad) y -= top + box.height - (panel.bottom - pad)
  return { x, y }
}

function applyHeroTransform(el: HTMLElement, x: number, y: number) {
  el.style.setProperty("--hero-x", `${x}px`)
  el.style.setProperty("--hero-y", `${y}px`)
}

function clearHeroTransform(el: HTMLElement) {
  el.style.removeProperty("--hero-x")
  el.style.removeProperty("--hero-y")
}

/**
 * A drag nudges the card for this visit only. The offset is pixels from a layout that depends on the screen, so
 * saving it would carry a spot from one viewport into another; every load starts at the card's default place above the art.
 */
export function useDeskMoneyHeroDrag(panelRef: RefObject<HTMLElement | null>) {
  const boxRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    dragging: boolean
  } | null>(null)
  const liveRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef(0)

  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!dragging) return
    const prev = document.body.style.userSelect
    document.body.style.userSelect = "none"
    return () => {
      document.body.style.userSelect = prev
    }
  }, [dragging])

  function clamp(nextX: number, nextY: number, curX: number, curY: number): { x: number; y: number } {
    const panel = panelRef.current
    const box = boxRef.current
    if (!panel || !box) {
      return {
        x: Math.max(-280, Math.min(280, nextX)),
        y: Math.max(-280, Math.min(280, nextY)),
      }
    }
    return clampDeskHeroOffset(panel.getBoundingClientRect(), box.getBoundingClientRect(), curX, curY, nextX, nextY)
  }

  function flushTransform() {
    rafRef.current = 0
    const live = liveRef.current
    const el = boxRef.current
    if (!live || !el) return
    applyHeroTransform(el, live.x, live.y)
  }

  function scheduleTransform(x: number, y: number) {
    liveRef.current = { x, y }
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(flushTransform)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      dragging: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      drag.dragging = true
      setDragging(true)
      const el = boxRef.current
      if (el) applyHeroTransform(el, drag.originX, drag.originY)
    }
    if (!drag.dragging) return
    event.preventDefault()
    const cur = liveRef.current ?? { x: drag.originX, y: drag.originY }
    const next = clamp(drag.originX + dx, drag.originY + dy, cur.x, cur.y)
    scheduleTransform(next.x, next.y)
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    if (drag.dragging) {
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      const cur = liveRef.current ?? { x: drag.originX, y: drag.originY }
      const next = clamp(drag.originX + dx, drag.originY + dy, cur.x, cur.y)
      setOffset({ x: Math.round(next.x), y: Math.round(next.y) })
    }
    liveRef.current = null
    const el = boxRef.current
    if (el) clearHeroTransform(el)
    setDragging(false)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    finishDrag(event)
  }

  function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
    finishDrag(event)
  }

  return {
    boxRef,
    offsetX: offset.x,
    offsetY: offset.y,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }
}
