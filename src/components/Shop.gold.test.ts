/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { GOLD_SKILLS } from "../data/gold.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

/** The first 10x dev row a career can reach on XP alone (Hover Tap also waits for a Senior SWE). */
const OPEN_ROW = GOLD_SKILLS.find((row) => !row.unlockJobRank)!

const roots: Root[] = []

function renderInto(element: ReturnType<typeof createElement>): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(element)
  })
  return host
}

const renderShop = () => renderInto(createElement(Shop))

function click(el: Element | null | undefined) {
  flushSync(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

const goldRows = (host: ParentNode) => [...host.querySelectorAll(".gold-offer h3")].map((h) => h.childNodes[0]?.textContent?.trim())

const openTenx = (host: ParentNode) => click(host.querySelector("[role='tab'][data-view='tenx']"))

describe("10x dev skills in the shop", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("has no sub-tab and no Buy control early on, with one buy button per row", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 2_000, xp: 5_000, skills: { "1": 1 } })
    const host = renderShop()
    expect(host.querySelector("[role='tab'][data-view]")).toBeNull()
    expect(host.querySelector("[data-testid='buy-amount']")).toBeNull()
    expect(host.querySelectorAll(".shop-list .offer-actions button.ghost")).toHaveLength(0)
  })

  it("keeps the perks out of the skills list and in their own 10x dev sub-tab", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: OPEN_ROW.unlockXp, xp: 0, skills: { "1": 1 } })
    const host = renderShop()
    const tabs = [...host.querySelectorAll("[role='tab'][data-view]")]
    // The 10x dev tab opened with this XP, so it carries its NEW pill until it is clicked.
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Skills", "10x devNew"])
    expect(host.querySelector(".gold-offer")).toBeNull()
    expect(host.querySelector(".shop-list .offer")).not.toBeNull()

    openTenx(host)
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true")
    expect(goldRows(host)).toEqual(["Hover Tap", "Overnight Cron"])
    expect(host.querySelectorAll(".shop-list .offer:not(.gold-offer)")).toHaveLength(0)
    const first = host.querySelector(".gold-offer")!
    expect(first.querySelector(".gold-art svg")).not.toBeNull()
    expect(first.textContent).toContain("2 times a second")
    expect(first.querySelector(".offer-actions button")?.hasAttribute("disabled")).toBe(true)

    click(host.querySelector("[role='tab'][data-view='skills']"))
    expect(host.querySelector(".gold-offer")).toBeNull()
    expect(host.querySelector(".shop-list .offer")).not.toBeNull()
  })

  it("claims a perk with XP and then shows it owned", () => {
    writeSavedShopTab("A")
    const perk = OPEN_ROW
    useGame.setState({ xpTotal: OPEN_ROW.unlockXp, xp: perk.cost, skills: { "1": 1 } })
    const host = renderShop()
    openTenx(host)
    const row = () => host.querySelector(`[data-row='gold:${perk.id}']`)
    click(row()?.querySelector(".offer-actions button") ?? null)
    expect(useGame.getState().gold).toEqual([perk.id])
    expect(useGame.getState().xp).toBe(0)
    expect(row()?.className).toContain("is-done")
    expect(row()?.querySelector(".offer-actions button")?.textContent).toBe("Owned")
    expect(goldRows(host)).toContain("Overnight Cron")
  })

  it("keeps Hover Tap locked until a Senior SWE is held, and says which job", () => {
    writeSavedShopTab("A")
    const hover = GOLD_SKILLS.find((row) => row.name === "Hover Tap")!
    useGame.setState({ xpTotal: 1e9, xp: 1e9, skills: { "1": 1 }, jobs: [1, 2, 3] })
    const host = renderShop()
    openTenx(host)
    const row = () => host.querySelector<HTMLElement>(`[data-row='gold:${hover.id}']`)
    expect(row()?.querySelector(".offer-actions button")?.textContent).toBe("Locked")
    expect(row()?.textContent).toContain("Senior SWE")
    click(row()?.querySelector(".offer-actions button") ?? null)
    expect(useGame.getState().gold).toEqual([])
  })

})
