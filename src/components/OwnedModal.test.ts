/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { OwnedButton } from "./OwnedModal.tsx"
import { useGame } from "../game/store.ts"

describe("owned modal", () => {
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    useGame.getState().wipe()
  })

  it("opens the owned list from its button and closes on Escape", () => {
    useGame.setState({ jobs: [1] })
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    act(() => root.render(createElement(OwnedButton)))

    expect(document.body.querySelector("[data-testid='owned-modal']")).toBeNull()
    act(() => host.querySelector<HTMLButtonElement>("[data-testid='owned-open']")!.click())
    const dialog = document.body.querySelector("[data-testid='owned-modal']")
    expect(dialog?.getAttribute("role")).toBe("dialog")
    expect(dialog?.querySelector("[data-testid='owned-strip']")).not.toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(document.body.querySelector("[data-testid='owned-modal']")).toBeNull()
  })
})
