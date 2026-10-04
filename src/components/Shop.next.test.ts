/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

const ownedAll = (rows: readonly { id: number }[]) => Object.fromEntries(rows.map((row) => [String(row.id), 1]))

function renderShop(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(createElement(Shop))
  })
  return host
}

function clickNext(host: ParentNode) {
  const button = host.querySelector<HTMLButtonElement>('[data-testid="next-unlock"]')
  if (!button) throw new Error("missing next button")
  flushSync(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("next suggestion click", () => {
  const rect = Element.prototype.getBoundingClientRect

  afterEach(() => {
    Element.prototype.getBoundingClientRect = rect
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("scrolls the shop to the skill the suggestion names", () => {
    writeSavedShopTab("D")
    useGame.setState({
      xp: 2e7,
      xpTotal: 2e7,
      money: 600_000,
      peakMoney: 600_000,
      skills: ownedAll(SKILL_TIERS.slice(0, 40)),
      gigs: [1, 2, 3, 4, 5, 6],
    })
    const host = renderShop()
    expect(host.querySelector("[data-row='skill:41']")).toBeNull()
    Element.prototype.getBoundingClientRect = function () {
      const el = this as HTMLElement
      if (el.classList?.contains("shop-list")) return new DOMRect(0, 0, 420, 240)
      if (el.dataset?.row) {
        const rows = [...document.querySelectorAll<HTMLElement>(".shop-list .offer")]
        return new DOMRect(0, rows.indexOf(el) * 90, 420, 80)
      }
      return new DOMRect(0, 0, 0, 0)
    }

    clickNext(host)

    const list = host.querySelector<HTMLElement>(".shop-list")
    const row = host.querySelector<HTMLElement>("[data-row='skill:41']")
    expect(host.querySelector("[data-testid='shop']")?.getAttribute("data-phase")).toBe("A")
    expect(row?.querySelector("h3")?.textContent).toContain(SKILL_TIERS[40]?.name)
    expect(list?.scrollTop ?? 0).toBeGreaterThan(1500)

    if (list) list.scrollTop = 0
    clickNext(host)
    expect(list?.scrollTop ?? 0).toBeGreaterThan(1500)
  })

  it("opens the next unbought skill instead of a locked board", () => {
    writeSavedShopTab("B")
    const skills = Object.fromEntries(SKILL_TIERS.slice(0, 15).map((row) => [String(row.id), 1]))
    useGame.setState({ xp: 14_000, xpTotal: 14_000, skills })
    const host = renderShop()
    expect(host.querySelector("[data-testid='next-unlock']")?.textContent).toContain("React")
    expect(host.querySelector("[data-testid='next-unlock']")?.textContent).not.toContain("Gig Board")
    expect(host.querySelector("[data-row='skill:16']")).toBeNull()

    clickNext(host)

    const row = host.querySelector("[data-row='skill:16']")
    expect(host.querySelector("[data-testid='shop']")?.getAttribute("data-phase")).toBe("A")
    expect(row?.querySelector("h3")?.textContent).toContain("React")
  })

  it("names the first skill on a fresh career and keeps the gate off the buy button", () => {
    const host = renderShop()
    const next = host.querySelector("[data-testid='next-unlock']")
    expect(next?.textContent).toContain(SKILL_TIERS[0]?.name)
    expect(next?.textContent).not.toContain("Gear")
    const row = host.querySelector<HTMLElement>("[data-row='skill:1']")
    const buy = row?.querySelector<HTMLButtonElement>(".offer-actions button:not(.ghost)")
    expect(buy?.textContent).toMatch(/Learn/)
    expect(buy?.textContent).not.toContain("Locked")
    expect(buy?.disabled).toBe(true)
    expect(row?.querySelector("[data-testid='offer-unlock']")).toBeNull()
    expect(row?.querySelector("[data-testid='offer-veil']")).toBeNull()
    expect(row?.querySelector(".offer-art-col img")).toBeTruthy()
    expect(row?.classList.contains("afford")).toBe(false)
    expect(row?.style.opacity ?? "").toBe("")
  })

  it("dims a locked skill across the row, says what is missing under its attributes, and leaves the emoji in color", () => {
    const first = SKILL_TIERS[0]
    if (!first) throw new Error("missing skill")
    useGame.setState({ xp: 0, xpTotal: first.baseXpCost, skills: { "1": 1 } })
    const host = renderShop()
    const row = host.querySelector<HTMLElement>("[data-row='skill:2']")
    expect(host.querySelector("[data-testid='next-unlock']")?.textContent).toContain(SKILL_TIERS[1]?.name)
    const unlock = row?.querySelector<HTMLElement>("[data-testid='offer-unlock']")
    expect(unlock).toBeTruthy()
    expect(row?.querySelector(".offer-actions")?.contains(unlock ?? null)).toBe(false)
    expect(row?.querySelector(".offer-copy")?.contains(unlock ?? null)).toBe(true)
    const buy = row?.querySelector(".offer-actions button")
    expect(buy?.textContent).toMatch(/Learn/)
    expect(buy?.textContent).not.toContain("Locked")
    const veil = row?.querySelector<HTMLElement>("[data-testid='offer-veil']")
    expect(veil?.parentElement).toBe(row ?? null)
    expect(row?.querySelector(".offer-art-col")?.contains(veil ?? null)).toBe(false)
    expect(row?.querySelector(".offer-art-col img")).toBeTruthy()
    expect(row?.style.opacity ?? "").toBe("")
  })

  it("opens the next gig when the job board is what the suggestion names", () => {
    writeSavedShopTab("C")
    useGame.setState({
      xp: 80_000,
      xpTotal: 80_000,
      skills: ownedAll(SKILL_TIERS),
      gigs: [1, 2, 3, 4, 5],
    })
    const host = renderShop()

    clickNext(host)

    expect(host.querySelector("[data-testid='shop']")?.getAttribute("data-phase")).toBe("B")
    expect(host.querySelector("[data-row='gig:6'] h3")?.textContent).toContain(GIGS[5]?.name)
  })

  it("switches to the capital era that holds the next row", () => {
    writeSavedShopTab("D")
    useGame.setState({
      xp: 1e15,
      xpTotal: 1e15,
      money: 1e18,
      peakMoney: 1e18,
      skills: ownedAll(SKILL_TIERS),
      gigs: GIGS.map((gig) => gig.id),
      jobs: JOB_TIERS.map((job) => job.id),
      equipment: ownedAll(GEAR),
      owned: ownedAll(CAPITAL.slice(0, 5)),
    })
    const host = renderShop()
    expect(host.querySelector("[data-row='capital:6']")).toBeNull()
    expect(host.querySelector('.era-sub [aria-selected="true"]')?.textContent).toBe("Mid")

    clickNext(host)

    expect(host.querySelector('.era-sub [aria-selected="true"]')?.textContent).toBe("Upper")
    expect(host.querySelector("[data-row='capital:6'] h3")?.textContent).toContain(CAPITAL[5]?.name)
  })
})
