/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
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
    root.render(createElement(Shop))
  })
  return host
}

// happy-dom does no layout, so give the list a height to scroll through.
const LIST_HEIGHT = 800
Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => LIST_HEIGHT })

function openTab(host: ParentNode, id: string) {
  flushSync(() => {
    host.querySelector<HTMLButtonElement>(`[role='tab'][data-phase='${id}']`)?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("shop panel switch", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("scrolls to the bottom when another tab opens", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1 } })
    const host = renderShop()
    // Each tab mounts its own list, so read it fresh after a switch.
    const list = () => host.querySelector<HTMLElement>(".panel-scroll")!
    expect(list().scrollTop).toBe(0)

    openTab(host, "G")
    expect(list().scrollTop).toBe(LIST_HEIGHT)

    openTab(host, "A")
    expect(list().scrollTop).toBe(LIST_HEIGHT)
  })

  it("leaves the list alone when the same tab is picked again", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 20_000, xp: 0, skills: { "1": 1 } })
    const host = renderShop()
    const list = host.querySelector<HTMLElement>(".panel-scroll")!
    list.scrollTop = 120
    openTab(host, "A")
    expect(list.scrollTop).toBe(120)
  })
})
