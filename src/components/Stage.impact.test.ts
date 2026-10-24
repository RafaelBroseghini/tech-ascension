/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { useGame } from "../game/store.ts"
import { Stage } from "./Stage.tsx"
import { loadMotion } from "./useMotion.ts"

const roots: Root[] = []

function renderStage(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => root.render(createElement(Stage)))
  return host
}

const reduced = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: on && query.includes("reduce"), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

function tap(host: ParentNode, clientX = 40, clientY = 36) {
  const button = host.querySelector<HTMLButtonElement>("[data-testid='stage']")!
  flushSync(() => {
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0, buttons: 1, clientX, clientY }))
  })
}

describe("the click bump", () => {
  beforeAll(async () => {
    await loadMotion()
  })

  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    useGame.getState().wipe()
    reduced(false)
  })

  it("kicks the sprite the moment of the click and hands it back to the stylesheet once the spring has settled", async () => {
    reduced(false)
    const host = renderStage()
    const tilt = host.querySelector<HTMLElement>(".sprite-tilt")!
    tap(host)
    // Written in the click's own turn, not a frame later, so the sprite never lags the press.
    expect(tilt.style.transform).toContain("perspective(700px)")
    await vi.waitFor(() => expect(tilt.style.transform).toBe(""), { timeout: 3000 })
  })

  it("lets a run of clicks take the sprite over without leaving any of them behind", async () => {
    reduced(false)
    const host = renderStage()
    const tilt = host.querySelector<HTMLElement>(".sprite-tilt")!
    for (let i = 0; i < 12; i++) tap(host, 20 + i * 5, 30)
    expect(tilt.style.transform).toContain("perspective(700px)")
    await vi.waitFor(() => expect(tilt.style.transform).toBe(""), { timeout: 3000 })
  })

  it("only fades for a player who asked for reduced motion", () => {
    reduced(true)
    const host = renderStage()
    const tilt = host.querySelector<HTMLElement>(".sprite-tilt")!
    tap(host)
    expect(tilt.style.transform).toBe("")
  })
})
