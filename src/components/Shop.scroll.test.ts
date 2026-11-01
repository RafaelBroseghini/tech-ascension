/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"
import { scrollTarget } from "./shopScroll.ts"

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

describe("shop list scroll", () => {
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

  it("lands on the first open, unbought skill when the Skills tab opens", () => {
    writeSavedShopTab("G")
    // Skills 1 to 3 held (two copies of the second: a repeatable row that is held is bought), skill 4 is the next one to learn.
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1, "2": 2, "3": 1 } })
    const host = renderShop()
    openTab(host, "A")
    const row = scrollTarget(list(host))!
    expect(row.dataset.row).toBe("skill:4")
    // The row is below the view, so it lands at the bottom edge: rows 2 to 4 show.
    expect(list(host).scrollTop).toBe(4 * ROW - VIEW)
  })

  it("lands on the bottom when every open row is bought", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1 }, peakMoney: 1e18, owned: Object.fromEntries(CAPITAL.map((row) => [String(row.id), 1])) })
    const host = renderShop()
    openTab(host, "D")
    expect(scrollTarget(list(host))).toBeNull()
    expect(list(host).scrollTop).toBe(LIST_HEIGHT)
  })

  it("leaves the list alone when the same tab is picked again", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1 } })
    const host = renderShop()
    const el = list(host)
    el.scrollTop = 120
    openTab(host, "A")
    expect(el.scrollTop).toBe(120)
  })

  it("sends the jump arrow to the same row, smoothly", async () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1, "2": 1, "3": 1 } })
    const host = renderShop()
    const scrollTo = vi.fn()
    list(host).scrollTo = scrollTo as unknown as HTMLElement["scrollTo"]
    await vi.waitFor(() => expect(host.querySelector("[data-testid='shop-jump-end']")).not.toBeNull())
    flushSync(() => {
      host.querySelector("[data-testid='shop-jump-end']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(scrollTo).toHaveBeenCalledWith({ top: 4 * ROW - VIEW, behavior: "smooth" })
  })
})

describe("scrollTarget", () => {
  const rows = (...specs: string[]) => {
    const host = document.createElement("div")
    host.innerHTML = specs.map((spec, i) => `<article class="offer ${spec}" data-row="r${i}" ${spec.includes("held") ? "data-bought='true'" : ""}></article>`).join("")
    return host
  }

  it("skips rows that are done, locked or held, and the specialization switch", () => {
    const host = rows("is-done", "is-locked", "held", "spec-switch", "afford", "afford")
    expect(scrollTarget(host)?.dataset.row).toBe("r4")
  })

  it("is null when no row is open and unbought", () => {
    expect(scrollTarget(rows("is-done", "held", "is-locked"))).toBeNull()
  })
})
