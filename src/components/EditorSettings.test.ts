/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
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

function renderSettings(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
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
