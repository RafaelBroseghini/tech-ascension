/** @vitest-environment happy-dom */
import { createElement } from "react"
import type { ComponentType } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { SKILL_TIERS } from "../data/phases.ts"
import { closeIdePythonConsole, getIdePythonConsole } from "../game/idePythonConsole.ts"
import { setSidebarView } from "../game/ideSidebar.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { onSurface } from "../game/surfaces.ts"
import { CareerLog, CareerOutput } from "./CareerLog.tsx"
import { GitHugCorner } from "./CornerActions.tsx"
import { IdentityPicker } from "./IdentityPicker.tsx"
import { IdeChrome } from "./IdeChrome.tsx"
import { Shop } from "./Shop.tsx"
import { UnlockReveals } from "./UnlockReveals.tsx"

const roots: Root[] = []

function render<P extends object>(component: ComponentType<P>, props?: P): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(component, props))
  })
  return host
}

function click(el: Element | null | undefined) {
  if (!el) throw new Error("missing element")
  flushSync(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const $ = (selector: string) => document.body.querySelector<HTMLElement>(selector)
const $$ = (selector: string) => [...document.body.querySelectorAll<HTMLElement>(selector)]

/** Settle timers and the renders they schedule. */
async function settle(ms = 20) {
  await wait(ms)
  flushSync(() => {})
}

beforeEach(() => {
  useGame.getState().wipe()
})

afterEach(() => {
  flushSync(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  closeIdePythonConsole()
  setSidebarView("explorer")
  writeSavedShopTab(null)
  useGame.getState().wipe()
})

describe("reveals", () => {
  it("lights a standard unlock up where it lives with a card, and its button opens it", async () => {
    const anchor = document.createElement("button")
    anchor.dataset.featureAnchor = "terminal"
    document.body.append(anchor)
    let opened = 0
    const off = onSurface("terminal", () => (opened += 1))
    useGame.setState({ unlocked: ["editor", "terminal"], fresh: ["terminal"], reveals: ["terminal"] })
    render(UnlockReveals)
    await settle()
    expect($("[data-testid='unlock-card-title']")?.textContent).toBe("Terminal")
    expect($("[data-testid='unlock-card']")?.textContent).toContain("from Linux CLI basics")
    expect(anchor.classList.contains("ul-lit")).toBe(true)
    expect(useGame.getState().reveals).toEqual([])

    click($("[data-testid='unlock-card-action']"))
    expect(opened).toBe(1)
    expect(useGame.getState().fresh).not.toContain("terminal")
    await settle(400)
    expect($("[data-testid='unlock-card']")).toBeNull()
    expect(anchor.classList.contains("ul-lit")).toBe(false)
    off()
  })

  it("slams a big unlock in the centre first, then shows its card", async () => {
    useGame.setState({ unlocked: ["editor"], reveals: ["editor"] })
    render(UnlockReveals)
    await settle()
    expect(useGame.getState().pop).toMatchObject({ kind: "unlock", size: "large", label: "Your editor" })
    expect($("[data-testid='unlock-card']")).toBeNull()
    await settle(1_000)
    expect($("[data-testid='unlock-card-title']")?.textContent).toBe("Your editor")
  })

  it("turns a small unlock into a toast", async () => {
    useGame.setState({ unlocked: ["themes", "theme:monokai"], reveals: ["theme:monokai"] })
    render(UnlockReveals)
    await settle()
    expect(useGame.getState().toast?.text).toBe("New editor theme: Monokai")
    expect($("[data-testid='unlock-card']")).toBeNull()
  })

  it("waits while an event is on screen", async () => {
    useGame.getState().fireEvent(1)
    useGame.setState({ unlocked: ["terminal"], reveals: ["terminal"] })
    render(UnlockReveals)
    await settle()
    expect($("[data-testid='unlock-card']")).toBeNull()
    expect(useGame.getState().reveals).toEqual(["terminal"])
    flushSync(() => useGame.getState().dismissEvent())
    await settle()
    expect($("[data-testid='unlock-card-title']")?.textContent).toBe("Terminal")
  })

  it("shows a save from before the timeline one card about the career log", async () => {
    useGame.setState({ unlocked: ["editor", "careerLog"], whatsNew: true })
    render(UnlockReveals)
    await settle()
    expect($("[data-testid='unlock-card']")?.textContent).toContain("What's new")
    click($("[data-testid='unlock-card-close']"))
    await settle(400)
    expect(useGame.getState().whatsNew).toBe(false)
  })
})

describe("the editor before and after its unlocks", () => {
  it("keeps the terminal and the career log out until they unlock, standing the next one in its place", () => {
    useGame.setState({ skills: { "1": 1 } })
    render(IdeChrome)
    expect($("[data-testid='ide-console-open']")).toBeNull()
    expect($("[data-testid='ide-view-log']")).toBeNull()
    expect($$("[data-testid='feature-ghost']").map((el) => el.dataset.feature)).toEqual(["terminal"])
    expect($("[data-testid='ide-item-run']")).toBeNull()

    const skills = Object.fromEntries(SKILL_TIERS.slice(0, 10).map((row) => [String(row.id), 1]))
    flushSync(() => useGame.setState({ skills }))
    expect($("[data-testid='ide-console-open']")).not.toBeNull()
    expect($("[data-testid='ide-console-open'] [data-testid='new-mark']")).not.toBeNull()
    click($("[data-testid='ide-view-log']"))
    expect($("[data-testid='career-log']")).not.toBeNull()
    expect($(".ide-folder-tree")).toBeNull()
    expect(useGame.getState().fresh).not.toContain("careerLog")
    click($("[data-testid='ide-view-explorer']"))
    expect($("[data-testid='career-log']")).toBeNull()
  })
})

describe("the career log and the Output tab", () => {
  it("lists what is next and the history newest first, with HEAD on top", () => {
    useGame.setState({ xp: 10_000, xpTotal: 2_300 })
    useGame.getState().buySkill(1)
    useGame.getState().buySkill(2)
    render(CareerLog)
    const history = $$("[data-testid='career-log-history'] li")
    expect(history[0]?.textContent).toContain("HEAD")
    expect(history.at(-1)?.textContent).toContain("init: high school")
    expect($$("[data-testid='career-log-next'] li").map((li) => li.dataset.feature)).toEqual(["terminal", "careerLog", "githug"])
  })

  it("opens the JSON from the career log", () => {
    render(CareerLog)
    click($("[data-testid='career-log-json']"))
    // No console mounted here: the request goes to whoever listens. With IdeChrome mounted it opens Output.
    render(IdeChrome)
    click($("[data-testid='career-log-json']"))
    expect(getIdePythonConsole()).toMatchObject({ open: true, tab: "output" })
  })

  it("prints one line per journal entry and filters by type", () => {
    useGame.setState({ xp: 10_000, xpTotal: 2_300 })
    useGame.getState().buySkill(1)
    useGame.getState().buySkill(2)
    const host = render(CareerOutput)
    const lines = $$("[data-testid='output-line']")
    expect(lines).toHaveLength(useGame.getState().journal.entries.length)
    expect(JSON.parse(lines[0]!.querySelector("code")!.textContent ?? "")).toMatchObject({ seq: 1, type: "start" })
    const select = host.querySelector<HTMLSelectElement>("[data-testid='output-filter']")!
    flushSync(() => {
      select.value = "learn"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect($$("[data-testid='output-line']").map((line) => line.dataset.type)).toEqual(["learn", "learn"])
    expect($("[data-testid='output-count']")?.textContent).toBe("2 lines")
  })
})

describe("the shop teases what is next", () => {
  it("hides closed boards except the next one, and names what a row unlocks", () => {
    writeSavedShopTab("A")
    useGame.setState({ skills: Object.fromEntries(SKILL_TIERS.slice(0, 7).map((row) => [String(row.id), 1])), xpTotal: 2_300, xp: 50 })
    render(Shop, { onCollapse: () => {} })
    const tabs = $$(".era-tabs:not(.era-sub) [role='tab']").map((tab) => tab.dataset.phase)
    expect(tabs).toEqual(["A", "G"])
    expect($("[data-phase='G']")?.classList.contains("is-next")).toBe(true)
    expect($$("[data-row='skill:8'] [data-testid='unlock-chip']").map((chip) => chip.textContent)).toEqual(["Unlocks Terminal"])
    expect($("[data-testid='next-unlock'] [data-testid='unlock-chip']")?.textContent).toBe("Unlocks Terminal")
    // A row wears the feature's icon and keeps the name for the tooltip and screen readers; the banner prints it.
    const badge = $("[data-row='skill:8'] [data-testid='unlock-chip']")!
    expect(badge.dataset.feature).toBe("terminal")
    expect(badge.querySelector("svg")).not.toBeNull()
    expect(badge.querySelector(".ul-chip-name")).toBeNull()
    expect($("[data-testid='next-unlock'] [data-testid='unlock-chip']")?.classList.contains("is-named")).toBe(true)
    // Owned rows have nothing left to tease.
    expect($("[data-row='skill:1'] [data-testid='unlock-chip']")).toBeNull()
  })
})

describe("the GitHug corner", () => {
  it("stays off the desk, real star included, until Git + GitHug hygiene", () => {
    useGame.setState({ skills: { "1": 1 } })
    render(GitHugCorner)
    expect($("[data-testid='github-star']")).toBeNull()
    expect($("[data-testid='view-githug']")).toBeNull()
  })

  it("opens a profile with this career's contribution graph and pinned repos", () => {
    useGame.setState({ skills: { "1": 1, "10": 1 }, unlocked: ["editor", "careerLog", "githug"], fresh: ["githug"] })
    render(GitHugCorner)
    expect($("[data-testid='github-star']")).not.toBeNull()
    click($("[data-testid='view-githug']"))
    expect($("[data-testid='githug-modal']")).not.toBeNull()
    // 25 full weeks, then this week up to today.
    const days = $$("[data-testid='githug-graph'] .githug-day")
    expect(days.length).toBe(25 * 7 + new Date().getDay() + 1)
    expect($$("[data-testid='githug-pinned'] strong").map((el) => el.textContent)).toEqual(["til", "hello-world"])
    expect(useGame.getState().fresh).not.toContain("githug")
  })

  it("shows the career's own handle, with nothing to edit", () => {
    useGame.setState({ skills: { "1": 1, "10": 1 }, unlocked: ["githug"], profile: { handle: "brisk-axolotl", chosen: true } })
    render(GitHugCorner)
    click($("[data-testid='view-githug']"))
    expect($("[data-testid='githug-handle']")?.textContent).toBe("brisk-axolotl")
    expect($("[data-testid='githug-bio']")?.textContent).toBe("Learning to code")
    expect($("[data-testid='githug-modal'] input")).toBeNull()
  })
})

describe("the start card", () => {
  it("offers the drawn handle, rerolls it, and keeps it on Start", () => {
    render(IdentityPicker)
    const first = useGame.getState().profile
    expect($("[data-testid='identity-handle']")?.textContent).toBe(`@${first.handle}`)
    expect($("[data-testid='identity-picker'] input")).toBeNull()
    click($("[data-testid='identity-reroll']"))
    const second = useGame.getState().profile
    expect(second.handle).not.toBe(first.handle)
    expect($("[data-testid='identity-handle']")?.textContent).toBe(`@${second.handle}`)
    expect($("[data-testid='identity-keep']")?.textContent).toBe(`Start as @${second.handle}`)
    click($("[data-testid='identity-keep']"))
    expect(useGame.getState().profile).toEqual({ ...second, chosen: true })
    expect($("[data-testid='identity-picker']")).toBeNull()
  })

  it("never shows for a career that already kept its handle", () => {
    useGame.getState().keepProfile()
    render(IdentityPicker)
    expect($("[data-testid='identity-picker']")).toBeNull()
  })
})
