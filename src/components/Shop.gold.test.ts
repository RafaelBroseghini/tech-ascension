/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { GOLD_SKILLS } from "../data/gold.ts"
import { ownedCount } from "../game/economy.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

const roots: Root[] = []
const idOf = (name: string) => GOLD_SKILLS.find((row) => row.name === name)!.id

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
    useGame.setState({ xpTotal: 8_000, xp: 0, skills: { "1": 1 } })
    const host = renderShop()
    const tabs = [...host.querySelectorAll("[role='tab'][data-view]")]
    // The 10x dev tab opened with this XP, so it carries its NEW pill until it is clicked.
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Skills", "10x devNew"])
    expect(host.querySelector(".gold-offer")).toBeNull()
    expect(host.querySelector(".shop-list .offer")).not.toBeNull()

    openTenx(host)
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true")
    expect(goldRows(host)).toEqual(["Bulk Buy ×5", "Hover Tap", "Overnight Cron"])
    expect(host.querySelectorAll(".shop-list .offer:not(.gold-offer)")).toHaveLength(0)
    const first = host.querySelector(".gold-offer")!
    expect(first.querySelector(".gold-art svg")).not.toBeNull()
    expect(first.textContent).toContain("Buy up to 5 copies")
    expect(first.querySelector(".offer-actions button")?.hasAttribute("disabled")).toBe(true)

    click(host.querySelector("[role='tab'][data-view='skills']"))
    expect(host.querySelector(".gold-offer")).toBeNull()
    expect(host.querySelector(".shop-list .offer")).not.toBeNull()
  })

  it("claims a perk with XP and then shows it owned", () => {
    writeSavedShopTab("A")
    const bulk = GOLD_SKILLS[0]!
    useGame.setState({ xpTotal: 8_000, xp: bulk.cost, skills: { "1": 1 } })
    const host = renderShop()
    openTenx(host)
    click(host.querySelector(".gold-offer .offer-actions button"))
    expect(useGame.getState().gold).toEqual([bulk.id])
    expect(useGame.getState().xp).toBe(0)
    expect(host.querySelector(".gold-offer")?.className).toContain("is-done")
    expect(host.querySelector(".gold-offer .offer-actions button")?.textContent).toBe("Owned")
    expect(goldRows(host)).toContain("Bulk Buy ×10")
  })

  it("buys as many copies as the chosen amount from the skills list", () => {
    writeSavedShopTab("A")
    useGame.setState({ xpTotal: 8_000, xp: 1e9, skills: { "1": 1 }, gold: [idOf("Bulk Buy ×5")] })
    const host = renderShop()
    expect(host.querySelector("[data-testid='buy-amount']")).toBeNull()

    flushSync(() => useGame.getState().setBuyAmount(5))
    const learn = host.querySelector<HTMLButtonElement>(".shop-list .offer:not(.gold-offer) .offer-actions button")!
    expect(learn.textContent).toContain("×5")
    click(learn)
    expect(ownedCount(useGame.getState().skills, 1)).toBe(6)

    openTenx(host)
    expect(host.querySelector("[data-testid='buy-amount']")).toBeNull()
  })
})
