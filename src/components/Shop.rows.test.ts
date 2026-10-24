/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { EQUIPMENT, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { jobById } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
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
    expect(unlock?.textContent).toBe("More lifetime XP")
    expect(unlock?.querySelector("svg")?.getAttribute("aria-label")).toBe("Locked")
    expect(unlock?.querySelector("svg")).not.toBeNull()
  })

  it("shows what a locked row needs in words, with no progress bar and no counts", () => {
    useGame.setState({ xp: 0, xpTotal: skill(0).baseXpCost, skills: { "1": 1 } })
    const host = renderShop()
    const row = host.querySelector<HTMLElement>("[data-row='skill:2']")
    expect(row?.querySelector("[data-testid='offer-progress']")).toBeNull()
    expect(row?.textContent).not.toMatch(/to go|\d+ \/ \d+/)
    const price = row?.querySelector<HTMLButtonElement>(".offer-actions button:not(.ghost)")
    expect(price?.textContent).toBe("Locked")
    expect(price?.disabled).toBe(true)
  })

  it("says which tag a gig still wants skills in", () => {
    writeSavedShopTab("B")
    useGame.setState({ xp: 0, xpTotal: 20_000, skills: { "15": 1, "16": 1 }, gigs: [] })
    const unlock = renderShop().querySelector("[data-row='gig:1'] [data-testid='offer-unlock']")
    expect(unlock?.textContent).toBe("1 more Backend skill")
  })

  it("lists a job's idle XP and its one-time XP lump on the row", () => {
    writeSavedShopTab("C")
    // Holding the first six roles lists Mid-level SWE, the next one, beside them.
    useGame.setState({ xp: 0, xpTotal: 50_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [1, 2, 3, 4, 5, 6] })
    const host = renderShop()
    const job = JOB_TIERS[0]!
    const text = host.querySelector(`[data-row='job:${job.id}'] p`)?.textContent ?? ""
    expect(text).toContain(`+${formatNumber(job.xpPerSec)} XP/s`)
    expect(text).toContain(`+${formatNumber(job.xpLump)} XP once`)
    // A role that does not teach lists neither.
    expect(JOB_TIERS[6]?.xpPerSec).toBe(0)
    expect(JOB_TIERS[6]?.xpLump).toBe(0)
    const plain = host.querySelector(`[data-row='job:7'] p`)
    expect(plain).not.toBeNull()
    expect(plain?.textContent).not.toMatch(/XP/)
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

  it("draws click and salary as icons, with the word as the label", () => {
    useGame.setState({ xp: skill(0).baseXpCost, xpTotal: 200_000, skills: {}, jobs: [], gigs: [1, 2, 3, 4, 5, 6] })
    const labels = (row: ParentNode | null | undefined) => [...(row?.querySelectorAll("svg.stat-icon") ?? [])].map((icon) => icon.getAttribute("aria-label"))

    writeSavedShopTab("A")
    const skills = renderShop().querySelector<HTMLElement>("[data-row='skill:1']")
    expect(skill(0).xpPerClick).toBeGreaterThan(0)
    expect(labels(skills)).toEqual(["click"])
    expect(skills?.textContent).not.toMatch(/click/i)
    expect(skills?.querySelector("p")?.textContent).toMatch(/^\+[\d,.]+ XP/)

    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab("C")
    const job = renderShop().querySelector<HTMLElement>("[data-row='job:1']")
    expect(labels(job)).toEqual(["salary", "click"])
    expect(job?.querySelector("p")?.textContent).not.toMatch(/salary|click/i)
  })

  it("no longer carries a wipe button, which lives in the settings panel", () => {
    const host = renderShop()
    expect(host.querySelector(".wipe")).toBeNull()
    expect(host.textContent).not.toMatch(/wipe/i)
  })

  it("has no buy bar and no vertical meters", () => {
    useGame.setState({ xp: 0, xpTotal: skill(0).baseXpCost, skills: { "1": 1 } })
    const host = renderShop()
    expect(host.querySelector(".offer-meter, .offer-buy, .offer-gate")).toBeNull()
  })

  it("names the balance to reach, not a gap against the best balance ever held", () => {
    writeSavedShopTab("G")
    useGame.setState({ xpTotal: 20_000, money: 10, peakMoney: 10, equipment: { "1": 1, "2": 1, "3": 1, "4": 1 }, jobs: [], gigs: [] })
    const host = renderShop()
    const waiting = [...host.querySelectorAll<HTMLElement>(".offer")].find((row) => row.querySelector("[data-testid='offer-unlock']"))
    expect(waiting?.querySelector("[data-testid='offer-unlock']")?.textContent).toMatch(/^A bigger balance/)
    expect(host.textContent).not.toContain("held")
  })

  it("shows a revealed but unaffordable first gear copy as a plain row, with no bar and no counts", () => {
    writeSavedShopTab("G")
    const first = EQUIPMENT[0]!
    useGame.setState({ xpTotal: 20_000, money: 10, peakMoney: 1_000, equipment: {}, jobs: [], gigs: [] })
    const row = renderShop().querySelector<HTMLElement>(`[data-row='gear:${first.id}']`)
    expect(row?.querySelector("[data-testid='offer-progress']")).toBeNull()
    expect(row?.querySelector("[data-testid='offer-unlock']")).toBeNull()
    expect(row?.querySelector<HTMLButtonElement>(".offer-actions button")?.disabled).toBe(true)
  })

  it("never locks a capital row, and shows no bar toward its price", () => {
    writeSavedShopTab("D")
    const first = CAPITAL[0]!
    useGame.setState({ xpTotal: 200_000, money: first.baseCost / 4, peakMoney: first.baseCost / 2, jobs: [14], gigs: [1], equipment: {}, owned: {} })
    const row = renderShop().querySelector<HTMLElement>(`[data-row='capital:${first.id}']`)
    expect(row?.classList.contains("is-locked")).toBe(false)
    expect(row?.querySelector("[data-testid='offer-unlock']")).toBeNull()
    expect(row?.querySelector("[data-testid='offer-progress']")).toBeNull()
  })

  it("treats a cheaper gear row like any other row: no indent, tag or special card", () => {
    writeSavedShopTab("G")
    useGame.setState({ xpTotal: 20_000, money: 1_000_000, peakMoney: 1_000_000, equipment: { "1": 1 }, jobs: [], gigs: [] })
    const host = renderShop()
    const keyboard = host.querySelector<HTMLElement>("[data-row='gear:1']")
    const kit = host.querySelector<HTMLElement>("[data-row='gear:2']")
    expect(kit?.querySelector("h3")?.childNodes[0]?.textContent?.trim()).toBe("Cable management kit")
    expect(kit?.className.replace(/\b(afford|fresh|flash)\b/g, "").trim()).toBe(keyboard?.className.replace(/\b(afford|fresh|flash)\b/g, "").trim())
    expect(kit?.querySelector(".side-tag, .branch-mark")).toBeNull()
    expect(kit?.querySelector(".offer-art-col")).not.toBeNull()
    // the keyboard comes first, though the kit costs less
    const order = [...host.querySelectorAll(".shop-list .offer")].map((row) => row.getAttribute("data-row"))
    expect(order).toEqual(["gear:1", "gear:2"])
  })

  it("treats a cheaper job like any other job: the same row, the price is the buy", () => {
    writeSavedShopTab("C")
    useGame.setState({
      xpTotal: 2_000_000,
      xp: 2_000_000,
      money: 10_000_000,
      peakMoney: 10_000_000,
      gigs: [1, 2, 3, 4, 5, 6],
      jobs: [1, 2, 3, 4],
    })
    const qa = renderShop().querySelector<HTMLElement>("[data-row='job:5']")
    expect(qa?.querySelector("h3")?.childNodes[0]?.textContent?.trim()).toBe("QA rotation")
    expect(qa?.className.split(/\s+/).sort()).toEqual(["afford", "offer"].sort())
    expect(qa?.querySelector(".branch-mark, .side-tag")).toBeNull()
    const price = qa?.querySelector<HTMLButtonElement>(".offer-actions button")
    expect(price?.textContent).toMatch(/^[\d,]+ XP$/)
    expect(price?.disabled).toBe(false)
  })

  it("shows a locked job's missing XP in the unlock line", () => {
    writeSavedShopTab("C")
    useGame.setState({
      xpTotal: JOB_TIERS.find((job) => job.id === 5)!.xpReq - 1,
      xp: JOB_TIERS.find((job) => job.id === 5)!.xpReq - 1,
      money: 10_000_000,
      peakMoney: 10_000_000,
      gigs: [1, 2, 3, 4, 5, 6],
      jobs: [1, 2, 3, 4],
    })
    const qa = renderShop().querySelector<HTMLElement>("[data-row='job:5']")
    expect(qa?.querySelector("[data-testid='offer-unlock']")?.textContent).toBe("More XP")
  })

  describe("jobs: paid for in XP", () => {
    const cost = jobById(5)!.xpCost
    const readyJobs = (xp: number) => {
      writeSavedShopTab("C")
      useGame.setState({ xpTotal: 2_000_000, xp, money: 0, peakMoney: 10_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [1, 2, 3, 4] })
      return renderShop()
    }
    const job5 = (host: ParentNode) => host.querySelector<HTMLElement>("[data-row='job:5']")

    it("holds the button shut until the XP is in hand, with no bar saying how far along it is", () => {
      const host = readyJobs(Math.floor(cost * 0.4))
      expect(job5(host)?.querySelector("[data-testid='offer-progress']")).toBeNull()
      expect(job5(host)?.querySelector<HTMLButtonElement>(".offer-actions button")?.disabled).toBe(true)
      expect(job5(host)?.querySelector(".offer-actions button")?.textContent).toMatch(/^[\d,]+ XP$/)
      flushSync(() => useGame.setState({ xp: cost }))
      expect(job5(host)?.querySelector<HTMLButtonElement>(".offer-actions button")?.disabled).toBe(false)
    })

    it("says a job's XP requirement in words while it is locked", () => {
      writeSavedShopTab("C")
      useGame.setState({ xpTotal: JOB_TIERS.find((job) => job.id === 5)!.xpReq - 1, xp: JOB_TIERS.find((job) => job.id === 5)!.xpReq - 1, money: 1_000, peakMoney: 1_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [1, 2, 3, 4] })
      const row = job5(renderShop())
      expect(row?.querySelector("[data-testid='offer-unlock']")?.textContent).toBe("More XP")
      expect(row?.querySelector(".offer-actions button")?.textContent).toBe("Locked")
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
