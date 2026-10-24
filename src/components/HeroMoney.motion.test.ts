/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { useGame } from "../game/store.ts"
import { HeroMoney } from "./HeroMoney.tsx"
import { loadMotion } from "./useMotion.ts"

const roots: Root[] = []

function render(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => root.render(createElement(HeroMoney, { stagePanelRef: { current: null } })))
  return host
}

const reduced = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: on && query.includes("reduce"), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

const shown = (host: ParentNode) => host.querySelector("[data-testid='money']")?.textContent ?? ""
const clear = (amount: number, id = 1) => ({ id, kind: "gigClear" as const, size: "large" as const, amount, label: "Gig" })

describe("the money readout", () => {
  beforeAll(async () => {
    await loadMotion()
  })

  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    useGame.getState().wipe()
    reduced(false)
  })

  it("counts a cleared gig up from the balance before the payout and lands on the true balance", async () => {
    reduced(false)
    useGame.setState({ money: 5000, peakMoney: 5000 })
    const host = render()
    expect(shown(host)).toBe("$5,000")
    flushSync(() => useGame.setState({ money: 5120, pop: clear(120) }))
    // The payout is not shown at once: the number starts where the player was.
    expect(Number(shown(host).replace(/[$,]/g, ""))).toBeLessThan(5120)
    await vi.waitFor(() => expect(shown(host)).toBe("$5,120"), { timeout: 3000 })
  })

  it("shows the balance as it is, with no count-up, for a player who asked for reduced motion", () => {
    reduced(true)
    useGame.setState({ money: 5000, peakMoney: 5000 })
    const host = render()
    flushSync(() => useGame.setState({ money: 5120, pop: clear(120) }))
    expect(shown(host)).toBe("$5,120")
  })

  it("squashes the number on a large pop and gives its styles back when it has settled", async () => {
    reduced(false)
    useGame.setState({ money: 5000, peakMoney: 5000 })
    const host = render()
    const value = host.querySelector<HTMLElement>("[data-testid='money']")!
    flushSync(() => useGame.setState({ money: 5120, pop: clear(120) }))
    await vi.waitFor(() => expect(value.getAttribute("style") ?? "").toBe(""), { timeout: 3000 })
  })
})
