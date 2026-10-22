/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { visibleJobs } from "../data/phases.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

let root: Root | null = null

function renderShop(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const next = createRoot(host)
  root = next
  flushSync(() => {
    next.render(createElement(Shop))
  })
  return host
}

function offer(host: ParentNode, name: string): HTMLElement {
  const row = [...host.querySelectorAll<HTMLElement>(".shop-list .offer")].find((el) => el.querySelector("h3")?.textContent?.includes(name))
  if (!row) throw new Error(`missing row ${name}`)
  return row
}

function hasNew(row: HTMLElement): boolean {
  return row.querySelector(".new-tag") !== null
}

function buyRow(host: ParentNode, name: string) {
  // The button shows its price only; the first one with a currency figure is the buy.
  const button = [...offer(host, name).querySelectorAll("button")].find((el) => /\$|XP/.test(el.textContent ?? ""))
  if (!button) throw new Error(`no buy button for ${name}`)
  flushSync(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("shop row badges and job art", () => {
  afterEach(() => {
    if (root) flushSync(() => root?.unmount())
    root = null
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("does not keep NEW on gear that is already owned", () => {
    writeSavedShopTab("G")
    useGame.setState({
      xpTotal: 20_000,
      money: 5_000_000,
      peakMoney: 5_000_000,
      equipment: { "1": 1 },
      jobs: [],
    })
    const host = renderShop()
    flushSync(() => {
      useGame.setState({
        equipment: Object.fromEntries(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((id) => [id, 1])),
      })
    })

    for (const name of ["USB-C dock", "Ergo chair", "Noise-cancelling headset"]) {
      const row = offer(host, name)
      expect(row.textContent).toContain("owned")
      expect(hasNew(row)).toBe(false)
    }
    expect(hasNew(offer(host, "Drawing tablet (UI)"))).toBe(true)
  })

  it("clears NEW when the next gear row is bought", () => {
    writeSavedShopTab("G")
    useGame.setState({
      xpTotal: 20_000,
      money: 5_000_000,
      peakMoney: 5_000_000,
      equipment: { "1": 1 },
      jobs: [],
    })
    const host = renderShop()
    flushSync(() => {
      useGame.setState({
        equipment: Object.fromEntries(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((id) => [id, 1])),
      })
    })
    expect(hasNew(offer(host, "Drawing tablet (UI)"))).toBe(true)
    buyRow(host, "Drawing tablet (UI)")
    expect(hasNew(offer(host, "Drawing tablet (UI)"))).toBe(false)
    expect(hasNew(offer(host, "Standing desk converter"))).toBe(true)
  })

  it("does not keep NEW on capital that is already owned", () => {
    writeSavedShopTab("D")
    useGame.setState({
      xpTotal: 200_000,
      money: 1e15,
      peakMoney: 1e15,
      jobs: [14],
      owned: { "1": 1 },
    })
    const host = renderShop()
    flushSync(() => {
      useGame.setState({
        owned: Object.fromEntries(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((id) => [id, 1])),
      })
    })

    for (const name of ["Hold public AI ticker", "Own inference API market share", "Hold chip foundry stock"]) {
      const row = offer(host, name)
      expect(row.textContent).toMatch(/owned\s*1/)
      expect(hasNew(row)).toBe(false)
    }
    const next = offer(host, "Acquire chip design house")
    expect(next.textContent).toMatch(/owned\s*0/)
    expect(hasNew(next)).toBe(true)
  })

  it("shows API owner by name with art that is not the ERROR stamp", () => {
    writeSavedShopTab("C")
    useGame.setState({
      xpTotal: 3_000_000,
      money: 1,
      build: { spec: "backend", switched: false },
      jobs: visibleJobs("backend").map((job) => job.id),
      gigs: [1, 2, 3, 4, 5, 6],
    })
    const host = renderShop()
    const row = host.querySelector<HTMLElement>("[data-row='job:11']")
    expect(row?.querySelector("h3")?.textContent).toContain("API owner")
    const src = row?.querySelector("img")?.getAttribute("src") ?? ""
    expect(src).toMatch(/10881-unicorn\.png$/)
    expect(src).not.toMatch(/Error\.png/i)
    for (const id of [12, 13, 14, 15]) {
      const under = host.querySelector(`[data-row='job:${id}'] img`)?.getAttribute("src") ?? ""
      expect(under.length).toBeGreaterThan(0)
      expect(under).not.toMatch(/Error\.png/i)
    }
    const advisor = host.querySelector<HTMLElement>("[data-row='job:25']")
    expect(advisor?.querySelector("h3")?.textContent).toContain("Board advisor (tech)")
    const advisorSrc = advisor?.querySelector("img")?.getAttribute("src") ?? ""
    expect(advisorSrc).toMatch(/280352-chess\.png$/)
    expect(advisorSrc).not.toMatch(/Error\.png/i)
  })
})

describe("tab markers", () => {
  afterEach(() => {
    if (root) flushSync(() => root?.unmount())
    root = null
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  function tabDot(host: ParentNode, id: string): boolean {
    return host.querySelector(`[role='tab'][data-phase='${id}'] .deal-dot`) !== null
  }

  it("marks a tab for something new to buy, not for something the money can afford", () => {
    writeSavedShopTab("G")
    // Gear is open, and the first copy of the Thocky keyboard is unbought: a new thing.
    useGame.setState({ xpTotal: 20_000, money: 5_000_000, peakMoney: 5_000_000, equipment: {}, jobs: [] })
    const host = renderShop()
    expect(tabDot(host, "G")).toBe(true)

    // Once every gear row has a copy, nothing is new, even with plenty of money left.
    flushSync(() => {
      useGame.setState({ equipment: Object.fromEntries(Array.from({ length: 110 }, (_, index) => [String(index + 1), 1])) })
    })
    expect(tabDot(host, "G")).toBe(false)
  })
})
