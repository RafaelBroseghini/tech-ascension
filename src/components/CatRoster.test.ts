/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AdminSettings } from "./AdminSettings.tsx"
import { CatRosterButton } from "./CatRosterButton.tsx"
import { CatRosterModal } from "./CatRosterModal.tsx"
import { DeskCat } from "./DeskCat.tsx"
import { IdeStatusDock } from "./IdeStatusDock.tsx"
import { MetricsModal } from "./MetricsModal.tsx"
import { setAdminMode } from "../game/adminMode.ts"
import { CAT_ROSTER } from "../game/catRoster.ts"
import { SKILL_ICONS } from "../data/clickIcons.ts"
import { EQUIPMENT, SKILL_TIERS } from "../data/phases.ts"
import { CatalogRosterModal } from "./CatalogRosterModal.tsx"
import { getDeskPrefs, setDeskPref } from "../game/desk.ts"
import { emptyStats } from "../game/stats.ts"
import { useGame } from "../game/store.ts"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

function mount(element: ReturnType<typeof createElement>) {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(element))
}

function $(selector: string): HTMLElement | null {
  return document.body.querySelector(selector)
}

beforeEach(() => {
  useGame.getState().wipe()
  // The cat and the rosters are career unlocks; these tests start with both on the desk.
  useGame.setState({ unlocked: ["cat", "rosters"] })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  setAdminMode(false)
  setDeskPref("catArt", null)
  vi.restoreAllMocks()
  useGame.getState().wipe()
})

describe("desk cat discoveries", () => {
  it("keeps each cat the desk cat turns into and flags the first sighting", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    mount(createElement(DeskCat))
    const cat = $("[data-testid='desk-cat']")!

    act(() => cat.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 })))
    expect(useGame.getState().stats.catsFound).toEqual([CAT_ROSTER[0]!.url])
    expect($("[data-testid='desk-cat-new']")).not.toBeNull()

    act(() => cat.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 })))
    expect(useGame.getState().stats.catsFound).toHaveLength(1)
    expect($("[data-testid='desk-cat-new']")).toBeNull()
  })
})

describe("cat roster", () => {
  const cells = () => [...document.body.querySelectorAll<HTMLElement>("[data-testid='roster-cell']")]

  it("counts discoveries in the metrics and opens the roster with the rest blacked out", () => {
    const found = [CAT_ROSTER[2]!.url, CAT_ROSTER[0]!.url]
    useGame.setState({ stats: { ...emptyStats(), catsFound: found } })
    mount(createElement(MetricsModal, { onClose: () => {} }))
    expect($("[data-testid='stats-cats']")?.textContent).toBe(`2 / ${CAT_ROSTER.length}`)

    act(() => $("[data-testid='open-cat-roster']")!.click())
    expect($("[data-testid='stats-modal']")).toBeNull()
    expect($("[data-testid='roster-count']")?.textContent).toContain(`2 / ${CAT_ROSTER.length}`)

    // The sleeping desk cat leads the grid and is always unlocked.
    expect(cells()).toHaveLength(CAT_ROSTER.length + 1)
    expect(cells().filter((cell) => cell.dataset.locked === "false")).toHaveLength(3)
    expect(cells()[1]!.dataset.locked).toBe("false")
    expect(cells()[2]!.dataset.locked).toBe("true")
    expect(cells()[2]!.classList.contains("is-locked")).toBe(true)
  })

  it("puts a found cat on the desk for good and leaves a locked one alone", () => {
    useGame.setState({ stats: { ...emptyStats(), catsFound: [CAT_ROSTER[3]!.url] } })
    mount(createElement("div", null, createElement(DeskCat), createElement(CatRosterModal, { onClose: () => {} })))
    const deskImg = () => ($("[data-testid='desk-cat'] img") as HTMLImageElement).getAttribute("src")
    expect(cells()[0]!.classList.contains("is-chosen")).toBe(true)

    act(() => cells()[1]!.click())
    expect(getDeskPrefs().catArt).toBeNull()
    expect($("[data-testid='roster-feature']")!.dataset.locked).toBe("true")
    expect($("[data-testid='roster-feature']")!.textContent).toContain("???")

    act(() => cells()[4]!.click())
    expect(getDeskPrefs().catArt).toBe(CAT_ROSTER[3]!.url)
    expect(deskImg()).toBe(CAT_ROSTER[3]!.url)
    expect(cells()[4]!.classList.contains("is-chosen")).toBe(true)
    expect($("[data-testid='roster-feature']")!.textContent).toContain(CAT_ROSTER[3]!.name)

    act(() => cells()[0]!.click())
    expect(getDeskPrefs().catArt).toBeNull()
  })

  it("sends the chosen cat back to the default when the game is wiped, and keeps the rest of the room", () => {
    setDeskPref("catArt", CAT_ROSTER[3]!.url)
    setDeskPref("music", true)
    useGame.getState().wipe()
    expect(getDeskPrefs().catArt).toBeNull()
    expect(getDeskPrefs().music).toBe(true)
    setDeskPref("music", false)
  })

  it("goes back to the metrics on Escape", () => {
    const onClose = vi.fn()
    mount(createElement(MetricsModal, { onClose }))
    act(() => $("[data-testid='open-cat-roster']")!.click())
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })))
    expect($("[data-testid='roster']")).toBeNull()
    expect($("[data-testid='stats-modal']")).not.toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("shows the top bar button once the first cat is found", () => {
    mount(createElement(CatRosterButton))
    expect($("[data-testid='cat-roster-button']")).toBeNull()
    act(() => {
      useGame.getState().discoverCat(CAT_ROSTER[0]!.url)
    })
    act(() => $("[data-testid='cat-roster-button']")!.click())
    expect($("[data-testid='roster']")).not.toBeNull()
  })
})

