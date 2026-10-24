/** @vitest-environment happy-dom */
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { useTabBar } from "./shopMotion.ts"
import { loadMotion } from "./useMotion.ts"

const reduced = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: on && query.includes("reduce"), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

/** The bar is a component of its own in the shop (TabBar), so it mounts with its strip. */
const held: { current: HTMLElement | null } = { current: null }
function Bar({ active }: { active: number }) {
  useTabBar(held, String(active))
  return createElement("i", { ref: held, className: "era-tab-bar" })
}

function Strip({ active }: { active: number }) {
  return createElement(
    "div",
    { className: "era-tabs" },
    [0, 1, 2].map((at) => createElement("button", { key: at, className: at === active ? "era-tab active" : "era-tab", "data-at": at })),
    createElement(Bar, { active }),
  )
}

describe("the bar under a tab strip", () => {
  let root: Root
  let host: HTMLDivElement

  beforeAll(async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    await loadMotion()
    // Tabs 100px wide side by side; happy-dom has no layout of its own.
    Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
      configurable: true,
      get(this: HTMLElement) {
        return (Number(this.dataset.at) || 0) * 100
      },
    })
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 100 })
    Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => [{ width: 100, height: 40 }] })
  })

  beforeEach(() => {
    reduced(false)
    host = document.createElement("div")
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.replaceChildren()
  })

  it("sits under the active tab at once on the first render", () => {
    act(() => root.render(createElement(Strip, { active: 1 })))
    const bar = host.querySelector<HTMLElement>(".era-tab-bar")!
    expect(bar.style.transform).toBe("translateX(100px)")
    expect(bar.style.width).toBe("100px")
  })

  it("jumps for reduced motion and slides to the new tab otherwise", async () => {
    act(() => root.render(createElement(Strip, { active: 0 })))
    const bar = host.querySelector<HTMLElement>(".era-tab-bar")!
    reduced(true)
    act(() => root.render(createElement(Strip, { active: 2 })))
    expect(bar.style.transform).toBe("translateX(200px)")
    reduced(false)
    act(() => root.render(createElement(Strip, { active: 1 })))
    // Not there yet: Motion is carrying it. It arrives on the tab's own place.
    await vi.waitFor(() => expect(bar.style.transform).toBe("translateX(100px)"), { timeout: 3000 })
  })
})
