/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest"
import { revealIn, scrollIdeEditor } from "./ideScroll.ts"

/** An element whose scroll offsets and box are plain numbers, since happy-dom has no layout. */
function box(el: HTMLElement, rect: { top?: number; bottom?: number; left?: number; right?: number }, limit = { top: 1000, left: 1000 }) {
  let top = 0
  let left = 0
  Object.defineProperty(el, "scrollTop", { get: () => top, set: (v: number) => (top = Math.max(0, Math.min(limit.top, v))), configurable: true })
  Object.defineProperty(el, "scrollLeft", { get: () => left, set: (v: number) => (left = Math.max(0, Math.min(limit.left, v))), configurable: true })
  el.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, ...rect }) as DOMRect
  el.scrollBy = ((o: ScrollToOptions) => {
    el.scrollTop += o.top ?? 0
    el.scrollLeft += o.left ?? 0
  }) as typeof el.scrollBy
  return el
}

function stage() {
  const root = document.createElement("section")
  root.innerHTML = `<div class="ide-editor"><div class="code-layer code-leave"></div><div class="code-layer"></div></div><div class="hero"></div>`
  document.body.append(root)
  const [leaving, open] = [...root.querySelectorAll<HTMLElement>(".code-layer")] as [HTMLElement, HTMLElement]
  box(leaving, {}, { top: 500, left: 0 })
  box(open, {}, { top: 120, left: 0 })
  return { root, leaving, open, hero: root.querySelector<HTMLElement>(".hero") as HTMLElement }
}

describe("scrollIdeEditor", () => {
  it("scrolls the open file when the wheel turns over empty stage, not the one fading out", () => {
    const { root, leaving, open } = stage()
    expect(scrollIdeEditor({ target: root, currentTarget: root, deltaX: 0, deltaY: 80 })).toBe(true)
    expect(open.scrollTop).toBe(80)
    expect(leaving.scrollTop).toBe(0)
  })

  it("leaves wheel turns on the hero card and other children alone", () => {
    const { root, open, hero } = stage()
    expect(scrollIdeEditor({ target: hero, currentTarget: root, deltaX: 0, deltaY: 80 })).toBe(false)
    expect(open.scrollTop).toBe(0)
  })

  it("reads line-mode wheels as lines, and reports false once the file hits its end", () => {
    const { root, open } = stage()
    expect(scrollIdeEditor({ target: root, currentTarget: root, deltaX: 0, deltaY: 2, deltaMode: 1 })).toBe(true)
    expect(open.scrollTop).toBe(32)
    expect(scrollIdeEditor({ target: root, currentTarget: root, deltaX: 0, deltaY: 500 })).toBe(true)
    expect(open.scrollTop).toBe(120)
    expect(scrollIdeEditor({ target: root, currentTarget: root, deltaX: 0, deltaY: 50 })).toBe(false)
  })

  it("does nothing without an open file", () => {
    const root = document.createElement("section")
    expect(scrollIdeEditor({ target: root, currentTarget: root, deltaX: 0, deltaY: 50 })).toBe(false)
  })
})

describe("revealIn", () => {
  const strip = () => box(document.createElement("div"), { top: 100, bottom: 200, left: 100, right: 300 })
  const item = (rect: { top?: number; bottom?: number; left?: number; right?: number }) => box(document.createElement("div"), rect)

  it("scrolls down just far enough to show a row below the fold", () => {
    const tree = strip()
    revealIn(tree, item({ top: 180, bottom: 230 }), "y")
    expect(tree.scrollTop).toBe(30)
  })

  it("scrolls up to a row above the fold", () => {
    const tree = strip()
    tree.scrollTop = 80
    revealIn(tree, item({ top: 60, bottom: 90 }), "y")
    expect(tree.scrollTop).toBe(40)
  })

  it("scrolls a tab in from the right or the left", () => {
    const tabs = strip()
    revealIn(tabs, item({ left: 250, right: 340 }), "x")
    expect(tabs.scrollLeft).toBe(40)
    revealIn(tabs, item({ left: 70, right: 150 }), "x")
    expect(tabs.scrollLeft).toBe(10)
  })

  it("leaves a row that is already in view alone", () => {
    const tree = strip()
    revealIn(tree, item({ top: 120, bottom: 150 }), "y")
    expect(tree.scrollTop).toBe(0)
  })
})
