/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { isInfraKind } from "../data/gear.ts"
import { EQUIPMENT } from "../data/phases.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

const roots: Root[] = []
const INFRA = EQUIPMENT.filter((row) => isInfraKind(row.kind))
const DESK = EQUIPMENT.filter((row) => !isInfraKind(row.kind))

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

/** A career in the Gear tab with some XP and money. */
function atGear(over: Partial<ReturnType<typeof useGame.getState>> = {}) {
  writeSavedShopTab("G")
  useGame.setState({ xpTotal: 50_000, xp: 50_000, peakMoney: 5_000, money: 5_000, ...over })
}

const rowIds = (host: ParentNode) => [...host.querySelectorAll("[data-row^='gear:']")].map((row) => Number(row.getAttribute("data-row")!.slice(5)))

describe("the infra gear track in the Gear tab", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("stays out of the list until a job is held", () => {
    atGear({ jobs: [] })
    const ids = rowIds(renderShop())
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.some((id) => INFRA.some((row) => row.id === id))).toBe(false)
  })

  it("shows the next infra row from the first job, with no desk gear bought", () => {
    atGear({ jobs: [1] })
    const ids = rowIds(renderShop())
    // The desk track still offers only its first row, and the infra track its own first row.
    expect(ids).toContain(DESK[0]!.id)
    expect(ids).toContain(INFRA[0]!.id)
    expect(ids.filter((id) => DESK.some((row) => row.id === id))).toHaveLength(1)
    expect(ids.filter((id) => INFRA.some((row) => row.id === id))).toHaveLength(1)
  })

  it("moves the infra track on when its first copy is bought, without waiting on the desk", () => {
    atGear({ jobs: [1], equipment: { [String(INFRA[0]!.id)]: 1 } })
    const ids = rowIds(renderShop())
    expect(ids).toContain(INFRA[0]!.id)
    expect(ids).toContain(INFRA[1]!.id)
    expect(ids.filter((id) => DESK.some((row) => row.id === id))).toHaveLength(1)
  })

  it("keeps every infra row's income: the rows show their $/s and no user counts", () => {
    atGear({ jobs: [1] })
    const host = renderShop()
    const row = host.querySelector<HTMLElement>(`[data-row='gear:${INFRA[0]!.id}']`)
    expect(row?.textContent).toContain("/s")
    expect(host.textContent).not.toMatch(/serves|users/i)
  })
})
