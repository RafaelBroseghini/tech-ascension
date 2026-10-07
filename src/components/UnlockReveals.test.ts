/** @vitest-environment happy-dom */
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useGame } from "../game/store.ts"
import { onSurface } from "../game/surfaces.ts"
import { UnlockReveals } from "./UnlockReveals.tsx"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  vi.useFakeTimers()
  useGame.getState().wipe()
  useGame.getState().keepProfile()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
  useGame.getState().wipe()
})

describe("studio reveal", () => {
  it("Try it opens the studio surface", () => {
    const opened = vi.fn()
    const off = onSurface("studio", opened)
    useGame.setState({ reveals: ["studio"] })
    host = document.createElement("div")
    document.body.append(host)
    root = createRoot(host)
    act(() => root.render(createElement(UnlockReveals)))
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    const action = document.body.querySelector<HTMLButtonElement>("[data-testid='unlock-card-action']")
    expect(action?.textContent).toBe("Try it")
    act(() => action?.click())
    expect(opened).toHaveBeenCalledTimes(1)
    off()
  })
})