describe("taskbar cat chip", () => {
  it("offers the roster only after the first cat, and a pick is not a desk click", () => {
    mount(createElement(IdeStatusDock))
    const open = () => act(() => $("[data-status-chip='cat']")!.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })))
    open()
    expect(useGame.getState().stats.catsFound, "catsFound").toEqual([])
    expect($("[data-status-chip='cat']")?.classList.contains("is-open"), "chip open").toBe(true)
    expect($("[data-testid='status-cat-roster']"), "roster entry").toBeNull()

    act(() => {
      useGame.getState().discoverCat(CAT_ROSTER[0]!.url)
    })
    open()
    act(() => $("[data-testid='status-cat-roster']")!.click())
    expect($("[data-testid='roster']")).not.toBeNull()

    const clicks = useGame.getState().stats.totalClicks
    const cell = document.body.querySelectorAll<HTMLElement>("[data-testid='roster-cell']")[1]!
    act(() => cell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })))
    act(() => cell.click())
    expect(getDeskPrefs().catArt).toBe(CAT_ROSTER[0]!.url)
    expect(useGame.getState().stats.totalClicks).toBe(clicks)
    expect(($("[data-testid='status-chip-cat'] img") as HTMLImageElement).getAttribute("src")).toBe(CAT_ROSTER[0]!.url)
  })
})

