/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { EQUIPMENT } from "../data/phases.ts"
import { isServingKind } from "../game/globe/load.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

const roots: Root[] = []
const SERVING = EQUIPMENT.filter((row) => isServingKind(row.kind))
const DESK = EQUIPMENT.filter((row) => !isServingKind(row.kind))

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

/** A career in the Gear tab with 10,000 XP and some money, and the company open or not. */
function atGear(over: Partial<ReturnType<typeof useGame.getState>> = {}) {
  writeSavedShopTab("G")
  useGame.setState({ xpTotal: 50_000, xp: 50_000, peakMoney: 5_000, money: 5_000, ...over })
}

const rowIds = (host: ParentNode) => [...host.querySelectorAll("[data-row^='gear:']")].map((row) => Number(row.getAttribute("data-row")!.slice(5)))

describe("serving gear in the Gear tab", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("stays out of the list until the company opens", () => {
    atGear({ unlocked: [] })
    const ids = rowIds(renderShop())
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.some((id) => SERVING.some((row) => row.id === id))).toBe(false)
  })

  it("shows the next serving row from the moment the company opens, with no desk gear bought", () => {
    atGear({ unlocked: ["studio"], jobs: [1] })
    const ids = rowIds(renderShop())
    // The desk track still offers only its first row, and the serving track its own first row.
    expect(ids).toContain(DESK[0]!.id)
    expect(ids).toContain(SERVING[0]!.id)
    expect(ids.filter((id) => DESK.some((row) => row.id === id))).toHaveLength(1)
    expect(ids.filter((id) => SERVING.some((row) => row.id === id))).toHaveLength(1)
  })

  it("moves the serving track on when its first copy is bought, without waiting on the desk", () => {
    atGear({ unlocked: ["studio"], jobs: [1], equipment: { [String(SERVING[0]!.id)]: 1 } })
    const ids = rowIds(renderShop())
    expect(ids).toContain(SERVING[0]!.id)
    expect(ids).toContain(SERVING[1]!.id)
    expect(ids.filter((id) => DESK.some((row) => row.id === id))).toHaveLength(1)
  })
})
