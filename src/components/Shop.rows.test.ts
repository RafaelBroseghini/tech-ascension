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

describe("shop rows", () => {
  afterEach(() => {
    vi.useRealTimers()
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("puts the lock directly under the unlock bar and the XP icon under the buy bar on a locked skill", () => {
    const first = SKILL_TIERS[0]
    if (!first) throw new Error("missing skill")
    useGame.setState({ xp: 0, xpTotal: first.baseXpCost, skills: { "1": 1 } })
    const row = renderShop().querySelector<HTMLElement>("[data-row='skill:2']")
    const gate = row?.querySelector<HTMLElement>("[data-testid='offer-gate']")
    expect(gate?.nextElementSibling?.getAttribute("aria-label")).toBe("Locked")
    const buy = row?.querySelector<HTMLElement>("[data-testid='offer-buy']")
    expect(buy?.nextElementSibling?.getAttribute("aria-label")).toBe("XP price")
    expect(buy?.style.getPropertyValue("--buy")).toBe("0")
    expect(row?.querySelector(".offer-art-col")?.contains(buy ?? null)).toBe(true)
    expect(row?.querySelector(".offer-actions")?.contains(buy ?? null)).toBe(false)
  })

  it("says what is missing with bars and hover text, not with 'needs' wording", () => {
    const first = SKILL_TIERS[0]
    if (!first) throw new Error("missing skill")
    useGame.setState({ xp: 0, xpTotal: first.baseXpCost, skills: { "1": 1 } })
    const row = renderShop().querySelector<HTMLElement>("[data-row='skill:2']")
    expect(row?.querySelector(".offer-copy p")?.textContent).not.toMatch(/needs|short|more lifetime/)
    expect(row?.querySelector(".offer-meter:not(.is-buy)")?.getAttribute("title")).toMatch(/^Unlock: .* lifetime XP$/)
    expect(row?.querySelector(".offer-meter.is-buy")?.getAttribute("title")).toMatch(/^Buy: /)
    const price = row?.querySelector<HTMLButtonElement>(".offer-actions button:not(.ghost)")
    expect(price?.textContent).toMatch(/^Learn /)
    expect(price?.disabled).toBe(true)
  })

  it("moves the buy bar into the first column once the row is unlocked", () => {
    const first = SKILL_TIERS[0]
    if (!first) throw new Error("missing skill")
    useGame.setState({ xp: first.baseXpCost * 100, xpTotal: first.baseXpCost * 100, skills: {} })
    const col = renderShop().querySelector<HTMLElement>("[data-row='skill:1'] .offer-art-col")
    expect(col?.querySelector("[data-testid='offer-gate']")).toBeNull()
    expect(col?.firstElementChild?.classList.contains("is-buy")).toBe(true)
    expect(col?.querySelector("[aria-label='Money price']")).toBeNull()
    expect(col?.querySelector("[aria-label='XP price']")).not.toBeNull()
  })

  it("opens the lock, sweeps the row, then slides the buy bar left when a row unlocks", () => {
    vi.useFakeTimers()
    const first = SKILL_TIERS[0]
    const second = SKILL_TIERS[1]
    if (!first || !second) throw new Error("missing skills")
    useGame.setState({ xp: 0, xpTotal: first.baseXpCost, skills: { "1": 1 } })
    const host = renderShop()
    const row = () => host.querySelector<HTMLElement>("[data-row='skill:2']")
    expect(row()?.querySelector("[aria-label='Locked']")).not.toBeNull()
    expect(row()?.classList.contains("unlocking")).toBe(false)

    flushSync(() => useGame.setState({ xpTotal: second.unlockAtXp }))
    expect(row()?.classList.contains("unlocking")).toBe(true)
    expect(row()?.querySelector("[data-testid='offer-unlocking'] [aria-label='Unlocked']")).not.toBeNull()
    expect(row()?.querySelector("[aria-label='Locked']")).toBeNull()
    expect(row()?.querySelector(".offer-meter.is-buy")?.classList.contains("is-slid")).toBe(false)

    flushSync(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(row()?.classList.contains("unlocking")).toBe(false)
    expect(row()?.querySelector("[data-testid='offer-unlocking']")).toBeNull()
    expect(row()?.querySelector(".offer-art-col")?.firstElementChild?.classList.contains("is-buy")).toBe(true)
    expect(row()?.querySelector(".is-buy")?.classList.contains("is-slid")).toBe(true)
  })

  it("does not animate a row that was already unlocked when it first showed", () => {
    const first = SKILL_TIERS[0]
    if (!first) throw new Error("missing skill")
    useGame.setState({ xp: first.baseXpCost, xpTotal: first.baseXpCost, skills: {} })
    const row = renderShop().querySelector<HTMLElement>("[data-row='skill:1']")
    expect(row?.classList.contains("unlocking")).toBe(false)
    expect(row?.querySelector(".is-slid")).toBeNull()
  })

  it("fills the buy bar and marks it ready once the price is held", () => {
    const first = SKILL_TIERS[0]
    if (!first) throw new Error("missing skill")
    useGame.setState({ xp: first.baseXpCost * 100, xpTotal: first.baseXpCost * 100, skills: {} })
    const row = renderShop().querySelector<HTMLElement>("[data-row='skill:1']")
    expect(row?.querySelector("[data-testid='offer-buy']")?.getAttribute("style")).toContain("--buy: 1")
    expect(row?.querySelector(".offer-meter.is-buy")?.classList.contains("is-ready")).toBe(true)
  })

  it("uses the money icon for gear and indents the cable kit as a sidegrade", () => {
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
    expect(kit?.querySelector("[data-testid='offer-buy']")?.nextElementSibling?.getAttribute("aria-label")).toBe("Money price")
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
    expect(mark?.querySelector("[aria-label='Locked']")).toBeNull()
    expect(qa?.querySelector("[data-testid='offer-gate']")).toBeNull()
    const price = qa?.querySelector<HTMLButtonElement>(".offer-actions button")
    expect(price?.textContent).toMatch(/^Take \$/)
    expect(price?.disabled).toBe(false)
    expect(host.querySelector("[data-row='job:4'] .branch-mark")).toBeNull()
  })
})
