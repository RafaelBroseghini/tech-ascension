/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { useGame } from "../game/store.ts"
import { HeroMoney } from "./HeroMoney.tsx"
import { StatusRates } from "./StatusRates.tsx"

const roots: Root[] = []

function render(element: Parameters<Root["render"]>[0]): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => root.render(element))
  return host
}

afterEach(() => {
  flushSync(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  useGame.getState().wipe()
})

describe("event multipliers on the balance card", () => {
  it("say nothing until an event leaves one", () => {
    const host = render(createElement(HeroMoney, { stagePanelRef: { current: null } }))
    expect(host.querySelector(".hero-mods")).toBeNull()
  })

  it("show the bonus for good, and a timed one with its seconds left until it ends", () => {
    const now = useGame.getState().now
    useGame.setState({ foreverMult: 1.5, tempMults: { cps: { mult: 2, endsAt: now + 30_000 } } })
    const host = render(createElement(HeroMoney, { stagePanelRef: { current: null } }))
    expect(host.querySelector("[data-testid='forever-mult']")?.textContent).toBe("×1.5")
    expect(host.querySelector("[data-testid='temp-cps']")?.textContent).toContain("30s")
    flushSync(() => useGame.setState({ now: now + 30_000 }))
    expect(host.querySelector("[data-testid='temp-cps']")).toBeNull()
  })
})

describe("idle rates in the status bar", () => {
  it("show nothing before anything pays a second", () => {
    const host = render(createElement(StatusRates))
    expect(host.textContent).toBe("")
  })

  it("show a job's salary and its XP a second", () => {
    useGame.setState({ jobs: [1] })
    const host = render(createElement(StatusRates))
    expect(host.querySelector("[data-testid='per-sec']")?.textContent).toMatch(/^\$[\d.,]+\/s$/)
    expect(host.querySelector("[data-testid='xp-per-sec']")?.textContent).toMatch(/ XP\/s$/)
  })
})