describe("catalog rosters", () => {
  const hover = (chip: string) =>
    act(() => $(`[data-status-chip='${chip}']`)!.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })))
  const buttons = () => [...document.body.querySelectorAll<HTMLElement>("[data-testid^='status-roster-']")].map((el) => el.dataset.testid)

  it("offers one roster per open shop panel and hides capital until it opens", () => {
    mount(createElement(IdeStatusDock))
    hover("rosters")
    expect(buttons()).toEqual(["status-roster-skills"])

    act(() => useGame.setState({ xpTotal: 50_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [1] }))
    hover("rosters")
    expect(buttons()).toEqual(["status-roster-skills", "status-roster-gigs", "status-roster-jobs", "status-roster-gear"])

    act(() => useGame.setState({ peakMoney: 500_000 }))
    hover("rosters")
    expect(buttons()).toContain("status-roster-capital")
  })

  it("shows only owned skills, with the skill's developer logos in the left panel", () => {
    const react = SKILL_TIERS.find((row) => row.name.startsWith("React"))!
    const lurker = SKILL_TIERS.find((row) => row.name.startsWith("Stack Overblow"))!
    expect(SKILL_ICONS[react.id]).toContain("React")
    expect(SKILL_ICONS[lurker.id]).toBeUndefined()
    useGame.setState({ skills: { [react.id]: 1, [lurker.id]: 3 }, xpTotal: 1e6 })
    mount(createElement(IdeStatusDock))
    hover("rosters")
    expect($("[data-testid='status-roster-skills'] i")?.textContent).toBe("2")
    act(() => $("[data-testid='status-roster-skills']")!.click())

    expect($("[data-roster='skills']")).not.toBeNull()
    // Only what is held, never how much is still out there.
    expect($("[data-testid='roster-count']")?.textContent).toBe("2unlocked")
    const cells = [...document.body.querySelectorAll<HTMLElement>("[data-testid='roster-cell']")]
    expect(cells.map((cell) => cell.dataset.key)).toEqual([`skills:${lurker.id}`, `skills:${react.id}`])
    expect(cells.every((cell) => cell.dataset.locked === "false")).toBe(true)
    expect(cells[0]!.textContent).toContain("×3")

    // The cursor starts on the furthest row, whose logos show beside its name.
    const feature = () => $("[data-testid='roster-feature']")!
    expect(feature().textContent).toContain(react.name)
    const logos = [...feature().querySelectorAll("[data-testid='roster-logos'] li")].map((li) => li.getAttribute("title"))
    expect(logos).toEqual([...SKILL_ICONS[react.id]!])
    expect(feature().querySelector("[data-testid='roster-logos'] svg")).not.toBeNull()

    act(() => cells[0]!.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })))
    act(() => cells[0]!.focus())
    expect(feature().textContent).toContain(lurker.name)
    expect(feature().querySelector("[data-testid='roster-logos']")).toBeNull()
  })

  it("lays gear out side by side in catalog order, with each row's section in the detail panel", () => {
    const desk = EQUIPMENT.filter((row) => row.kind === "desk").slice(0, 2)
    const lab = EQUIPMENT.find((row) => row.kind === "lab")!
    useGame.setState({ xpTotal: 20_000, equipment: { [desk[0]!.id]: 1, [desk[1]!.id]: 4, [lab.id]: 1 } })
    mount(createElement(CatalogRosterModal, { kind: "gear", onClose: () => {} }))
    const cells = [...document.body.querySelectorAll<HTMLElement>("[data-testid='roster-cell']")]
    expect(cells.map((cell) => cell.dataset.key)).toEqual([`gear:${desk[0]!.id}`, `gear:${desk[1]!.id}`, `gear:${lab.id}`])
    expect(cells[1]!.textContent).toContain("×4")
    expect($("[data-testid='roster-feature']")?.textContent).toContain("Home lab")
  })

  it("keeps the N / total counter on the cat roster", () => {
    useGame.setState({ stats: { ...emptyStats(), catsFound: [CAT_ROSTER[0]!.url] } })
    mount(createElement(CatRosterModal, { onClose: () => {} }))
    expect($("[data-testid='roster-count']")?.textContent).toBe(`1 / ${CAT_ROSTER.length}unlocked`)
  })

  it("says so when a roster is empty", () => {
    mount(createElement(IdeStatusDock))
    hover("rosters")
    act(() => $("[data-testid='status-roster-skills']")!.click())
    expect($("[data-testid='roster-empty']")?.textContent).toBe("No skills learned yet.")
  })
})

describe("admin settings", () => {
  it("stays hidden without the admin code", () => {
    mount(createElement(AdminSettings, { headingId: "admin" }))
    expect($("[data-testid='admin-settings']")).toBeNull()
  })

  it("sets money and XP from the settings menu in admin mode", () => {
    setAdminMode(true)
    mount(createElement(AdminSettings, { headingId: "admin" }))
    const type = (id: string, value: string) => {
      const input = $(`[data-testid='admin-${id}'] input`) as HTMLInputElement
      act(() => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!
        setter.call(input, value)
        input.dispatchEvent(new Event("input", { bubbles: true }))
      })
      act(() => ($(`[data-testid='admin-${id}'] button`) as HTMLButtonElement).click())
    }
    type("money", "2.5m")
    type("xp", "40k")
    expect(useGame.getState()).toMatchObject({ money: 2_500_000, xp: 40_000, xpTotal: 40_000 })
  })
})
