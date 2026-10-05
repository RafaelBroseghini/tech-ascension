/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { setDeskPref } from "../game/desk.ts"
import { useGame } from "../game/store.ts"
import { EditorSettings } from "./EditorSettings.tsx"

function ownCatalog() {
  useGame.setState({
    skills: Object.fromEntries(SKILL_TIERS.map((row) => [String(row.id), 1])),
    equipment: Object.fromEntries(GEAR.map((row) => [String(row.id), 1])),
    owned: Object.fromEntries(CAPITAL.map((row) => [String(row.id), 1])),
    jobs: JOB_TIERS.map((job) => job.id),
    gigs: GIGS.map((gig) => gig.id),
  })
}

// A root left mounted keeps listening to the store, so the wipe tests unmount theirs.
const roots: Root[] = []

function renderSettings(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(EditorSettings))
  })
  return host
}

function openSettings(host: ParentNode) {
  const button = host.querySelector<HTMLButtonElement>("[data-testid='editor-settings']")
  if (!button) throw new Error("missing settings button")
  flushSync(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("hover click setting", () => {
  afterEach(() => {
    document.body.replaceChildren()
    setDeskPref("hoverClick", false)
    useGame.getState().wipe()
  })

  it("stays hidden until every catalog row is owned", () => {
    const host = renderSettings()
    openSettings(host)
    expect(host.querySelector("[data-testid='desk-hoverClick']")).toBeNull()
    expect(host.querySelector("[data-testid='desk-music']")).not.toBeNull()
  })

  it("appears once the catalog is complete and saves the switch", () => {
    ownCatalog()
    const host = renderSettings()
    openSettings(host)
    const toggle = host.querySelector<HTMLButtonElement>("[data-testid='desk-hoverClick']")
    expect(toggle?.textContent).toContain("Hover click")
    expect(toggle?.getAttribute("aria-pressed")).toBe("false")
    expect(toggle?.title).toContain("20/s")
    flushSync(() => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(host.querySelector("[data-testid='desk-hoverClick']")?.getAttribute("aria-pressed")).toBe("true")
  })
})

describe("wipe save", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  const $ = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`[data-testid='${id}']`)
  const click = (el: HTMLElement | null) => {
    if (!el) throw new Error("missing element")
    flushSync(() => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
  }

  it("is a red button with a trash icon, the last thing in the settings panel", () => {
    const host = renderSettings()
    openSettings(host)
    const button = $(host, "wipe-save")
    expect(button?.textContent).toContain("Wipe save")
    expect(button?.classList.contains("ide-wipe")).toBe(true)
    expect(button?.querySelector("svg.lucide-trash-2")).not.toBeNull()
    const menu = host.querySelector("[role='dialog'][aria-label='Settings']")
    expect(menu?.lastElementChild?.contains(button ?? null)).toBe(true)
  })

  it("asks first: one click does not wipe, and Cancel backs out", () => {
    useGame.setState({ money: 500, xp: 40, xpTotal: 40 })
    const host = renderSettings()
    openSettings(host)
    click($(host, "wipe-save"))
    expect(useGame.getState().money).toBe(500)
    expect($(document.body, "wipe-confirm-panel")?.textContent).toContain("Wipe this save?")
    expect($(document.body, "wipe-confirm-panel")?.textContent).toContain("restarts at high school")

    click($(document.body, "wipe-cancel"))
    expect($(document.body, "wipe-confirm-panel")).toBeNull()
    expect($(host, "wipe-save")).not.toBeNull()
    expect(useGame.getState().money).toBe(500)
  })

  it("wipes the career on the red confirm button and closes the panel", () => {
    useGame.setState({ money: 500, xp: 40, xpTotal: 40, skills: { "1": 1 } })
    const host = renderSettings()
    openSettings(host)
    click($(host, "wipe-save"))
    expect($(document.body, "wipe-confirm")?.querySelector("svg.lucide-trash-2")).not.toBeNull()
    click($(document.body, "wipe-confirm"))
    const after = useGame.getState()
    expect(after.money).toBe(0)
    expect(after.xpTotal).toBe(0)
    expect(after.skills).toEqual({})
    expect(host.querySelector("[role='dialog'][aria-label='Settings']")).toBeNull()
  })

  it("forgets a half-answered prompt when the panel is closed and opened again", () => {
    const host = renderSettings()
    openSettings(host)
    click($(host, "wipe-save"))
    expect($(document.body, "wipe-confirm-panel")).not.toBeNull()
    click(host.querySelector("[data-testid='editor-settings']"))
    expect(host.querySelector("[role='dialog']")).toBeNull()
    openSettings(host)
    expect($(document.body, "wipe-confirm-panel")).toBeNull()
    expect($(host, "wipe-save")).not.toBeNull()
  })
})
