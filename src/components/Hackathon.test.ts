/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { SKILL_TIERS } from "../data/phases.ts"
import { useGame } from "../game/store.ts"
import { HackathonLauncher, HackathonModal } from "./Hackathon.tsx"

const roots: Root[] = []

function render(component: () => ReturnType<typeof createElement> | null): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(component))
  })
  return host
}

function freelancer() {
  const skills = Object.fromEntries(SKILL_TIERS.slice(0, 20).map((row) => [String(row.id), 3]))
  useGame.setState({ skills, xp: 30_000, xpTotal: 30_000, toast: null })
}

const q = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

function click(element: Element | null) {
  if (!element) throw new Error("missing element")
  flushSync(() => {
    ;(element as HTMLElement).click()
  })
}

function key(name: string) {
  flushSync(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: name }))
  })
}

describe("hackathon overlay", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("puts the launcher in the activity bar only once hackathons open", () => {
    const host = render(HackathonLauncher)
    expect(host.querySelector("[data-testid='hackathon-launch']")).toBeNull()
    flushSync(() => freelancer())
    const launch = host.querySelector<HTMLButtonElement>("[data-testid='hackathon-launch']")
    expect(launch?.dataset.status).toBe("open")
    click(launch)
    expect(useGame.getState().hackOpen).toBe(true)
  })

  it("registers, drafts swag and deals a hand", () => {
    freelancer()
    render(HackathonModal)
    expect(q("[data-testid='hackathon']")).toBeNull()
    flushSync(() => {
      useGame.getState().openHackathon()
    })
    expect(q("[data-testid='hackathon']")?.dataset.screen).toBe("lobby")
    expect(q("[data-testid='hackathon-status']")?.textContent).toContain("Registration open")
    expect(all("[data-testid='hack-guide'] li")).toHaveLength(8)
    // Each screen focuses its main control, and the dialog does not take that focus back.
    expect((document.activeElement as HTMLElement | null)?.dataset.testid).toBe("hackathon-register")

    click(q("[data-testid='hackathon-register']"))
    expect(q("[data-testid='hackathon']")?.dataset.screen).toBe("draft")
    const offers = all("[data-testid='hack-offer']")
    expect(offers).toHaveLength(3)
    expect(document.activeElement).toBe(offers[0])
    expect(q("[data-testid='hackathon-judge']")?.textContent).toContain("Sunday's judge")

    key("2")
    expect(q("[data-testid='hackathon']")?.dataset.screen).toBe("table")
    expect(useGame.getState().hack.run?.perks).toEqual([Number(offers[1]?.dataset.perk)])
    expect(all("[data-testid='hack-card']")).toHaveLength(7)
    expect(q("[data-testid='hackathon-target']")?.textContent).toBe("500")
  })

  it("previews a selection, marks kickers, and ships it", () => {
    freelancer()
    useGame.setState({ hackOpen: true })
    expect(useGame.getState().startHackathon(42)).toBe(true)
    expect(useGame.getState().hackPick(0)).toBe(true)
    render(HackathonModal)
    const ship = q<HTMLButtonElement>("[data-testid='hackathon-ship']")
    expect(ship?.disabled).toBe(true)

    // Pick every card of the first card's stack (at most two), plus one card of another stack as a kicker.
    const cards = all("[data-testid='hack-card']")
    const stack = cards[0]?.dataset.stack
    const same = cards.filter((card) => card.dataset.stack === stack).slice(0, 2)
    const other = cards.find((card) => card.dataset.stack !== stack)
    for (const card of [...same, other]) click(card ?? null)
    const pressed = all("[data-testid='hack-card'][aria-pressed='true']")
    expect(pressed).toHaveLength(same.length + 1)
    expect(q("[data-testid='hackathon-preview']")?.textContent).toMatch(/^= \d/)
    if (same.length === 2) expect(all("[data-testid='hack-card'].is-kicker")).toHaveLength(1)

    const before = useGame.getState().hack.run?.ships ?? 0
    click(ship)
    expect(useGame.getState().hack.run?.ships).toBe(before - 1)
    expect(useGame.getState().hack.run?.shot?.cards).toHaveLength(same.length + 1)
    expect(all("[data-testid='hack-card'][aria-pressed='true']")).toHaveLength(0)
  })

  it("closes on Escape and keeps the run", () => {
    freelancer()
    useGame.setState({ hackOpen: true })
    useGame.getState().startHackathon(7)
    render(HackathonModal)
    expect(q("[data-testid='hackathon']")?.dataset.screen).toBe("draft")
    key("Escape")
    expect(useGame.getState().hackOpen).toBe(false)
    expect(q("[data-testid='hackathon']")).toBeNull()
    expect(useGame.getState().hack.run?.stage).toBe("draft")
  })

  it("shows the result and sends you back to the desk", () => {
    freelancer()
    useGame.setState({ hackOpen: true })
    useGame.getState().startHackathon(9)
    useGame.getState().hackPick(0)
    const run = useGame.getState().hack.run
    if (!run) throw new Error("no run")
    useGame.setState({ hack: { ...useGame.getState().hack, run: { ...run, ships: 1 } } })
    useGame.getState().hackShip([0])
    render(HackathonModal)
    expect(q("[data-testid='hackathon']")?.dataset.screen).toBe("summary")
    expect(q("#hk-title")?.textContent).toBe("Build broke")
    expect(q("[data-testid='hackathon-earned']")?.textContent).toBe("—")
    click(q("[data-testid='hackathon-finish']"))
    expect(useGame.getState().hack.run).toBeNull()
    expect(useGame.getState().hackOpen).toBe(false)
  })
})
