/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { getDeskPrefs, parseDeskPrefs, setDeskPref } from "../game/desk.ts"
import { MotionModeList } from "./deskSettingsPanels.tsx"

describe("the motion setting", () => {
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    setDeskPref("motion", "system")
  })

  it("lists both modes, marks the chosen one, and puts the choice on the document for the stylesheet", () => {
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const render = () => act(() => root.render(createElement(MotionModeList, { desk: getDeskPrefs() })))
    render()
    const option = (id: string) => host.querySelector<HTMLButtonElement>(`[data-testid='desk-motion-${id}']`)!
    expect(option("system").getAttribute("aria-selected")).toBe("true")
    expect(option("full").getAttribute("aria-selected")).toBe("false")
    act(() => option("full").click())
    render()
    expect(getDeskPrefs().motion).toBe("full")
    expect(document.documentElement.dataset.motion).toBe("full")
    expect(option("full").getAttribute("aria-selected")).toBe("true")
    expect(parseDeskPrefs({ motion: getDeskPrefs().motion }).motion).toBe("full")
  })
})
