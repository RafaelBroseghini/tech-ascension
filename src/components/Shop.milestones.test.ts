/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { FEATURES } from "../data/features.ts"
import { EQUIPMENT } from "../data/phases.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { setSidebarView } from "../game/ideSidebar.ts"
import { useGame } from "../game/store.ts"
import { CareerLog } from "./CareerLog.tsx"
import { Shop } from "./Shop.tsx"

const roots: Root[] = []

function render(component: typeof Shop | typeof CareerLog): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(component as typeof Shop, { onCollapse: () => {} }))
  })
  return host
}

/** A desk with the Gear tab open and money to spend, settled before the test looks at it. */
function desk(equipment: Record<string, number>) {
  useGame.setState({ xpTotal: 20_000, money: 1e9, peakMoney: 1e9, equipment })
  useGame.setState({ toast: null, pop: null })
}

const row = (host: ParentNode, key: string) => host.querySelector<HTMLElement>(`[data-row='${key}']`)!
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim() ?? ""

afterEach(() => {
  flushSync(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  writeSavedShopTab(null)
  setSidebarView("explorer")
  useGame.getState().wipe()
})

describe("output milestones on the shop rows", () => {
  it("runs a bar to the next ×2 under each owned row, lit a copy or two away, with the total as a badge", () => {
    writeSavedShopTab("G")
    desk({ "2": 8, "3": 12 })
    const host = render(Shop)
    const near = row(host, "gear:2")
    expect(near.querySelector("[data-testid='mult-badge']")).toBeNull()
    const nearBar = near.querySelector<HTMLElement>("[data-testid='offer-progress']")!
    expect(nearBar.dataset.kind).toBe("milestone")
    expect(nearBar.dataset.near).toBe("")
    expect(text(nearBar)).toBe("8 / 10 owned2 more · ×2 output at 10")

    const far = row(host, "gear:3")
    expect(text(far.querySelector("[data-testid='mult-badge']"))).toBe("×2")
    const farBar = far.querySelector<HTMLElement>("[data-testid='offer-progress']")!
    expect(farBar.dataset.near).toBeUndefined()
    expect(text(farBar)).toBe("12 / 25 owned×2 output at 25")
    expect(farBar.getAttribute("aria-valuenow")).toBe(String(Math.floor((2 / 15) * 100)))
  })

  it("stamps ×2 on the row when a copy crosses a milestone, with what the row gained", () => {
    writeSavedShopTab("G")
    desk({ "3": 9 })
    const host = render(Shop)
    expect(row(host, "gear:3").querySelector("[data-testid='mult-stamp']")).toBeNull()
    flushSync(() => useGame.getState().buyEquipment(3))
    const lamp = row(host, "gear:3")
    expect(text(lamp.querySelector("[data-testid='mult-stamp']"))).toBe("×2")
    const cps = EQUIPMENT.find((item) => item.id === 3)!.cps
    expect(text(lamp.querySelector("[data-testid='mult-gain']"))).toBe(`+$${(11 * cps).toFixed(1)}/s`)
    expect(lamp.querySelector("[data-testid='mult-badge']")?.classList.contains("is-stamped")).toBe(true)
  })

  it("points the Next banner at the cheapest milestone once Gear has every row", () => {
    writeSavedShopTab("G")
    const equipment = Object.fromEntries(EQUIPMENT.map((item) => [String(item.id), 1]))
    desk({ ...equipment, "2": 8 })
    const host = render(Shop)
    const banner = host.querySelector<HTMLElement>("[data-testid='next-unlock']")!
    expect(banner.dataset.next).toBe("gear:2")
    expect(banner.dataset.milestone).toBe("")
    expect(text(banner.querySelector("[data-testid='mult-chip']"))).toBe("×2 output")
    expect(text(banner.querySelector(".next-needs"))).toBe("to buy 2 more")
    flushSync(() => useGame.setState({ money: 0 }))
    expect(text(banner.querySelector(".next-needs"))).toMatch(/^need 2 more · \$/)
  })
})

describe("output milestones in the career log", () => {
  it("lists the nearest milestones in Up next once the desk has nothing left to open", () => {
    desk({ "2": 8 })
    // Every feature row open: Up next has room for milestones.
    useGame.setState({ unlocked: FEATURES.map((feature) => feature.id) })
    const host = render(CareerLog)
    const next = [...host.querySelectorAll<HTMLElement>("[data-testid='career-log-next'] li")]
    expect(next[0]?.dataset.milestone).toBe("gear:2")
    expect(text(next[0]?.querySelector("b"))).toBe("×2Cable management kit")
    expect(text(next[0]?.querySelector("small"))).toMatch(/^2 more · \$/)
  })

  it("prints a crossed milestone in the history with ×2 in front", () => {
    desk({ "2": 9 })
    useGame.getState().buyEquipment(2)
    const host = render(CareerLog)
    const head = host.querySelector<HTMLElement>("[data-testid='career-log-history'] li")!
    expect(head.dataset.tone).toBe("multiplier")
    expect(text(head.querySelector("b"))).toBe("×2Cable management kitHEAD")
    expect(text(head.querySelector("small"))).toMatch(/^10 owned · ×2 output · /)
  })
})
