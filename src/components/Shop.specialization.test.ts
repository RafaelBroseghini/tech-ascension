/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { SPECIALIZATIONS } from "../data/specializations.ts"
import { FRESH_COMPANY } from "../game/globe/growth.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

let root: Root | null = null

function renderShop(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const next = createRoot(host)
  root = next
  flushSync(() => {
    next.render(createElement(Shop))
  })
  return host
}

/** A Jobs tab with the trunk held up to Mid-level SWE. */
function atMid(over: Partial<ReturnType<typeof useGame.getState>> = {}) {
  writeSavedShopTab("C")
  useGame.setState({ xpTotal: 3_000_000, xp: 3_000_000, jobs: [1, 2, 3, 4, 5, 6, 7], gigs: [1, 2, 3, 4, 5, 6], company: { ...FRESH_COMPANY, users: { "americas-east": 2_000_000 } }, ...over })
}

function press(host: ParentNode, label: string) {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`) ?? [...host.querySelectorAll("button")].find((el) => el.textContent === label)
  if (!button) throw new Error(`no button ${label}`)
  flushSync(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("the Jobs tab and specializations", () => {
  afterEach(() => {
    if (root) flushSync(() => root?.unmount())
    root = null
    document.body.replaceChildren()
    writeSavedShopTab(null)
    useGame.getState().wipe()
  })

  it("shows no pick card before Mid-level SWE", () => {
    atMid({ jobs: [1, 2, 3] })
    const host = renderShop()
    expect(host.querySelector("[data-row^='spec:']")).toBeNull()
  })

  it("waits on 10,000 users: a lock panel with the users it has, and no Pick buttons", () => {
    atMid({ company: { ...FRESH_COMPANY, users: { "americas-east": 1234 } } })
    const host = renderShop()
    expect(host.querySelector("[data-row^='spec:']")).toBeNull()
    expect(host.querySelector("[data-testid='lock-panel']")?.textContent).toContain("10,000 users (1,234 now)")
  })

  it("lists the six specializations with a style chip and a Pick button once Mid-level is held", () => {
    atMid()
    const host = renderShop()
    const rows = [...host.querySelectorAll<HTMLElement>("[data-row^='spec:']")]
    expect(rows.map((row) => row.getAttribute("data-row"))).toEqual(SPECIALIZATIONS.map((row) => `spec:${row.id}`))
    expect(rows.map((row) => row.querySelector("[data-testid='spec-chip']")?.textContent)).toEqual(["Click", "Balanced", "Idle", "Idle", "Click", "Balanced"])
    for (const [index, spec] of SPECIALIZATIONS.entries()) {
      expect(rows[index]?.querySelector("h3")?.textContent).toBe(spec.name)
      expect(rows[index]?.textContent).toContain(spec.blurb)
      expect(rows[index]?.querySelector("button")?.textContent).toBe("Pick")
    }
    // Nothing above Mid-level is offered yet.
    expect(host.textContent).not.toContain("Staff engineer")
  })

  it("picks through the button, swaps the card for the track and a switch row", () => {
    atMid()
    const host = renderShop()
    press(host, "Pick Infra / SRE")
    expect(useGame.getState().build).toMatchObject({ spec: "infra", switched: false })
    expect(host.querySelector("[data-row='spec:frontend']")).toBeNull()
    expect(host.textContent).toContain("On-call primary")
    expect(host.textContent).not.toContain("Feature owner")
    const current = host.querySelector<HTMLElement>("[data-row='spec:current']")
    expect(current?.querySelector("h3")?.textContent).toBe("Infra / SRE")
    expect(current?.querySelector("button")?.textContent).toBe("Switch specialization")
  })

  it("switches once, after a confirm that says what it keeps and drops", () => {
    atMid({ build: { spec: "backend", switched: false }, jobs: [1, 2, 3, 4, 5, 6, 7, 8, 9] })
    const host = renderShop()
    press(host, "Switch specialization")
    expect(host.querySelector("[data-row='spec:backend']")).toBeNull()
    expect(host.querySelectorAll("[data-row^='spec:']").length).toBeGreaterThanOrEqual(5)
    press(host, "Choose Frontend")
    const confirm = host.querySelector<HTMLElement>("[data-row='spec:switch-confirm']")
    expect(confirm?.textContent).toContain("once a career")
    expect(confirm?.textContent).toMatch(/keeps your money, gear and trunk jobs/)
    expect(confirm?.textContent).toMatch(/drops your Backend \/ Platform jobs/)
    // Nothing happens until it is confirmed, and Back returns to the choice.
    expect(useGame.getState().build.spec).toBe("backend")
    press(host, "Back")
    expect(host.querySelector("[data-row='spec:switch-confirm']")).toBeNull()
    press(host, "Choose Frontend")
    press(host, "Confirm")
    expect(useGame.getState().build).toMatchObject({ spec: "frontend", switched: true })
    expect(useGame.getState().jobs).toEqual([1, 2, 3, 4, 5, 6, 7])
    const current = host.querySelector<HTMLElement>("[data-row='spec:current']")
    expect(current?.querySelector("button")?.disabled).toBe(true)
    expect(current?.textContent).toContain("used your switch")
  })

  it("cancels out of the choice without switching", () => {
    atMid({ build: { spec: "ai", switched: false }, jobs: [1, 2, 3, 4, 5, 6, 7] })
    const host = renderShop()
    press(host, "Switch specialization")
    press(host, "Cancel")
    expect(useGame.getState().build).toEqual({ spec: "ai", switched: false })
    expect(host.querySelector("[data-row='spec:current']")).not.toBeNull()
  })
})
