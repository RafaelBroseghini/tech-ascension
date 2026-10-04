/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { useGame } from "../game/store.ts"
import { MetricsBar } from "./MetricsBar.tsx"

function renderBar(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(createElement(MetricsBar))
  })
  return host
}

describe("header click rate", () => {
  afterEach(() => {
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("does not claim a dollar a click does not pay", () => {
    const host = renderBar()
    expect(host.querySelector("[data-testid='per-click']")?.textContent).toBe("$0")
    expect(host.querySelector("[data-testid='xp-per-click']")?.textContent).toBe("1")
  })

  it("shows the dollar once a job pays it", () => {
    useGame.setState({ jobs: [1] })
    const host = renderBar()
    expect(host.querySelector("[data-testid='per-click']")?.textContent).toBe("$1")
  })
})
