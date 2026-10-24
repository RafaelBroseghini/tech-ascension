/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { act } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { useGame } from "../game/store.ts"
import { Toast } from "./Toast.tsx"
import { RevealCard } from "./UnlockReveals.tsx"
import { loadMotion } from "./useMotion.ts"

const roots: Root[] = []

function mount(element: Parameters<Root["render"]>[0]): { host: HTMLDivElement; root: Root } {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  act(() => root.render(element))
  return { host, root }
}

/** happy-dom has no layout, so a thing only animates where the test says it is on screen. */
const layout = (on: boolean) => {
  Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => (on ? [{ width: 1, height: 1 }] : []) })
}

describe("toasts and cards coming and going", () => {
  beforeAll(async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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
    act(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    useGame.getState().wipe()
    layout(false)
  })

  it("keeps the toast's live region mounted while a still copy of the toast fades out of it", async () => {
    const { host } = mount(createElement(Toast))
    const region = host.querySelector("[role='status']")!
    act(() => useGame.setState({ toast: { id: 1, text: "Job Board unlocked" } }))
    expect(region.querySelector("[data-testid='toast']")).not.toBeNull()
    act(() => useGame.getState().dismissToast())
    expect(host.querySelector("[role='status']")).toBe(region)
    expect(region.querySelector("[data-testid='toast']")).toBeNull()
    await Promise.resolve()
    const copy = region.querySelector<HTMLElement>(".toast")
    expect(copy).not.toBeNull()
    // Nothing for a screen reader to read twice, and nothing to click.
    expect(copy!.getAttribute("aria-hidden")).toBe("true")
    expect(copy!.style.pointerEvents).toBe("none")
    await vi.waitFor(() => expect(region.querySelector(".toast")).toBeNull(), { timeout: 3000 })
  })

  it("gives a toast that replaces another its own entrance, and fades the old one out", async () => {
    const { host } = mount(createElement(Toast))
    const region = host.querySelector("[role='status']")!
    act(() => useGame.setState({ toast: { id: 1, text: "First" } }))
    const first = region.querySelector("[data-testid='toast']")
    act(() => useGame.setState({ toast: { id: 2, text: "Second" } }))
    const second = region.querySelector("[data-testid='toast']")
    expect(second).not.toBe(first)
    expect(second?.textContent).toBe("Second")
    await Promise.resolve()
    expect(region.querySelectorAll(".toast")).toHaveLength(2)
  })

  it("closes a reveal card at once and fades a copy of it out", async () => {
    const onClose = vi.fn()
    const { root } = mount(createElement(RevealCard, { copy: { kicker: "Unlocked", title: "Career log", body: "Your career." }, anchorId: null, onClose }))
    expect(document.querySelector("[data-testid='unlock-card']")).not.toBeNull()
    act(() => document.querySelector<HTMLButtonElement>("[data-testid='unlock-card-close']")!.click())
    expect(onClose).toHaveBeenCalledWith(false)
    act(() => root.unmount())
    expect(document.querySelector("[data-testid='unlock-card']")).toBeNull()
    await Promise.resolve()
    const copy = document.querySelector<HTMLElement>(".ul-card")
    expect(copy).not.toBeNull()
    expect(copy!.getAttribute("aria-hidden")).toBe("true")
    expect(copy!.querySelector("button")?.hasAttribute("data-testid")).toBe(false)
    await vi.waitFor(() => expect(document.querySelector(".ul-card")).toBeNull(), { timeout: 3000 })
  })
})
