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
  flushSync(() => {
    createRoot(host).render(createElement(EventModal))
  })
  return host
}

function tab(shift = false) {
  const press = new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true, cancelable: true })
  document.dispatchEvent(press)
  return press
}

describe("focus trap", () => {
  afterEach(() => {
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("wraps Tab inside the dialog and gives focus back to the opener on close", () => {
    const outside = document.createElement("button")
    document.body.append(outside)
    outside.focus()

    useGame.setState({ money: 1_000, peakMoney: 1_000, xp: 1_000, xpTotal: 1_000 })
    expect(useGame.getState().fireEvent(21)).toBe(true)
    const host = renderModal()
    const dialog = host.querySelector<HTMLElement>("[data-testid='event-modal']")!
    const yes = host.querySelector<HTMLElement>("[data-testid='event-yes']")!
    const no = host.querySelector<HTMLElement>("[data-testid='event-no']")!
    expect(document.activeElement).toBe(dialog)

    // On the dialog itself, Tab lands on the first control and Shift+Tab on the last.
    expect(tab().defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(yes)
    no.focus()
    expect(tab().defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(yes)
    expect(tab(true).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(no)

    // Between the ends the browser moves focus itself.
    no.focus()
    yes.focus()
    expect(tab().defaultPrevented).toBe(false)

    flushSync(() => {
      useGame.getState().dismissEvent()
    })
    expect(host.querySelector("[data-testid='event-modal']")).toBeNull()
    expect(document.activeElement).toBe(outside)
  })
})
