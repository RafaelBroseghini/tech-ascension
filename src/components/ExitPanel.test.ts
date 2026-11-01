/** @vitest-environment happy-dom */
import { createElement } from "react"
import type { ComponentType } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import { setAdminMode } from "../game/adminMode.ts"
import { setMoneyDirect } from "../game/admin.ts"
import { useGame } from "../game/store.ts"
import { ExitHeadline } from "./ExitPanel.tsx"
import { IdentityPicker } from "./IdentityPicker.tsx"
import { IdeChrome } from "./IdeChrome.tsx"

const roots: Root[] = []

function render<P extends object>(component: ComponentType<P>, props?: P): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(component, props))
  })
  return host
}

function click(el: Element | null | undefined) {
  if (!el) throw new Error("missing element")
  flushSync(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

function press(key: string) {
  flushSync(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
  })
}

const $ = (selector: string) => document.body.querySelector<HTMLElement>(selector)

beforeEach(() => {
  useGame.getState().wipe()
  useGame.getState().keepProfile()
  setAdminMode(true)
})

afterEach(() => {
  flushSync(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  setAdminMode(false)
  useGame.getState().wipe()
})

describe("the Prestige button on the activity bar", () => {
  it("shows in admin mode once the Exit is open or Prestige has been earned, and not before", () => {
    render(IdeChrome)
    expect($("[data-testid='ide-view-prestige']")).toBeNull()
    flushSync(() => setMoneyDirect(PRESTIGE_EARN_SCALE))
    expect($("[data-testid='ide-view-prestige']")).not.toBeNull()
    expect($("[data-testid='ide-view-prestige']")?.getAttribute("aria-label")).toBe("Prestige")
  })

  it("shows with Prestige earned and no open Exit, and never outside admin mode", () => {
    render(IdeChrome)
    flushSync(() => useGame.setState({ legacy: { ...useGame.getState().legacy, runs: 1, prestigeTotal: 3, prestige: 3 } }))
    expect($("[data-testid='ide-view-prestige']")).not.toBeNull()
    flushSync(() => setAdminMode(false))
    expect($("[data-testid='ide-view-prestige']")).toBeNull()
  })

  it("opens the panel with the Exit button, the summary and the perks by track, and Escape closes it", () => {
    flushSync(() => useGame.setState({ legacy: { ...useGame.getState().legacy, runs: 2, prestige: 5, prestigeTotal: 10 } }))
    render(IdeChrome)
    click($("[data-testid='ide-view-prestige']"))
    const panel = $("[data-testid='prestige-panel']")
    expect(panel).not.toBeNull()
    expect($("[data-testid='exit-button']")?.textContent).toContain("Exit")
    expect($("[data-testid='prestige-summary']")?.textContent).toBe("5 Prestige to spend · bonus ×1.3 from 10 earned")
    expect(["network", "capital"].map((id) => $(`[data-testid='legacy-track-${id}']`)?.querySelectorAll("[data-testid^='legacy-']").length)).toEqual([5, 5])
    expect($("[data-testid='legacy-track-founder']")).toBeNull()
    expect($("[data-testid='hall-of-fame']")).toBeNull()
    press("Escape")
    expect($("[data-testid='prestige-panel']")).toBeNull()
  })

  it("buys a perk from the panel", () => {
    flushSync(() => useGame.setState({ legacy: { ...useGame.getState().legacy, runs: 2, prestige: 5, prestigeTotal: 5 } }))
    render(IdeChrome)
    click($("[data-testid='ide-view-prestige']"))
    click($("[data-testid='legacy-network.skills'] button"))
    expect(useGame.getState().legacy.perks).toEqual(["network.skills"])
    expect($("[data-testid='legacy-network.skills']")?.textContent).toContain("Owned")
  })
})

/** The Exit lives in the Prestige panel, opened from the crown on the activity bar. */
function openPrestige() {
  render(IdeChrome)
  click($("[data-testid='ide-view-prestige']"))
}

describe("the Exit button", () => {
  it("lives in the Prestige panel and reads what it pays", () => {
    flushSync(() => setMoneyDirect(PRESTIGE_EARN_SCALE * 8))
    openPrestige()
    expect($("[data-testid='prestige-panel'] [data-testid='exit-button']")?.textContent).toBe("Exit: +2 Prestige (×1 → ×1.06)")
  })

  it("is disabled with no new Prestige on a later career, and the crown is hidden before the Exit opens", () => {
    render(IdeChrome)
    expect($("[data-testid='ide-view-prestige']")).toBeNull()
    flushSync(() => useGame.setState({ legacy: { ...useGame.getState().legacy, runs: 2 } }))
    click($("[data-testid='ide-view-prestige']"))
    expect($("[data-testid='exit-button']")?.textContent).toContain("no new Prestige yet")
    expect(($("[data-testid='exit-button']") as HTMLButtonElement).disabled).toBe(true)
  })

  it("asks twice on the first Exit, names the losses in words, and shows the headline card after it", () => {
    flushSync(() => setMoneyDirect(PRESTIGE_EARN_SCALE * 8))
    openPrestige()
    render(ExitHeadline)
    render(IdentityPicker)
    click($("[data-testid='exit-button']"))
    expect($("[data-testid='exit-confirm']")?.textContent).toContain("Starts over")
    expect($("[data-testid='exit-confirm']")?.textContent).not.toMatch(/product|users|Hall of Fame/)
    click($("[data-testid='exit-yes']"))
    const second = $("[data-testid='exit-first-warning']")?.textContent ?? ""
    expect(second).toContain("start over")
    expect(second).not.toMatch(/product|users|Hall of Fame/)
    expect(useGame.getState().legacy.runs).toBe(1)
    click($("[data-testid='exit-yes']"))
    expect(useGame.getState().legacy.runs).toBe(2)
    // The headline card is up and names the handle.
    expect($("[data-testid='exit-headline']")).not.toBeNull()
    expect($("[data-testid='exit-headline']")?.textContent).toContain("+2 Prestige")
    expect($("[data-testid='exit-headline']")?.textContent).toContain(`@${useGame.getState().profile.handle}`)
    // Nothing the game does on its own takes it down.
    flushSync(() => useGame.getState().tick(useGame.getState().now + 5_000))
    flushSync(() => useGame.setState({ reveals: [] }))
    expect($("[data-testid='exit-headline']")).not.toBeNull()
    click($("[data-testid='exit-headline-done']"))
    expect($("[data-testid='exit-headline']")).toBeNull()
    // The handle stays kept: a later career has nothing to draw, so the start card never reopens.
    expect($("[data-testid='identity-picker']")).toBeNull()
  })

  it("Escape on the confirmation card closes only the card, not the panel behind it", () => {
    flushSync(() => useGame.setState({ legacy: { ...useGame.getState().legacy, runs: 2 } }))
    flushSync(() => setMoneyDirect(PRESTIGE_EARN_SCALE * 8))
    render(IdeChrome)
    click($("[data-testid='ide-view-prestige']"))
    click($("[data-testid='prestige-panel'] [data-testid='exit-button']"))
    expect($("[data-testid='exit-confirm']")).not.toBeNull()
    press("Escape")
    expect($("[data-testid='exit-confirm']")).toBeNull()
    expect($("[data-testid='prestige-panel']")).not.toBeNull()
  })
})
