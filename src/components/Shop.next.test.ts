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

  it("opens the missing skill when the suggestion is the locked gig board", () => {
    writeSavedShopTab("B")
    useGame.setState({ xp: 14_000, xpTotal: 14_000, skills: { "15": 1 } })
    const host = renderShop()
    expect(host.querySelector("[data-row='skill:16']")).toBeNull()

    clickNext(host)

    const row = host.querySelector("[data-row='skill:16']")
    expect(host.querySelector("[data-testid='shop']")?.getAttribute("data-phase")).toBe("A")
    expect(row?.querySelector("h3")?.textContent).toContain("React")
  })

  it("opens the next gig when the job board is what the suggestion names", () => {
    writeSavedShopTab("C")
    useGame.setState({
      xp: 80_000,
      xpTotal: 80_000,
      skills: { "15": 1, "16": 1 },
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
