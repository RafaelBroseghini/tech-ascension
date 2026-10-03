/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { useGame } from "../game/store.ts"
import { EventModal } from "./EventModal.tsx"

function renderModal(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(createElement(EventModal))
  })
  return host
}

describe("event modal", () => {
  afterEach(() => {
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("opens an event without looping on the offer snapshot", () => {
    useGame.setState({ money: 1_000, peakMoney: 1_000, xp: 1_000, xpTotal: 1_000 })
    expect(useGame.getState().fireEvent(21)).toBe(true)
    const host = renderModal()
    const dialog = host.querySelector("[data-testid='event-modal']")
    expect(dialog?.getAttribute("data-event")).toBe("21")
    expect(host.querySelector("[data-testid='event-lines']")?.textContent).toContain("$")
    flushSync(() => {
      useGame.getState().tick(useGame.getState().now + 1_000)
    })
    expect(host.querySelector("[data-testid='event-modal']")).toBe(dialog)
  })
})
