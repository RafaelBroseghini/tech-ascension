/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { ORIGINS, ORIGIN_ASK_XP } from "../data/origins.ts"
import { useGame } from "../game/store.ts"
import { OriginPick } from "./OriginPick.tsx"

describe("the origin card", () => {
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const mount = () => {
    host = document.createElement("div")
    document.body.appendChild(host)
    root = createRoot(host)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    act(() => root.render(createElement(OriginPick)))
  }
  const card = () => document.body.querySelector("[data-testid='origin-pick']")
  const click = (selector: string) => act(() => document.body.querySelector<HTMLElement>(selector)!.click())

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    useGame.getState().wipe()
  })

  it("waits for a kept handle and a little XP, then asks once and cannot be waved away", () => {
    useGame.getState().wipe()
    mount()
    expect(card()).toBeNull()
    act(() => useGame.setState({ xpTotal: ORIGIN_ASK_XP }))
    // The start card is still up: nothing is asked of a career that has not kept its handle.
    expect(card()).toBeNull()
    act(() => useGame.getState().keepProfile())
    act(() => useGame.setState({ xpTotal: ORIGIN_ASK_XP - 1 }))
    expect(card()).toBeNull()
    act(() => useGame.setState({ xpTotal: ORIGIN_ASK_XP }))
    expect(card()).not.toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    click("[data-testid='origin-backdrop']")
    expect(card()).not.toBeNull()
    expect((document.body.querySelector("[data-testid='origin-confirm']") as HTMLButtonElement).disabled).toBe(true)
  })

  it("keeps the path it was told, once", () => {
    useGame.getState().wipe()
    useGame.getState().keepProfile()
    useGame.setState({ xpTotal: ORIGIN_ASK_XP })
    mount()
    expect(document.body.querySelectorAll("[data-testid^='identity-origin-']")).toHaveLength(ORIGINS.length)
    const bootcamp = ORIGINS.find((row) => row.id === "bootcamp")!
    click("[data-testid='identity-origin-bootcamp']")
    expect(document.body.querySelector("[data-testid='origin-confirm']")?.textContent).toBe(`Take the ${bootcamp.name} path`)
    click("[data-testid='origin-confirm']")
    expect(useGame.getState().build.origin).toBe("bootcamp")
    expect(card()).toBeNull()
  })

  it("does not ask a career that already holds a gig", () => {
    useGame.getState().wipe()
    useGame.getState().keepProfile()
    useGame.setState({ xpTotal: ORIGIN_ASK_XP, gigs: [1] })
    mount()
    expect(card()).toBeNull()
  })
})
