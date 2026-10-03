/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { useGame } from "../game/store.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { Shop } from "./Shop.tsx"

function offerNames(root: ParentNode): string[] {
  return [...root.querySelectorAll(".shop-list .offer h3")].map((heading) => heading.childNodes[0]?.textContent?.trim() ?? "")
}

function renderGear(equipment: Record<string, number>): HTMLDivElement {
  writeSavedShopTab("G")
  useGame.setState({
    xpTotal: 20_000,
    money: 1_000_000,
    peakMoney: 1_000_000,
    equipment,
    jobs: [],
    gigs: [],
  })
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(createElement(Shop))
  })
  return host
}

describe("gear shop order", () => {
  afterEach(() => {
    document.body.replaceChildren()
    writeSavedShopTab(null)
  })

  it("places the next unlock under the gear that opened it", () => {
    const host = renderGear({ "1": 1 })
    expect(offerNames(host)).toEqual(["Thocky keyboard", "Cable management kit"])
  })

  it("keeps a cheaper next row at the end of the section", () => {
    const host = renderGear({ "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1 })
    expect(offerNames(host)).toEqual([
      "Thocky keyboard",
      "Cable management kit",
      "Desk lamp (bias)",
      "Vertical mouse",
      "Laptop stand + riser",
      "Second monitor",
      "1080p webcam",
    ])
  })
})
