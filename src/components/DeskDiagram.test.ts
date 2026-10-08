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

/** A career with the Job Board open and the internship the next job. */
const atJobBoard = () => useGame.setState({ xpTotal: 40_000, gigs: [1, 2, 3, 4, 5, 6] })

let root: Root
let host: HTMLDivElement

function mount() {
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(createElement(DeskDiagram)))
}

const $ = (selector: string) => document.body.querySelector<HTMLElement>(selector)

beforeEach(() => useGame.getState().wipe())

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useGame.getState().wipe()
})

describe("desk diagram", () => {
  it("draws the prompt of the interview that is open", () => {
    atJobBoard()
    mount()
    const card = $("[data-testid='desk-prompt']")
    expect(card?.dataset.interview).toBe("hello-server")
    expect(card?.textContent).toContain(interview("hello-server").opener)
    expect(card?.textContent).toContain("whiteboard button")
    expect(card?.textContent).toContain("Next interview · Hello server")
  })

  it("draws nothing while the next interview is locked, and names none of them", () => {
    mount()
    expect(host.childElementCount).toBe(0)
    for (const row of INTERVIEWS) expect(document.body.textContent).not.toContain(row.name)
  })

  it("draws no drawing after a pass, and no prompt until the next interview opens", () => {
    atJobBoard()
    mount()
    act(() => {
      useGame.getState().forceInterview("hello-server")
    })
    expect($("[data-testid='desk-prompt']")).toBeNull()
    expect($("[data-testid='desk-diagram']")).toBeNull()
    expect(host.childElementCount).toBe(0)
    useGame.setState({ xpTotal: 50_000, jobs: [1] })
    act(() => {
      useGame.getState().forceInterview("3-tier-app")
    })
    expect(host.childElementCount).toBe(0)
  })

  it("moves the prompt on to the next interview once the next job opens", () => {
    atJobBoard()
    useGame.getState().forceInterview("hello-server")
    useGame.setState({ xpTotal: 50_000, jobs: [1] })
    mount()
    expect($("[data-testid='desk-prompt']")?.dataset.interview).toBe("3-tier-app")
  })

  it("a held job from an old save draws nothing for the interviews it counts as passed", () => {
    useGame.setState({ xpTotal: 50_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [1, 2, 3, 4, 5, 6, 7], interviews: {} })
    mount()
    expect($("[data-testid='desk-diagram']")).toBeNull()
    expect(document.body.textContent).not.toContain(interview("url-shortener").name)
  })
})
