/** @vitest-environment happy-dom */
import { StrictMode, createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { useGame } from "../game/store.ts"
import { EventModal } from "./EventModal.tsx"
import { loadMotion } from "./useMotion.ts"

const roots: Root[] = []

function render(strict = false): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => root.render(strict ? createElement(StrictMode, null, createElement(EventModal)) : createElement(EventModal)))
  return host
}

/** happy-dom has no layout, so a dialog only animates where the test says it is on screen. */
const layout = (on: boolean) => {
  Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => (on ? [{ width: 1, height: 1 }] : []) })
}

const open = () => {
  useGame.setState({ money: 1_000, peakMoney: 1_000, xp: 1_000, xpTotal: 1_000 })
  expect(useGame.getState().fireEvent(21)).toBe(true)
}

describe("a dialog in its backdrop", () => {
  beforeAll(async () => {
    await loadMotion()
    // A browser marks the `finished` promise of a cancelled animation as handled; happy-dom leaves it to reject unhandled.
    const cancel = Animation.prototype.cancel
    Animation.prototype.cancel = function (this: Animation) {
      this.finished.catch(() => {})
      return cancel.call(this)
    }
  })

  beforeEach(() => layout(true))

  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    useGame.getState().wipe()
    layout(false)
  })

  it("closes at once, for the state and the focus trap, and a still copy fades out where it was", async () => {
    open()
    const host = render()
    expect(host.querySelector("[data-testid='event-modal']")).not.toBeNull()
    flushSync(() => useGame.getState().dismissEvent())
    // Nothing waits on the animation: the dialog is already out of the tree and the store has moved on.
    expect(host.querySelector("[data-testid='event-modal']")).toBeNull()
    expect(host.querySelector("[data-testid='event-backdrop']")).toBeNull()
    expect(useGame.getState().event).toBeNull()
    await Promise.resolve()
    const copy = host.querySelector<HTMLElement>(".event-backdrop")
    expect(copy).not.toBeNull()
    expect(copy!.getAttribute("aria-hidden")).toBe("true")
    expect(copy!.querySelector("[role='dialog']")).toBeNull()
    await vi.waitFor(() => expect(host.querySelector(".event-backdrop")).toBeNull(), { timeout: 3000 })
  })

  it("does not leave a copy of a dialog that is still open when React runs its effects twice", async () => {
    open()
    const host = render(true)
    await Promise.resolve()
    expect(host.querySelectorAll(".event-backdrop")).toHaveLength(1)
    expect(host.querySelector("[data-testid='event-modal']")).not.toBeNull()
  })
})
