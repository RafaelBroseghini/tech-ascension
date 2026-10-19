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

// Earlier tests can leave a gear mounted, so a test with its own host opens the gear in it.
function openSettings(root: ParentNode = document) {
  const button = root.querySelector<HTMLButtonElement>("[data-testid='editor-settings']")
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
    renderSettings()
    openSettings()
    expect(document.querySelector("[data-testid='desk-hoverClick']")).toBeNull()
    expect(document.querySelector("[data-testid='desk-sounds']")).not.toBeNull()
  })

  it("offers music and the cat only once the career has unlocked them", () => {
    renderSettings()
    openSettings()
    expect(document.querySelector("[data-testid='desk-music']")).toBeNull()
    expect(document.querySelector("[data-testid='desk-cat']")).toBeNull()
    flushSync(() => {
      useGame.setState({ unlocked: ["music", "music:cozy", "cat"] })
    })
    expect(document.querySelector("[data-testid='desk-music']")).not.toBeNull()
    expect(document.querySelector("[data-testid='desk-cat']")).not.toBeNull()
    expect([...document.querySelectorAll("[data-testid^='desk-music-']")].map((row) => row.getAttribute("data-testid"))).toEqual(["desk-music-cozy"])
  })

  it("appears once the catalog is complete and saves the switch", () => {
    ownCatalog()
    renderSettings()
    openSettings()
    const toggle = document.querySelector<HTMLButtonElement>("[data-testid='desk-hoverClick']")
    expect(toggle?.textContent).toContain("Hover or hold click")
    expect(toggle?.getAttribute("aria-pressed")).toBe("false")
    expect(toggle?.title).toContain("20/s")
    flushSync(() => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(document.querySelector("[data-testid='desk-hoverClick']")?.getAttribute("aria-pressed")).toBe("true")
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

  const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)
  const click = (el: HTMLElement | null) => {
    if (!el) throw new Error("missing element")
    flushSync(() => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
  }

  it("is a red button with a trash icon, the last control in the settings panel, above only the emoji.gg credit", () => {
    renderSettings()
    openSettings()
    const button = $("wipe-save")
    expect(button?.textContent).toContain("Wipe save")
    expect(button?.classList.contains("ide-wipe")).toBe(true)
    expect(button?.querySelector("svg.lucide-trash-2")).not.toBeNull()
    const menu = document.querySelector("[role='dialog'][aria-label='Settings']")
    expect(menu?.lastElementChild?.textContent).toBe("powered by emoji.gg")
    expect(menu?.lastElementChild?.previousElementSibling?.contains(button ?? null)).toBe(true)
  })

  it("asks first: one click does not wipe, and Cancel backs out", () => {
    useGame.setState({ money: 500, xp: 40, xpTotal: 40 })
    renderSettings()
    openSettings()
    click($("wipe-save"))
    expect(useGame.getState().money).toBe(500)
    expect($("wipe-confirm-panel")?.textContent).toContain("Wipe this save?")
    expect($("wipe-confirm-panel")?.textContent).toContain("restarts at high school")

    click($("wipe-cancel"))
    expect($("wipe-confirm-panel")).toBeNull()
    expect($("wipe-save")).not.toBeNull()
    expect(useGame.getState().money).toBe(500)
  })

  it("wipes the career on the red confirm button and closes the panel", () => {
    useGame.setState({ money: 500, xp: 40, xpTotal: 40, skills: { "1": 1 } })
    renderSettings()
    openSettings()
    click($("wipe-save"))
    expect($("wipe-confirm")?.querySelector("svg.lucide-trash-2")).not.toBeNull()
    click($("wipe-confirm"))
    const after = useGame.getState()
    expect(after.money).toBe(0)
    expect(after.xpTotal).toBe(0)
    expect(after.skills).toEqual({})
    expect(document.querySelector("[role='dialog'][aria-label='Settings']")).toBeNull()
  })

  it("forgets a half-answered prompt when the panel is closed and opened again", () => {
    renderSettings()
    openSettings()
    click($("wipe-save"))
    expect($("wipe-confirm-panel")).not.toBeNull()
    click(document.querySelector("[data-testid='editor-settings']"))
    expect(document.querySelector("[role='dialog']")).toBeNull()
    openSettings()
    expect($("wipe-confirm-panel")).toBeNull()
    expect($("wipe-save")).not.toBeNull()
  })
})

describe("how to play", () => {
  it("sits at the top of the settings menu and explains the game, with the last trophy as the finish", () => {
    renderSettings()
    flushSync(() => (document.querySelector("[data-testid='editor-settings']") as HTMLButtonElement).click())
    const menu = document.querySelector(".ide-theme-menu")!
    expect(menu.querySelector("section")?.querySelector("[data-testid='how-to-play']")).not.toBeNull()
    expect(document.querySelector("[data-testid='howto-panel']")).toBeNull()

    flushSync(() => (document.querySelector("[data-testid='how-to-play']") as HTMLButtonElement).click())
    expect(document.querySelector("[data-testid='howto-panel']")).not.toBeNull()
    expect(document.querySelector("[data-testid='howto-end']")?.textContent).toContain("keep clicking")
    expect(document.querySelector("[data-testid='howto-end']")?.textContent).toContain("Sabbatical")

    flushSync(() => (document.querySelector("[data-testid='howto-close']") as HTMLButtonElement).click())
    expect(document.querySelector("[data-testid='howto-panel']")).toBeNull()
  })
})

describe("settings in the activity bar", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
  })

  it("opens beside the bar, outside its host, and stays open while it is used", () => {
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    roots.push(root)
    flushSync(() => root.render(createElement(EditorSettings, { place: "activity" })))
    openSettings(host)
    const menu = document.querySelector<HTMLElement>(".ide-settings-portal[role='dialog']")
    expect(menu).not.toBeNull()
    expect(host.contains(menu)).toBe(false)

    flushSync(() => menu!.querySelector("button")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })))
    expect(document.querySelector(".ide-settings-portal")).not.toBeNull()
    flushSync(() => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })))
    expect(document.querySelector(".ide-settings-portal")).toBeNull()
  })
})
