/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { MetricsModal } from "./MetricsModal.tsx"
import { useGame } from "../game/store.ts"
import { emptyStats } from "../game/stats.ts"

describe("metrics modal", () => {
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  afterEach(() => {
    root.unmount()
    host.remove()
    useGame.getState().wipe()
  })

  it("lists tracked stats", () => {
    useGame.setState({
      stats: { ...emptyStats(), totalClicks: 42, lifetimeEarned: 900, moneyFromClicks: 100 },
      peakMoney: 500,
    })
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
    flushSync(() => {
      root.render(createElement(MetricsModal, { onClose: () => {} }))
    })

    const dialog = document.body.querySelector("[data-testid='stats-modal']")
    expect(dialog?.textContent).toContain("Lifetime earnings")
    expect(dialog?.textContent).toContain("$900")
    // Click totals are not stats here; the click rates are on the balance card.
    expect(dialog?.textContent).not.toContain("Total clicks")
    expect(dialog?.textContent).not.toContain("From clicking")
  })
})
