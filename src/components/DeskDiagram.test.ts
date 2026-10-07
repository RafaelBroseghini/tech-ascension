/** @vitest-environment happy-dom */
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { INTERVIEWS } from "../data/studio/challenges.ts"
import { useGame } from "../game/store.ts"
import { DeskDiagram } from "./DeskDiagram.tsx"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const interview = (id: string) => INTERVIEWS.find((row) => row.id === id) ?? INTERVIEWS[0]

let root: Root
let host: HTMLDivElement

function mount() {
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(createElement(DeskDiagram)))
}

/** Lets the lazy drawing chunk resolve and render. */
async function settle() {
  await act(async () => {
    await import("./DeskDrawing.tsx")
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const $ = (selector: string) => document.body.querySelector<HTMLElement>(selector)
const $$ = (selector: string) => [...document.body.querySelectorAll<HTMLElement>(selector)]

beforeEach(() => useGame.getState().wipe())

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useGame.getState().wipe()
})

describe("desk diagram", () => {
  it("draws the next prompt before any pass", () => {
    mount()
    const card = $("[data-testid='desk-prompt']")
    expect(card?.dataset.interview).toBe("hello-server")
    expect(card?.textContent).toContain(interview("hello-server").brief)
    expect(card?.textContent).toContain("whiteboard button")
    expect(card?.textContent).toContain("Next interview · Hello server")
    expect($("[data-testid='desk-diagram']")).toBeNull()
  })

  it("draws the last passed design", async () => {
    mount()
    const shortener = interview("url-shortener")
    act(() => {
      useGame.getState().forceInterview(shortener.id)
    })
    await settle()
    expect($("[data-testid='desk-prompt']")).toBeNull()
    expect($("[data-testid='desk-diagram']")?.dataset.interview).toBe(shortener.id)
    expect($$(".desk-diagram-node").map((n) => n.dataset.kind).sort()).toEqual(shortener.reference.nodes.map((n) => n.kind).sort())
    expect($$(".desk-diagram-wire").map((w) => w.dataset.edge).sort()).toEqual(shortener.reference.edges.map((e) => `${e.from}>${e.to}`).sort())
  })

  it("draws the newer pass, not the one further up the ladder", async () => {
    mount()
    act(() => {
      useGame.getState().forceInterview("url-shortener")
    })
    act(() => {
      useGame.getState().forceInterview("3-tier-app")
    })
    await settle()
    expect($("[data-testid='desk-diagram']")?.dataset.interview).toBe("3-tier-app")
  })

  it("keeps drawing a pass when a later No hire lands on another interview", async () => {
    mount()
    act(() => {
      useGame.getState().forceInterview("hello-server")
    })
    useGame.setState({ xp: 50_000, xpTotal: 50_000, skills: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i + 1), 1])), gigs: [1, 2, 3, 4, 5, 6], jobs: [1] })
    act(() => {
      useGame.getState().submitWhiteboard("3-tier-app", { nodes: [{ id: "users", kind: "users", replicas: 1 }], edges: [] })
    })
    await settle()
    expect(useGame.getState().interviews["3-tier-app"]?.verdict).toBe("noHire")
    expect($("[data-testid='desk-diagram']")?.dataset.interview).toBe("hello-server")
  })

  it("draws the reference of the furthest interview a held job passed, for a career with no design on record", async () => {
    mount()
    act(() => {
      useGame.setState({ jobs: [1, 2, 3, 4, 5, 6, 7], interviews: {} })
    })
    await settle()
    const shortener = interview("url-shortener")
    expect($("[data-testid='desk-diagram']")?.dataset.interview).toBe(shortener.id)
    expect($$(".desk-diagram-node").length).toBe(shortener.reference.nodes.length)
  })
})
