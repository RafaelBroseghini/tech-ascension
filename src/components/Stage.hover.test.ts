/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { clickPower, xpPerClick } from "../game/economy.ts"
import { setDeskPref } from "../game/desk.ts"
import { useGame } from "../game/store.ts"
import { Stage } from "./Stage.tsx"

function ownCatalog() {
  useGame.setState({
    skills: Object.fromEntries(SKILL_TIERS.map((row) => [String(row.id), 1])),
    equipment: Object.fromEntries(GEAR.map((row) => [String(row.id), 1])),
    owned: Object.fromEntries(CAPITAL.map((row) => [String(row.id), 1])),
    jobs: JOB_TIERS.map((job) => job.id),
    gigs: GIGS.map((gig) => gig.id),
    money: 0,
    xp: 0,
    xpTotal: 1e12,
    peakMoney: 1e12,
    fight: null,
    event: null,
  })
}

const roots: Root[] = []

function renderStage(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(Stage))
  })
  return host
}

function hoverEmoji(host: ParentNode) {
  const button = host.querySelector<HTMLButtonElement>("[data-testid='stage']")
  if (!button) throw new Error("missing stage")
  flushSync(() => {
    button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse", clientX: 40, clientY: 36 }))
  })
  return button
}

describe("hover click", () => {
  afterEach(() => {
    vi.useRealTimers()
    flushSync(() => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    document.body.replaceChildren()
    setDeskPref("hoverClick", false)
    setDeskPref("sounds", true)
    useGame.getState().wipe()
  })

  it("clicks at the ceiling while the pointer rests on the emoji", () => {
    vi.useFakeTimers()
    setDeskPref("sounds", false)
    setDeskPref("hoverClick", true)
    ownCatalog()
    const host = renderStage()
    expect(host.querySelector("[data-testid='stage']")?.getAttribute("data-auto-click")).toBe("on")
    hoverEmoji(host)
    const power = clickPower(useGame.getState())
    const xpEach = xpPerClick(useGame.getState().skills)
    flushSync(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(useGame.getState().money).toBe(power * 20)
    expect(useGame.getState().xp).toBe(xpEach * 20)
  })

  it("does not click until the catalog is complete and the switch is on", () => {
    vi.useFakeTimers()
    setDeskPref("sounds", false)
    setDeskPref("hoverClick", true)
    const locked = renderStage()
    expect(locked.querySelector("[data-testid='stage']")?.getAttribute("data-auto-click")).toBe("off")
    hoverEmoji(locked)
    flushSync(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(useGame.getState().xp).toBe(0)

    document.body.replaceChildren()
    ownCatalog()
    setDeskPref("hoverClick", false)
    const open = renderStage()
    expect(open.querySelector("[data-testid='stage']")?.getAttribute("data-auto-click")).toBe("off")
    hoverEmoji(open)
    flushSync(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(useGame.getState().money).toBe(0)
  })

  it("stops when the pointer leaves", () => {
    vi.useFakeTimers()
    setDeskPref("sounds", false)
    setDeskPref("hoverClick", true)
    ownCatalog()
    const host = renderStage()
    const button = hoverEmoji(host)
    flushSync(() => {
      vi.advanceTimersByTime(200)
    })
    const earned = useGame.getState().money
    expect(earned).toBeGreaterThan(0)
    flushSync(() => {
      button.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse" }))
    })
    flushSync(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(useGame.getState().money).toBe(earned)
  })
})

describe("click reward", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("pops the XP a fresh click pays, once, and not a dollar", () => {
    renderStage()
    const button = document.querySelector<HTMLButtonElement>("[data-testid='stage']")
    if (!button) throw new Error("missing stage")
    flushSync(() => {
      button.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", clientX: 80, clientY: 80, button: 0 }),
      )
    })
    const loot = [...document.querySelectorAll(".loot")].map((el) => el.textContent)
    expect(loot).toEqual(["+1 XP"])
  })
})
