/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

const roots: Root[] = []

function renderShop(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(Shop, { onCollapse: () => {}, docked: false, onDock: () => {} }))
  })
  return host
}

// happy-dom does no layout, so give the list a height to scroll through and lay its rows out by hand:
// a 300px view, every row 100px tall, stacked from the top of the list.
const LIST_HEIGHT = 800
const VIEW = 300
const ROW = 100

function openTab(host: ParentNode, id: string) {
  flushSync(() => {
    host.querySelector<HTMLButtonElement>(`[role='tab'][data-phase='${id}']`)?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("shop panel switch", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(LIST_HEIGHT)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(VIEW)
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const box = (top: number, height: number) => ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
      if (this.classList.contains("panel-scroll")) return box(0, VIEW)
      if (this.classList.contains("offer")) {
        const list = this.closest<HTMLElement>(".panel-scroll")!
        const index = [...list.querySelectorAll(".offer")].indexOf(this)
        return box(index * ROW - list.scrollTop, ROW)
      }
      return box(0, 0)
    })
  })

  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
    vi.restoreAllMocks()
  })

  // Each tab mounts its own list, so read it fresh after a switch.
  const list = (host: ParentNode) => host.querySelector<HTMLElement>(".panel-scroll")!

  it("scrolls to the bottom when another tab opens", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1 } })
    const host = renderShop()
    expect(list(host).scrollTop).toBe(0)

    openTab(host, "G")
    expect(list(host).scrollTop).toBe(LIST_HEIGHT)

    openTab(host, "A")
    expect(list(host).scrollTop).toBe(LIST_HEIGHT)
  })

  it("leaves the list alone when the same tab is picked again", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1 } })
    const host = renderShop()
    list(host).scrollTop = 120
    openTab(host, "A")
    expect(list(host).scrollTop).toBe(120)
  })

  it("lists gear in one run, with no section headers", () => {
    writeSavedShopTab("G")
    useGame.setState({ xpTotal: 20_000, money: 1_000 })
    const host = renderShop()
    expect(host.querySelector(".shop-section")).toBeNull()
    expect(host.querySelectorAll(".offer").length).toBeGreaterThan(0)
  })
})
