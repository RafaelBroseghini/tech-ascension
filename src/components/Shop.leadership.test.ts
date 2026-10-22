/** @vitest-environment happy-dom */
import { createElement } from "react"
import type { ComponentType } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { LEADERSHIP } from "../data/leadership.ts"
import { visibleJobs } from "../data/phases.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { CompanyTab } from "./globe/CompanyTab.tsx"
import { Shop } from "./Shop.tsx"

const roots: Root[] = []

function render<P extends object>(component: ComponentType<P>, props?: P): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const next = createRoot(host)
  roots.push(next)
  flushSync(() => {
    next.render(createElement(component, props))
  })
  return host
}

const TRUNK = [1, 2, 3, 4, 5, 6, 7]
const TRACK_TO_SENIOR = [8, 9, 10, 11, 12, 13, 14]

/** A Jobs tab with the backend track held to Senior SWE, so the leadership pick is open. */
function atSenior(over: Partial<ReturnType<typeof useGame.getState>> = {}) {
  writeSavedShopTab("C")
  useGame.setState({
    xpTotal: 3_000_000,
    xp: 3_000_000,
    jobs: [...TRUNK, ...TRACK_TO_SENIOR],
    gigs: [1, 2, 3, 4, 5, 6],
    build: { spec: "backend", switched: false },
    ...over,
  })
}

