/** @vitest-environment happy-dom */
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { bump, rowEnter, springSheet, sweepRef } from "./shopMotion.ts"
import { loadMotion, useOnChange } from "./useMotion.ts"

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

  it("can be held to the changes it cares about, like a count that went up", () => {
    const play = vi.fn(() => null)
    const rose = (next: number, previous: number) => next > previous
    const held: { current: HTMLSpanElement | null } = { current: null }
    function Count({ value }: { value: number }) {
      useOnChange(held, value, play, rose)
      return createElement("span", { ref: held }, value)
    }
    act(() => root.render(createElement(Count, { value: 3 })))
    act(() => root.render(createElement(Count, { value: 2 })))
    expect(play).not.toHaveBeenCalled()
    act(() => root.render(createElement(Count, { value: 5 })))
    expect(play).toHaveBeenCalledTimes(1)
  })
})

describe("the phone sheet settling after a drag", () => {
  beforeAll(async () => {
    await loadMotion()
  })

  beforeEach(() => reduced(false))

  afterEach(() => {
    document.body.replaceChildren()
  })

  /** A sheet the finger left at 158px, with the class that says it rests at `rest` px. */
  function sheet(rest: number): HTMLElement {
    const el = document.createElement("aside")
    el.className = "shop is-docked is-dragging is-expanding"
    el.style.maxHeight = "158px"
    el.style.height = "158px"
    document.body.append(el)
    // The layout the stylesheet would give it: the inline height while it is set, the resting height once it is not.
    el.getBoundingClientRect = () => ({ height: el.style.maxHeight ? parseFloat(el.style.maxHeight) : rest }) as DOMRect
    return el
  }

  it("carries the sheet from where the finger left it to where its class rests, then hands it back to the stylesheet", async () => {
    const el = sheet(46)
    springSheet(el, 158, 0)
    await vi.waitFor(() => expect(el.style.maxHeight).not.toBe("158px"), { timeout: 3000 })
    // On the way: both heights move together, and the drag's class holds the transition off.
    expect(parseFloat(el.style.height)).toBeCloseTo(parseFloat(el.style.maxHeight), 1)
    expect(el.classList.contains("is-dragging")).toBe(true)
    await vi.waitFor(() => expect(el.style.maxHeight).toBe(""), { timeout: 3000 })
    expect(el.style.height).toBe("")
    expect(el.classList.contains("is-dragging")).toBe(false)
    expect(el.classList.contains("is-expanding")).toBe(false)
  })

  it("never goes past either end, whatever speed the finger had", async () => {
    const el = sheet(46)
    const seen: number[] = []
    const watch = new MutationObserver(() => seen.push(parseFloat(el.style.maxHeight)))
    watch.observe(el, { attributes: true, attributeFilter: ["style"] })
    springSheet(el, 158, -50_000)
    await vi.waitFor(() => expect(el.style.maxHeight).toBe(""), { timeout: 3000 })
    watch.disconnect()
    for (const height of seen.filter((h) => !Number.isNaN(h))) {
      expect(height).toBeGreaterThanOrEqual(46)
      expect(height).toBeLessThanOrEqual(158)
    }
  })

  it("leaves a sheet that is already where it rests alone, and clears the drag at once", async () => {
    const el = sheet(158)
    springSheet(el, 158, 0)
    await vi.waitFor(() => expect(el.classList.contains("is-dragging")).toBe(false), { timeout: 3000 })
    expect(el.style.maxHeight).toBe("")
  })

  it("clears the drag at once under reduced motion, for the stylesheet to settle", async () => {
    reduced(true)
    const el = sheet(46)
    springSheet(el, 158, 0)
    await vi.waitFor(() => expect(el.classList.contains("is-dragging")).toBe(false), { timeout: 3000 })
    expect(el.style.maxHeight).toBe("")
  })

  it("stops where it is when a finger takes the sheet back", async () => {
    const el = sheet(46)
    const run = springSheet(el, 158, 0)
    await vi.waitFor(() => expect(el.style.maxHeight).not.toBe("158px"), { timeout: 3000 })
    run.stop()
    const held = el.style.maxHeight
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(el.style.maxHeight).toBe(held)
    expect(el.classList.contains("is-dragging")).toBe(true)
  })
})
