/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { RostersButton } from "./RostersButton.tsx"
import { getOpenRoster, setOpenRoster } from "../game/rosterModal.ts"
import { useGame } from "../game/store.ts"

describe("rosters button", () => {
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    setOpenRoster(null)
    useGame.getState().wipe()
  })

  const mount = () => {
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    act(() => root.render(createElement(RostersButton)))
  }

  it("waits for the rosters unlock, then opens the list and hands a pick to the roster modal", () => {
    mount()
    expect(host.querySelector("[data-testid='rosters-open']")).toBeNull()

    act(() => useGame.setState({ unlocked: ["rosters"] }))
    act(() => host.querySelector<HTMLButtonElement>("[data-testid='rosters-open']")!.click())
    expect(document.body.querySelector("[data-testid='rosters-menu']")?.getAttribute("role")).toBe("dialog")

    act(() => document.body.querySelector<HTMLButtonElement>("[data-testid='status-roster-skills']")!.click())
    expect(getOpenRoster()).toBe("skills")
    expect(document.body.querySelector("[data-testid='rosters-menu']")).toBeNull()
  })
})
