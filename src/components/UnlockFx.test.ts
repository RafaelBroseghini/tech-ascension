/** @vitest-environment happy-dom */
import { createElement, createRef } from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useGame } from "../game/store.ts"
import { UnlockFx } from "./UnlockFx.tsx"

describe("the unlock celebration", () => {
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let vibrate: ReturnType<typeof vi.fn>
  const reduced = (on: boolean) => {
    window.matchMedia = ((query: string) => ({ matches: on && query.includes("reduce"), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
  }

  beforeEach(() => {
    vi.useFakeTimers()
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vibrate = vi.fn()
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true })
    reduced(false)
    useGame.getState().wipe()
    act(() => root.render(createElement(UnlockFx, { panelRef: createRef<HTMLElement>(), hitboxRef: createRef<HTMLButtonElement>() })))
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
  })

  const celebrate = () => act(() => useGame.setState((state) => ({ celebrationNonce: state.celebrationNonce + 1 })))

  it("is a canvas the pointer cannot reach and a screen reader skips", () => {
    const canvas = host.querySelector("canvas.unlock-fx")
    expect(canvas).not.toBeNull()
    expect(canvas?.getAttribute("aria-hidden")).toBe("true")
  })

  it("buzzes a phone once for an unlock, and treats two announcements of one moment as one", () => {
    celebrate()
    expect(vibrate).toHaveBeenCalledTimes(1)
    celebrate()
    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it("plays nothing, and buzzes nothing, for a player who asked for reduced motion", () => {
    reduced(true)
    celebrate()
    expect(vibrate).not.toHaveBeenCalled()
  })

  it("does not throw with no stage to draw on or no 2d canvas, and a cleared gig does not buzz", () => {
    expect(() => {
      celebrate()
      vi.advanceTimersByTime(500)
    }).not.toThrow()
    vibrate.mockClear()
    vi.advanceTimersByTime(1000)
    act(() => useGame.setState({ pop: { id: 99, kind: "gigClear", size: "large", amount: 40, label: "Gig cleared" } as never }))
    expect(vibrate).not.toHaveBeenCalled()
  })
})
