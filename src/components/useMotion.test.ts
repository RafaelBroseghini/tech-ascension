/** @vitest-environment happy-dom */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { dialogPresence, loadMotion, motionReady, playing, tickUp } from "./useMotion.ts"

const reduced = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: on && query.includes("reduce"), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

/** happy-dom has no layout; a dialog counts as laid out when its box says so. */
const layout = (on: boolean) => {
  Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => (on ? [{ width: 1, height: 1 }] : []) })
}

function dialog(): HTMLElement {
  const backdrop = document.createElement("div")
  backdrop.className = "event-backdrop"
  backdrop.id = "backdrop-id"
  backdrop.setAttribute("data-testid", "x-backdrop")
  backdrop.innerHTML = `<div class="event-modal" role="dialog" aria-modal="true" aria-labelledby="t" tabindex="-1" data-testid="x-modal"><h2 id="t">Title</h2><button type="button">Yes</button></div>`
  document.body.append(backdrop)
  return backdrop
}

describe("a dialog's entrance and exit", () => {
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
  })

  it("hides the backdrop for the first frame, then gives its styles back once it has arrived", async () => {
    const backdrop = dialog()
    const card = backdrop.querySelector<HTMLElement>("[role='dialog']")!
    dialogPresence(backdrop)
    expect(backdrop.style.opacity).toBe("0")
    await vi.waitFor(() => {
      expect(backdrop.getAttribute("style") ?? "").toBe("")
      expect(card.getAttribute("style") ?? "").toBe("")
    }, { timeout: 3000 })
  })

  it("leaves a still, unreachable copy that fades out after the dialog is gone, and removes it", async () => {
    const backdrop = dialog()
    const cleanup = dialogPresence(backdrop) as () => void
    cleanup()
    backdrop.remove()
    // Placed a microtask later, where the dialog was.
    await Promise.resolve()
    const ghost = document.querySelector<HTMLElement>(".event-backdrop")
    expect(ghost).not.toBeNull()
    expect(ghost).not.toBe(backdrop)
    expect(ghost!.getAttribute("aria-hidden")).toBe("true")
    expect(ghost!.hasAttribute("inert")).toBe(true)
    expect(ghost!.style.pointerEvents).toBe("none")
    // Nothing a test, a screen reader or the focus trap could mistake for the dialog itself.
    expect(ghost!.querySelector("[role]")).toBeNull()
    expect(ghost!.querySelector("[id]")).toBeNull()
    expect(ghost!.querySelector("[data-testid]")).toBeNull()
    expect(ghost!.hasAttribute("data-testid")).toBe(false)
    await vi.waitFor(() => expect(document.querySelector(".event-backdrop")).toBeNull(), { timeout: 3000 })
  })

  it("leaves no copy when the dialog is mounted again at once, as React's dev double-run does", async () => {
    const backdrop = dialog()
    const first = dialogPresence(backdrop) as () => void
    first()
    dialogPresence(backdrop)
    await Promise.resolve()
    expect(document.querySelectorAll(".event-backdrop")).toHaveLength(1)
  })

  it("does nothing where there is no layout", async () => {
    layout(false)
    const backdrop = dialog()
    const cleanup = dialogPresence(backdrop) as (() => void) | undefined
    expect(backdrop.style.opacity).toBe("")
    cleanup?.()
    backdrop.remove()
    await Promise.resolve()
    expect(document.querySelector(".event-backdrop")).toBeNull()
  })

  it("only fades, and never moves the card, for a player who asked for reduced motion", async () => {
    reduced(true)
    const backdrop = dialog()
    const card = backdrop.querySelector<HTMLElement>("[role='dialog']")!
    dialogPresence(backdrop)
    expect(backdrop.style.opacity).toBe("0")
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(card.style.transform).toBe("")
  })
})

describe("animations on one element", () => {
  beforeAll(async () => {
    await loadMotion()
  })

  beforeEach(() => reduced(false))

  it("strips the inline styles an animation leaves when it ends, and only the newest one does", async () => {
    const el = document.createElement("span")
    document.body.append(el)
    const motion = motionReady()!
    const first = playing(el, [motion.animate(el, { opacity: [0.2, 1] }, { duration: 0.05 })])
    first.finish()
    expect(el.getAttribute("style") ?? "").toBe("")
    // A second animation claims the element: the first one's late settling must not touch its styles.
    const second = playing(el, [motion.animate(el, { opacity: [0.2, 1] }, { duration: 0.2 })])
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(el.style.opacity).not.toBe("")
    second.finish()
    expect(el.getAttribute("style") ?? "").toBe("")
  })

  it("rolls a changed number up and rests on the stylesheet's colour", async () => {
    const el = document.createElement("span")
    document.body.append(el)
    const run = tickUp(el)
    expect(run).not.toBeNull()
    await vi.waitFor(() => expect(el.getAttribute("style") ?? "").toBe(""), { timeout: 3000 })
  })

  it("does not tick for reduced motion", () => {
    reduced(true)
    const el = document.createElement("span")
    expect(tickUp(el)).toBeNull()
  })
})
