/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { IdeStatusDock } from "./IdeStatusDock.tsx"
import { setDeskPref } from "../game/desk.ts"
import { useGame } from "../game/store.ts"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

const ownedAll = (rows: readonly { id: number }[]) => Object.fromEntries(rows.map((row) => [String(row.id), 1]))

function mount() {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(createElement(IdeStatusDock)))
}

function hover(chip: string) {
  act(() => document.body.querySelector(`[data-status-chip='${chip}']`)!.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })))
}

const popover = () => document.body.querySelector<HTMLElement>(".ide-status-popover")
const has = (id: string) => popover()?.querySelector(`[data-testid='${id}']`) != null
const chips = () => [...document.body.querySelectorAll<HTMLElement>("[data-status-chip]")].map((el) => el.dataset.statusChip)

beforeEach(() => {
  useGame.getState().wipe()
  // Every chip is a career unlock; these tests start with all of them on the desk.
  useGame.setState({ unlocked: ["music", "music:cozy", "clickKits", "cat", "rosters", "themes"] })
  setDeskPref("music", false)
  setDeskPref("sounds", true)
  setDeskPref("clicks", true)
  setDeskPref("hoverClick", false)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.replaceChildren()
  useGame.getState().wipe()
})

describe("status dock before the career unlocks anything", () => {
  it("holds no chips at minute zero, only the outline of the next one", () => {
    useGame.setState({ unlocked: [] })
    mount()
    expect(chips()).toEqual([])
    expect(document.body.querySelectorAll("[data-testid='feature-ghost']").length).toBeLessThanOrEqual(1)
  })

  it("shows a chip once its feature unlocks, marked NEW until it is opened", () => {
    useGame.setState({ unlocked: ["rosters"], fresh: ["rosters"] })
    mount()
    expect(chips()).toEqual(["rosters"])
    expect(document.body.querySelector("[data-status-chip='rosters'] [data-testid='new-mark']")).not.toBeNull()
    hover("rosters")
    expect(useGame.getState().fresh).not.toContain("rosters")
  })
})

describe("status dock sound and click chips", () => {
  it("has one chip for sound and one for click, not a chip per switch", () => {
    mount()
    expect(chips()).toEqual(["sound", "clicks", "cat", "rosters", "theme"])
  })

  it("puts music and desk sounds in one panel, with the music style once music is on", () => {
    mount()
    hover("sound")
    expect(has("desk-music")).toBe(true)
    expect(has("desk-sounds")).toBe(true)
    expect(document.body.querySelectorAll(".ide-status-popover").length).toBe(1)
    expect(has("desk-music-cozy")).toBe(false)

    act(() => popover()!.querySelector<HTMLButtonElement>("[data-testid='desk-music']")!.click())
    expect(has("desk-music-cozy")).toBe(true)
  })

  it("lights the sound chip while either music or desk sounds are on", () => {
    mount()
    const chip = () => document.body.querySelector("[data-testid='status-chip-sound']")!
    expect(chip().classList.contains("is-active")).toBe(true)
    act(() => setDeskPref("sounds", false))
    expect(chip().classList.contains("is-active")).toBe(false)
    act(() => setDeskPref("music", true))
    expect(chip().classList.contains("is-active")).toBe(true)
  })

  it("keeps hover click out of the click panel until every catalog row is owned", () => {
    mount()
    hover("clicks")
    expect(has("desk-clicks")).toBe(true)
    expect(has("desk-hoverClick")).toBe(false)
    expect(document.body.querySelector("[data-status-chip='hoverClick']")).toBeNull()
  })

  it("lists hover click inside the click panel once everything is owned, without a chip of its own", () => {
    act(() => {
      useGame.setState({
        xpTotal: 1e15,
        peakMoney: 1e18,
        skills: ownedAll(SKILL_TIERS),
        gigs: GIGS.map((gig) => gig.id),
        jobs: JOB_TIERS.map((job) => job.id),
        equipment: ownedAll(GEAR),
        owned: ownedAll(CAPITAL),
      })
    })
    mount()
    expect(chips()).toEqual(["sound", "clicks", "cat", "rosters", "theme"])
    hover("clicks")
    expect(has("desk-clicks")).toBe(true)
    expect(has("desk-hoverClick")).toBe(true)

    // Hover click alone keeps the click chip lit when the click sound is off.
    act(() => setDeskPref("clicks", false))
    act(() => setDeskPref("hoverClick", true))
    expect(document.body.querySelector("[data-testid='status-chip-clicks']")!.classList.contains("is-active")).toBe(true)
  })
})