function press(host: ParentNode, label: string) {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`) ?? [...host.querySelectorAll("button")].find((el) => el.textContent === label)
  if (!button) throw new Error(`no button ${label}`)
  flushSync(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

afterEach(() => {
  flushSync(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  writeSavedShopTab(null)
  useGame.getState().wipe()
})

describe("the Jobs tab and the leadership pick", () => {
  it("shows no pick card before Senior SWE", () => {
    atSenior({ jobs: [...TRUNK, 8, 9, 10, 11, 12, 13] })
    const host = render(Shop)
    expect(host.querySelector("[data-row^='lead:']")).toBeNull()
    expect(host.textContent).not.toContain("Pick a leadership line")
  })

  it("lists the two lines, each with a name, a blurb and a Pick button, once Senior SWE is held", () => {
    atSenior()
    const host = render(Shop)
    const rows = [...host.querySelectorAll<HTMLElement>("[data-row^='lead:']")]
    expect(rows.map((row) => row.getAttribute("data-row"))).toEqual(LEADERSHIP.map((row) => `lead:${row.id}`))
    for (const [index, lead] of LEADERSHIP.entries()) {
      expect(rows[index]?.querySelector("h3")?.textContent).toBe(lead.name)
      expect(rows[index]?.textContent).toContain(lead.blurb)
      expect(rows[index]?.querySelector("button")?.textContent).toBe("Pick")
    }
    // The picks are separate: the specialization is already made, so its card is not offered again.
    expect(host.querySelector("[data-row='spec:frontend']")).toBeNull()
    // Nothing above rank 15 is offered before the pick.
    expect(host.textContent).not.toContain("Staff engineer")
    expect(host.textContent).not.toContain("Engineering manager")
  })

  it("marks the Jobs tab with a dot while the pick waits, and not once the line is picked and everything is held", () => {
    // Every row of the track is held, so only the pick can be new.
    atSenior({ jobs: [...TRUNK, ...TRACK_TO_SENIOR, 15] })
    const open = render(Shop)
    expect(open.querySelector("[role='tab'][data-phase='C'] .deal-dot")).not.toBeNull()
    flushSync(() => {
      useGame.setState({ build: { spec: "backend", switched: false, leadership: "ic" }, jobs: visibleJobs("backend", "ic").map((job) => job.id) })
    })
    expect(open.querySelector("[role='tab'][data-phase='C'] .deal-dot")).toBeNull()
  })

  it("picks Manager through the button, and swaps the card for the Manager's rows only", () => {
    atSenior({ jobs: [...TRUNK, ...TRACK_TO_SENIOR, 15] })
    const host = render(Shop)
    press(host, "Pick Manager")
    expect(useGame.getState().build).toMatchObject({ spec: "backend", leadership: "manager" })
    expect(host.querySelector("[data-row^='lead:']")).toBeNull()
    expect(host.querySelector("[data-row='job:18']")?.textContent).toContain("Engineering manager")
    expect(host.querySelector("[data-row='job:16']")).toBeNull()
  })

  it("picks Individual contributor through the button, and shows the IC's rows only", () => {
    atSenior({ jobs: [...TRUNK, ...TRACK_TO_SENIOR, 15] })
    const host = render(Shop)
    press(host, "Pick Individual contributor")
    expect(useGame.getState().build.leadership).toBe("ic")
    expect(host.querySelector("[data-row='job:16']")?.textContent).toContain("Staff engineer")
    expect(host.querySelector("[data-row='job:18']")).toBeNull()
  })
})

describe("the Team's hire rows", () => {
  const hireRow = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`[data-testid='world-hire-${id}']`)

  it("offers no hire rows to a career with no line, and the Company tab says where hiring is", () => {
    atSenior({ company: { ...useGame.getState().company, users: { "americas-east": 5_000 } }, money: 1e12 })
    expect(hireRow(render(Shop), "outsourced")).toBeNull()
    const company = render(CompanyTab)
    expect(hireRow(company, "outsourced")).toBeNull()
    expect(company.querySelector("[data-testid='world-team-note']")?.textContent).toContain("lead as a Manager")
  })

  it("keeps an IC's hires shut with the reason in the Jobs tab, and still lets one go", () => {
    atSenior({
      company: { ...useGame.getState().company, users: { "americas-east": 5_000 } },
      money: 1e12,
      build: { spec: "backend", switched: false, leadership: "ic" },
      hires: { outsourced: 2 },
    })
    const host = render(Shop)
    const row = hireRow(host, "outsourced")
    expect(row?.textContent).toContain("Hiring opens when you lead as a Manager")
    expect(row?.textContent).toContain("2 hired")
    expect(row?.querySelector<HTMLButtonElement>("button:not(.world-fire)")?.disabled).toBe(true)
    expect(row?.querySelector<HTMLButtonElement>("[data-testid='world-fire-outsourced']")).not.toBeNull()
    // The Company tab keeps the count and the cost, and no buttons.
    const company = render(CompanyTab)
    expect(hireRow(company, "outsourced")).toBeNull()
    expect(company.querySelector("[data-testid='world-team-note']")?.textContent).toContain("2 hired")
  })

  it("opens the kinds a Manager's rank reaches and says which rank the next one needs", () => {
    atSenior({
      company: { ...useGame.getState().company, users: { "americas-east": 5_000 } },
      money: 1e12,
      jobs: [...TRUNK, ...TRACK_TO_SENIOR, 15, 18],
      build: { spec: "backend", switched: false, leadership: "manager" },
      hires: { outsourced: 1, bootcamp: 1 },
    })
    const host = render(Shop)
    expect(hireRow(host, "outsourced")?.querySelector("[data-testid='world-hire-locked-outsourced']")).toBeNull()
    expect(hireRow(host, "outsourced")?.querySelector<HTMLButtonElement>("button:not(.world-fire)")?.disabled).toBe(false)
    expect(hireRow(host, "copypaste")?.querySelector("[data-testid='world-hire-locked-copypaste']")?.textContent).toBe("Needs Director of Eng")
    expect(hireRow(host, "copypaste")?.querySelector<HTMLButtonElement>("button")?.disabled).toBe(true)
  })

  it("hires through the Jobs tab's button", () => {
    atSenior({
      company: { ...useGame.getState().company, users: { "americas-east": 5_000 } },
      money: 1e12,
      jobs: [...TRUNK, ...TRACK_TO_SENIOR, 15, 18],
      build: { spec: "backend", switched: false, leadership: "manager" },
    })
    const host = render(Shop)
    const button = hireRow(host, "outsourced")?.querySelector<HTMLButtonElement>("button:not(.world-fire)")
    expect(button?.disabled).toBe(false)
    flushSync(() => button?.click())
    expect(useGame.getState().hires.outsourced).toBe(1)
  })
})
