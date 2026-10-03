/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { useGame } from "../game/store.ts"
import { ReviewModal } from "./ReviewModal.tsx"

const roots: Root[] = []

function renderModal(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(ReviewModal))
  })
  return host
}

describe("review modal", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("asks the question and applies the reply that was clicked", () => {
    useGame.setState({ jobs: [1], money: 20_000, xp: 20_000, xpTotal: 20_000, peakMoney: 20_000 })
    expect(useGame.getState().fireReview(1)).toBe(true)
    const host = renderModal()
    const dialog = host.querySelector("[data-testid='review-modal']")
    expect(dialog?.getAttribute("data-prompt")).toBe("1")
    expect(dialog?.textContent).toContain("Internship offer")
    expect(dialog?.textContent).toContain("golden retriever")
    expect(dialog?.textContent).toContain("Exceeds expectations")
    expect(dialog?.textContent).toContain("Meets expectations")
    expect(dialog?.textContent).toContain("Performance improvement plan")
    expect(dialog?.textContent).toContain("No change")

    const before = useGame.getState().money
    flushSync(() => {
      host.querySelector<HTMLButtonElement>("[data-testid='review-exceeds']")?.click()
    })
    expect(useGame.getState().money).toBeGreaterThan(before)
    expect(host.querySelector("[data-testid='review-modal']")).toBeNull()
  })

  it("disables the plan when the cost cannot be paid", () => {
    useGame.setState({ jobs: [1], money: 0, xp: 0, xpTotal: 0 })
    expect(useGame.getState().fireReview(1)).toBe(true)
    const host = renderModal()
    const pip = host.querySelector<HTMLButtonElement>("[data-testid='review-pip']")
    expect(pip?.disabled).toBe(true)
    const meets = host.querySelector<HTMLButtonElement>("[data-testid='review-meets']")
    flushSync(() => {
      meets?.click()
    })
    expect(useGame.getState().money).toBe(0)
    expect(useGame.getState().review).toBeNull()
    expect(useGame.getState().lastReview?.choice).toBe("meets")
  })
})