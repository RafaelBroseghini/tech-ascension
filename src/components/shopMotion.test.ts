/** @vitest-environment happy-dom */
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { bump, rowEnter, sweepRef, useOnChange } from "./shopMotion.ts"
import { loadMotion } from "./useMotion.ts"

const reduced = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: on && query.includes("reduce"), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

/** happy-dom has no layout, so a row only animates where the test says it is on screen. */
const layout = (on: boolean) => {
  Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => (on ? [{ width: 1, height: 1 }] : []) })
}

function list(rows: number): HTMLElement[] {
  const panel = document.createElement("div")
  panel.className = "shop-list"
  document.body.append(panel)
  return Array.from({ length: rows }, (_, i) => {
    const row = document.createElement("article")
    row.className = "offer"
    row.style.setProperty("--i", String(i))
    panel.append(row)
    return row
  })
}

describe("rows opening in the shop", () => {
  beforeAll(async () => {
    await loadMotion()
  })

  beforeEach(() => {
    reduced(false)
    layout(true)
  })

  afterEach(() => {
    document.body.replaceChildren()
    layout(false)
    vi.useRealTimers()
  })

  it("leaves the rows that arrive with a list alone, and eases in one that opens later", async () => {
    const [first, second] = list(2)
    rowEnter(first!)
    rowEnter(second!)
    expect(first!.style.opacity).toBe("")
    expect(second!.style.opacity).toBe("")
    await new Promise((resolve) => setTimeout(resolve, 160))
    const late = document.createElement("article")
    late.style.setProperty("--i", "2")
    first!.parentElement!.append(late)
    rowEnter(late)
    expect(late.style.opacity).toBe("0")
    // It hands its styles back once it has arrived.
    await vi.waitFor(() => expect(late.style.opacity).toBe(""), { timeout: 3000 })
    expect(late.style.transform).toBe("")
  })

  it("only fades a row in for a player who asked for reduced motion", async () => {
    const [first] = list(1)
    rowEnter(first!)
    await new Promise((resolve) => setTimeout(resolve, 160))
    reduced(true)
    const late = document.createElement("article")
    first!.parentElement!.append(late)
    rowEnter(late)
    expect(late.style.opacity).toBe("0")
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(late.style.transform).toBe("")
  })

  it("does nothing outside a shop list or without a layout", async () => {
    const lone = document.createElement("article")
    document.body.append(lone)
    rowEnter(lone)
    expect(lone.style.opacity).toBe("")
    layout(false)
    const [row] = list(1)
    rowEnter(row!)
    expect(row!.style.opacity).toBe("")
  })

  it("sweeps a bought row with Motion, and leaves the element alone for reduced motion", async () => {
    const sweep = document.createElement("i")
    document.body.append(sweep)
    sweepRef(sweep)
    await vi.waitFor(() => expect(sweep.getAttribute("style") ?? "").not.toBe(""), { timeout: 3000 })
    reduced(true)
    const still = document.createElement("i")
    document.body.append(still)
    sweepRef(still)
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(still.getAttribute("style") ?? "").toBe("")
  })

  it("bumps a count and gives its styles back, and does not for reduced motion", async () => {
    const count = document.createElement("span")
    document.body.append(count)
    expect(bump(count)).not.toBeNull()
    await vi.waitFor(() => expect(count.getAttribute("style") ?? "").toBe(""), { timeout: 3000 })
    reduced(true)
    expect(bump(count)).toBeNull()
  })
})

describe("useOnChange", () => {
  let root: Root
  let host: HTMLDivElement

  beforeAll(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  beforeEach(() => {
    host = document.createElement("div")
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.replaceChildren()
  })

  it("plays when the value changes and not on the first render or a repeat", () => {
    const play = vi.fn(() => null)
    const held: { current: HTMLSpanElement | null } = { current: null }
    function Count({ value }: { value: number }) {
      useOnChange(held, value, play)
      return createElement("span", { ref: held }, value)
    }
    act(() => root.render(createElement(Count, { value: 1 })))
    expect(play).not.toHaveBeenCalled()
    act(() => root.render(createElement(Count, { value: 1 })))
    expect(play).not.toHaveBeenCalled()
    act(() => root.render(createElement(Count, { value: 2 })))
    expect(play).toHaveBeenCalledTimes(1)
  })
})
