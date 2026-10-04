/**
 * The IDE sits behind the stage, so the stage panel takes every pointer event over the editor.
 * These keep the editor usable anyway: wheel turns on empty stage scroll the open file, and the
 * tab strip and explorer follow the selection.
 */

type WheelLike = {
  target: EventTarget | null
  currentTarget: EventTarget
  deltaX: number
  deltaY: number
  deltaMode?: number
}

const LINE_PX = 16

/** Scrolls the open file when the wheel turns over empty stage. True when the file actually moved. */
export function scrollIdeEditor(event: WheelLike): boolean {
  // The hero card, the sprite and any popup keep their own wheel.
  if (event.target !== event.currentTarget) return false
  const layer = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(".ide-editor .code-layer:not(.code-leave)")
  if (!layer) return false
  const unit = event.deltaMode === 1 ? LINE_PX : 1
  const top = layer.scrollTop
  const left = layer.scrollLeft
  layer.scrollBy({ top: event.deltaY * unit, left: event.deltaX * unit })
  return layer.scrollTop !== top || layer.scrollLeft !== left
}

/** Scrolls `container` (and only it) just enough to bring `el` into view along one axis. */
export function revealIn(container: HTMLElement, el: HTMLElement, axis: "x" | "y"): void {
  const box = container.getBoundingClientRect()
  const at = el.getBoundingClientRect()
  if (axis === "y") {
    if (at.top < box.top) container.scrollTop -= box.top - at.top
    else if (at.bottom > box.bottom) container.scrollTop += at.bottom - box.bottom
    return
  }
  if (at.left < box.left) container.scrollLeft -= box.left - at.left
  else if (at.right > box.right) container.scrollLeft += at.right - box.right
}
