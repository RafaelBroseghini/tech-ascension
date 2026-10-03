/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { useGame } from "../game/store.ts"
import { Stage } from "./Stage.tsx"
import { StickyNote } from "./StickyNote.tsx"
import { Toast } from "./Toast.tsx"

const roots: Root[] = []

function render(node: ReturnType<typeof createElement>): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(node)
  })
  return host
}

describe("offline sticky note", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("shows the diary and the credit, and a click clears it", () => {
    useGame.setState({ toast: { id: 4, text: "credited $12", note: "The build stayed green." } })
    const noteHost = render(createElement(StickyNote))
    const note = noteHost.querySelector("[data-testid='sticky-note']")
    expect(note?.textContent).toContain("While you were out")
    expect(note?.textContent).toContain("The build stayed green.")
    expect(note?.textContent).toContain("credited $12")

    const toastHost = render(createElement(Toast))
    expect(toastHost.querySelector("[data-testid='toast']")).toBeNull()

    flushSync(() => {
      note?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(useGame.getState().toast).toBeNull()
  })

  it("sticks the note to the stage", () => {
    useGame.setState({ toast: { id: 5, text: "studied +8 XP", note: "The cat slept on the warm laptop." } })
    const host = render(createElement(Stage))
    const stage = host.querySelector(".stage-panel")
    const note = stage?.querySelector("[data-testid='sticky-note']")
    expect(note?.textContent).toContain("The cat slept on the warm laptop.")
    expect(note?.textContent).toContain("studied +8 XP")
  })

  it("leaves ordinary toasts on the banner", () => {
    useGame.setState({ toast: { id: 2, text: "Job Board unlocked" } })
    const noteHost = render(createElement(StickyNote))
    expect(noteHost.querySelector("[data-testid='sticky-note']")).toBeNull()
    const toastHost = render(createElement(Toast))
    expect(toastHost.querySelector("[data-testid='toast']")?.textContent).toBe("Job Board unlocked")
  })
})
