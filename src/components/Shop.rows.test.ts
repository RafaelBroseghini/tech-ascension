/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SKILL_TIERS } from "../data/phases.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

// A root left mounted keeps listening to the store and can reset the saved shop tab under the next test.
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

const skill = (index: number) => {
  const row = SKILL_TIERS[index]
  if (!row) throw new Error(`missing skill ${index}`)
  return row
}

/** The first number in the unlock line, for "does the count fall". */
function countLeft(row: ParentNode | null | undefined): number {
  const text = row?.querySelector("[data-testid='offer-unlock']")?.textContent ?? ""
  return Number(/(\d[\d,]*)/.exec(text)?.[1]?.replace(/,/g, "") ?? Number.NaN)
}

describe("shop rows", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("puts the unlock line below the row's attributes, inside the copy", () => {
    useGame.setState({ xp: 0, xpTotal: skill(0).baseXpCost, skills: { "1": 1 } })
    const row = renderShop().querySelector<HTMLElement>("[data-row='skill:2']")
    const unlock = row?.querySelector("[data-testid='offer-unlock']")
    expect(unlock?.parentElement?.classList.contains("offer-copy")).toBe(true)
    expect(unlock?.previousElementSibling?.tagName).toBe("P")
    expect(unlock?.previousElementSibling).not.toBe(unlock)
    expect(unlock?.previousElementSibling?.textContent).toContain("owned")
    expect(unlock?.textContent).toMatch(/^[\d,]+ more lifetime XP$/)
    expect(unlock?.querySelector("svg")?.getAttribute("aria-label")).toBe("Locked")
    expect(unlock?.querySelector("svg")).not.toBeNull()
  })

  it("draws a progress bar along the bottom of the row, not inside the emoji or the buttons", () => {
    useGame.setState({ xp: 0, xpTotal: skill(0).baseXpCost, skills: { "1": 1 } })
    const row = renderShop().querySelector<HTMLElement>("[data-row='skill:2']")
    const bar = row?.querySelector<HTMLElement>("[data-testid='offer-progress']")
    expect(bar?.parentElement).toBe(row ?? null)
    expect(bar?.getAttribute("aria-hidden")).toBe("true")
    expect(Number(bar?.style.getPropertyValue("--gate"))).toBeGreaterThanOrEqual(0)
    expect(row?.querySelector(".offer-art-col")?.contains(bar ?? null)).toBe(false)
    expect(row?.querySelector(".offer-actions")?.contains(bar ?? null)).toBe(false)
    const price = row?.querySelector<HTMLButtonElement>(".offer-actions button:not(.ghost)")
    expect(price?.textContent).toMatch(/^Learn /)
  })

  it("counts down and fills as lifetime XP comes in", () => {
    const second = skill(1)
    useGame.setState({ xp: 0, xpTotal: second.unlockAtXp - 100, skills: { "1": 1 } })
    const host = renderShop()
    const row = () => host.querySelector<HTMLElement>("[data-row='skill:2']")
    const before = countLeft(row())
    const fillBefore = Number(row()?.querySelector<HTMLElement>("[data-testid='offer-progress']")?.style.getPropertyValue("--gate"))
    expect(before).toBe(100)

    flushSync(() => useGame.setState({ xpTotal: second.unlockAtXp - 40 }))
    expect(countLeft(row())).toBe(40)
    expect(Number(row()?.querySelector<HTMLElement>("[data-testid='offer-progress']")?.style.getPropertyValue("--gate"))).toBeGreaterThan(fillBefore)
  })

  it("removes the unlock line and the progress bar once the row unlocks", () => {
    const second = skill(1)
    useGame.setState({ xp: 0, xpTotal: second.unlockAtXp - 5, skills: { "1": 1 } })
    const host = renderShop()
    const row = () => host.querySelector<HTMLElement>("[data-row='skill:2']")
    expect(row()?.querySelector("[data-testid='offer-unlock']")).not.toBeNull()

    flushSync(() => useGame.setState({ xpTotal: second.unlockAtXp }))
    expect(row()?.querySelector("[data-testid='offer-unlock']")).toBeNull()
    expect(row()?.querySelector("[data-testid='offer-progress']")).toBeNull()
  })

  it("shows no unlock line or progress bar on a row that was already open", () => {
    useGame.setState({ xp: skill(0).baseXpCost, xpTotal: skill(0).baseXpCost, skills: {} })
    const row = renderShop().querySelector<HTMLElement>("[data-row='skill:1']")
    expect(row?.querySelector("[data-testid='offer-unlock']")).toBeNull()
    expect(row?.querySelector("[data-testid='offer-progress']")).toBeNull()
  })

  it("has no buy bar and no vertical meters", () => {
    useGame.setState({ xp: 0, xpTotal: skill(0).baseXpCost, skills: { "1": 1 } })
    const host = renderShop()
    expect(host.querySelector(".offer-meter, .offer-buy, .offer-gate")).toBeNull()
  })

  it("names the money and the job a gear row still waits on", () => {
    writeSavedShopTab("G")
    useGame.setState({ xpTotal: 20_000, money: 10, peakMoney: 10, equipment: { "1": 1, "2": 1, "3": 1, "4": 1 }, jobs: [], gigs: [] })
    const host = renderShop()
    const waiting = [...host.querySelectorAll<HTMLElement>(".offer")].find((row) => row.querySelector("[data-testid='offer-unlock']"))
    expect(waiting?.querySelector("[data-testid='offer-unlock']")?.textContent).toMatch(/^\$[\d,.]+[KMB]? more held/)
  })

  it("indents the cable kit as a sidegrade, with the keyboard above it left alone", () => {
    writeSavedShopTab("G")
    useGame.setState({ xpTotal: 20_000, money: 1_000_000, peakMoney: 1_000_000, equipment: { "1": 1 }, jobs: [], gigs: [] })
    const host = renderShop()
    const keyboard = host.querySelector<HTMLElement>("[data-row='gear:1']")
    const kit = host.querySelector<HTMLElement>("[data-row='gear:2']")
    expect(keyboard?.classList.contains("sidegrade")).toBe(false)
    expect(kit?.classList.contains("sidegrade")).toBe(true)
    expect(kit?.classList.contains("offer")).toBe(true)
    expect(kit?.querySelector(".side-tag")?.textContent).toBe("sidegrade")
    expect(kit?.querySelector("h3")?.childNodes[0]?.textContent?.trim()).toBe("Cable management kit")
    expect(keyboard?.querySelector(".side-tag")).toBeNull()
  })

  it("marks QA rotation as a branch with no lock, no indent, and the price still the buy", () => {
    writeSavedShopTab("C")
    useGame.setState({
      xpTotal: 2_000_000,
      xp: 2_000_000,
      money: 10_000_000,
      peakMoney: 10_000_000,
      gigs: [1, 2, 3, 4, 5, 6],
      jobs: [1, 2, 3, 4],
    })
    const host = renderShop()
    const qa = host.querySelector<HTMLElement>("[data-row='job:5']")
    expect(qa?.querySelector("h3")?.childNodes[0]?.textContent?.trim()).toBe("QA rotation")
    expect(qa?.classList.contains("branch")).toBe(true)
    expect(qa?.classList.contains("sidegrade")).toBe(false)
    const mark = qa?.querySelector(".branch-mark")
    expect(mark?.textContent).toBe("branch")
    expect(mark?.querySelector("svg.lucide-lock")).toBeNull()
    expect(qa?.querySelector("[data-testid='offer-unlock']")).toBeNull()
    const price = qa?.querySelector<HTMLButtonElement>(".offer-actions button")
    expect(price?.textContent).toMatch(/^Take \$/)
    expect(price?.disabled).toBe(false)
    expect(host.querySelector("[data-row='job:4'] .branch-mark")).toBeNull()
  })

  it("shows a locked job's missing XP and keeps its branch mark without a lock", () => {
    writeSavedShopTab("C")
    useGame.setState({
      xpTotal: 40_000,
      xp: 40_000,
      money: 10_000_000,
      peakMoney: 10_000_000,
      gigs: [1, 2, 3, 4, 5, 6],
      jobs: [1, 2, 3, 4],
    })
    const qa = renderShop().querySelector<HTMLElement>("[data-row='job:5']")
    expect(qa?.querySelector("[data-testid='offer-unlock']")?.textContent).toMatch(/^[\d,.]+[KMB]? more XP$/)
    expect(qa?.querySelector(".branch-mark svg.lucide-lock")).toBeNull()
  })

  describe("jobs: how much money is left", () => {
    const readyJobs = (money: number) => {
      writeSavedShopTab("C")
      useGame.setState({
        xpTotal: 2_000_000,
        xp: 2_000_000,
        money,
        peakMoney: Math.max(money, 10_000),
        gigs: [1, 2, 3, 4, 5, 6],
        jobs: [1, 2, 3, 4],
      })
      return renderShop()
    }
    const job5 = (host: ParentNode) => host.querySelector<HTMLElement>("[data-row='job:5']")
    const fill = (row: HTMLElement | null) => Number(row?.querySelector<HTMLElement>("[data-testid='offer-progress']")?.style.getPropertyValue("--gate"))

    it("fills a bottom bar with the share of the price held and says how much is left", () => {
      const row = job5(readyJobs(1_000))
      const saving = row?.querySelector("[data-testid='offer-saving']")
      expect(saving?.textContent).toMatch(/^\$[\d,.]+[KMB]? more$/)
      expect(saving?.querySelector("svg")?.getAttribute("aria-label")).toBe("Money needed")
      expect(row?.querySelector("[data-testid='offer-progress']")?.getAttribute("data-kind")).toBe("money")
      expect(fill(row)).toBeCloseTo(1_000 / 3_000, 2)
      expect(row?.querySelector("[data-testid='offer-unlock']")).toBeNull()
      expect(row?.querySelector<HTMLButtonElement>(".offer-actions button")?.disabled).toBe(true)
    })

    it("counts down and fills as money comes in", () => {
      const host = readyJobs(1_000)
      const before = fill(job5(host))
      expect(job5(host)?.querySelector("[data-testid='offer-saving']")?.textContent).toBe("$2,000 more")
      flushSync(() => useGame.setState({ money: 2_500 }))
      expect(job5(host)?.querySelector("[data-testid='offer-saving']")?.textContent).toBe("$500 more")
      expect(fill(job5(host))).toBeGreaterThan(before)
    })

    it("clears the line and the bar once the job is affordable", () => {
      const host = readyJobs(1_000)
      flushSync(() => useGame.setState({ money: 3_000 }))
      expect(job5(host)?.querySelector("[data-testid='offer-saving']")).toBeNull()
      expect(job5(host)?.querySelector("[data-testid='offer-progress']")).toBeNull()
      expect(job5(host)?.querySelector<HTMLButtonElement>(".offer-actions button")?.disabled).toBe(false)
    })

    it("shows the XP unlock first, and the money only after the job is open", () => {
      writeSavedShopTab("C")
      useGame.setState({ xpTotal: 40_000, xp: 40_000, money: 1_000, peakMoney: 1_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [1, 2, 3, 4] })
      const row = job5(renderShop())
      expect(row?.querySelector("[data-testid='offer-unlock']")).not.toBeNull()
      expect(row?.querySelector("[data-testid='offer-saving']")).toBeNull()
      expect(row?.querySelector("[data-testid='offer-progress']")?.getAttribute("data-kind")).toBe("unlock")
    })

    it("leaves a hired job without a bar", () => {
      const host = readyJobs(1_000)
      expect(host.querySelector("[data-row='job:4'] [data-testid='offer-progress']")).toBeNull()
      expect(host.querySelector("[data-row='job:4'] [data-testid='offer-saving']")).toBeNull()
    })
  })

  describe("jump to latest arrow", () => {
    function overflow(on: boolean) {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(on ? 2000 : 0)
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(on ? 300 : 0)
    }

    it("sits in the shop header, right beside the hide chevron, not at the bottom of the list", async () => {
      overflow(true)
      const host = renderShop()
      // the list measures itself after it mounts, so the arrow arrives a beat after the first paint
      await vi.waitFor(() => expect(host.querySelector("[data-testid='shop-jump-end']")).not.toBeNull())
      const jump = host.querySelector<HTMLElement>("[data-testid='shop-jump-end']")
      const hide = host.querySelector<HTMLElement>("[data-testid='shop-panel-hide']")
      expect(jump?.parentElement?.classList.contains("shop-head-top")).toBe(true)
      expect(jump?.nextElementSibling).toBe(hide ?? null)
      expect(host.querySelector(".panel-scroll-wrap")?.contains(jump ?? null)).toBe(false)
      expect(host.querySelector(".panel-scroll-end")).toBeNull()
    })

    it("stays away while the list fits on screen", async () => {
      overflow(false)
      const host = renderShop()
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(host.querySelector("[data-testid='shop-jump-end']")).toBeNull()
    })
  })
})
