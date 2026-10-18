import { useLayoutEffect } from "react"
import type { RefObject } from "react"

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

/** Open traps, oldest first. Only the top one handles Tab, so a card over another modal does not fight it. */
const stack: HTMLElement[] = []

function tabbable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0)
}

/**
 * Keeps Tab and Shift+Tab inside a modal dialog and hands focus back to whatever had it before the dialog opened.
 * The dialog still takes initial focus itself (each modal focuses its own default control); this only wraps the
 * ends. A layout effect, so the opener is recorded before any modal's own focus effect runs.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!active || !root) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    stack.push(root)
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Tab" || key.defaultPrevented || stack[stack.length - 1] !== root) return
      const items = tabbable(root)
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        key.preventDefault()
        root.focus({ preventScroll: true })
        return
      }
      const at = document.activeElement
      if (!(at instanceof Node) || !root.contains(at) || at === root) {
        // Focus is on the dialog itself or has strayed out: land on an end.
        key.preventDefault()
        ;(key.shiftKey ? last : first).focus({ preventScroll: true })
      } else if (key.shiftKey && at === first) {
        key.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!key.shiftKey && at === last) {
        key.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      const at = stack.indexOf(root)
      if (at >= 0) stack.splice(at, 1)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [ref, active])
}
