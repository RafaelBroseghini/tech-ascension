/** @vitest-environment happy-dom */
import { createElement, Fragment } from "react"
import type { ComponentType } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { SKILL_TIERS } from "../data/phases.ts"
import { setSidebarView } from "../game/ideSidebar.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { CareerLog } from "./CareerLog.tsx"
import { GitHugButton, GitHugStar } from "./ActivityLinks.tsx"
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
  setSidebarView("closed")
  writeSavedShopTab(null)
  useGame.getState().wipe()
})

describe("reveals", () => {
  it("drains the queue without a pop-up: the NEW marker is the only sign", async () => {
    useGame.setState({ unlocked: ["studio", "linkedout"], fresh: ["linkedout"], reveals: ["linkedout"] })
    render(UnlockReveals)
    await settle()
    expect(useGame.getState().reveals).toEqual([])
    expect(useGame.getState().fresh).toContain("linkedout")
    expect($("[data-testid='unlock-card']")).toBeNull()
    expect(useGame.getState().toast).toBeNull()
  })

  it("does not slam a big unlock, and does not toast a small one", async () => {
    useGame.setState({ unlocked: ["studio", "themes", "theme:monokai"], reveals: ["studio", "theme:monokai"] })
    render(UnlockReveals)
    await settle()
    expect(useGame.getState().reveals).toEqual([])
    expect($("[data-testid='score-pop']")).toBeNull()
    expect(useGame.getState().toast).toBeNull()
    expect($("[data-testid='unlock-card']")).toBeNull()
  })

  it("does not wait for an event or a 1:1 to drain", async () => {
    useGame.getState().fireEvent(1)
    useGame.setState({ unlocked: ["linkedout"], fresh: ["linkedout"], reveals: ["linkedout"] })
    render(UnlockReveals)
    await settle()
    expect($("[data-testid='unlock-card']")).toBeNull()
    expect(useGame.getState().reveals).toEqual([])
    expect(useGame.getState().fresh).toContain("linkedout")
  })

  it("shows a save from before the timeline one card about the career log", async () => {
    useGame.setState({ unlocked: ["studio", "careerLog"], whatsNew: true })
    render(UnlockReveals)
    await settle()
    expect($("[data-testid='unlock-card']")?.textContent).toContain("What's new")
    click($("[data-testid='unlock-card-close']"))
    await settle(400)
    expect(useGame.getState().whatsNew).toBe(false)
  })
})

describe("the desk before and after its unlocks", () => {
  it("keeps the career log out until it unlocks, standing it in its place, and shows no editor", () => {
    useGame.setState({ skills: { "1": 1 } })
    render(IdeChrome)
    expect($("[data-testid='ide-view-log']")).toBeNull()
    expect($$("[data-testid='feature-ghost']").map((el) => el.dataset.feature)).toEqual(["careerLog"])
    expect($(".ide-tabs")).toBeNull()
    expect($("[data-testid='ide-item-run']")).toBeNull()

    const skills = Object.fromEntries(SKILL_TIERS.slice(0, 10).map((row) => [String(row.id), 1]))
    flushSync(() => useGame.setState({ skills, unlocked: ["studio", "careerLog"], fresh: ["careerLog"] }))
    expect($("[data-testid='ide-view-log'] [data-testid='new-mark']")).not.toBeNull()
    // GitHug unlocks with the log, and the sidebar opens itself with it.
    expect($("[data-testid='career-log']")).not.toBeNull()
    click($("[data-testid='ide-view-log']"))
    expect($("[data-testid='career-log']")).toBeNull()
    click($("[data-testid='ide-view-log']"))
    expect($("[data-testid='career-log']")).not.toBeNull()
    expect(useGame.getState().fresh).not.toContain("careerLog")
  })
})

describe("the career log", () => {
  it("lists what is next and the history newest first, with HEAD on top", () => {
    useGame.setState({ xp: 10_000, xpTotal: 2_300 })
    useGame.getState().buySkill(1)
    useGame.getState().buySkill(2)
    render(CareerLog)
    const history = $$("[data-testid='career-log-history'] li")
    expect(history[0]?.textContent).toContain("HEAD")
    expect(history.at(-1)?.textContent).toContain("init: high school")
    expect($$("[data-testid='career-log-next'] li").map((li) => li.dataset.feature)).toEqual(["studio", "careerLog", "githug"])
  })
})

describe("the shop teases what is next", () => {
  it("hides closed boards except the next one, and names what a row unlocks", () => {
    writeSavedShopTab("A")
    useGame.setState({ skills: Object.fromEntries(SKILL_TIERS.slice(0, 4).map((row) => [String(row.id), 1])), xpTotal: 1_000, xp: 50 })
    render(Shop, { onCollapse: () => {}, docked: false, onDock: () => {} })
    const tabs = $$(".era-tabs:not(.era-sub) [role='tab']").map((tab) => tab.dataset.phase)
    // The studio waits for the first job, so there is no Company tab yet.
    expect(tabs).toEqual(["A", "G"])
    expect($("[data-phase='G']")?.classList.contains("is-next")).toBe(true)
    expect($$("[data-row='skill:5'] [data-testid='unlock-chip']").map((chip) => chip.dataset.feature)).toEqual(["careerLog", "githug"])
    // A row wears the feature's icon and keeps the name for the tooltip and screen readers.
    const badge = $("[data-row='skill:5'] [data-testid='unlock-chip']")!
    expect(badge.dataset.feature).toBe("careerLog")
    expect(badge.querySelector("svg")).not.toBeNull()
    expect(badge.querySelector(".ul-chip-name")).toBeNull()
    // Owned rows have nothing left to tease.
    expect($("[data-row='skill:1'] [data-testid='unlock-chip']")).toBeNull()
  })
})

// The star and the profile button both sit on the activity bar.
const GitHugCorner = () => createElement(Fragment, null, createElement(GitHugStar), createElement(GitHugButton))

describe("the GitHug corner", () => {
  it("stays off the desk, real star included, until Git + GitHug hygiene", () => {
    useGame.setState({ skills: { "1": 1 } })
    render(GitHugCorner)
    expect($("[data-testid='github-star']")).toBeNull()
    expect($("[data-testid='view-githug']")).toBeNull()
  })

  it("opens a profile with this career's contribution graph and pinned repos", () => {
    useGame.setState({ skills: { "1": 1, "5": 1, "10": 1 }, unlocked: ["studio", "careerLog", "githug"], fresh: ["githug"] })
    render(GitHugCorner)
    expect($("[data-testid='github-star']")).not.toBeNull()
    click($("[data-testid='view-githug']"))
    expect($("[data-testid='githug-modal']")).not.toBeNull()
    // 26 columns of five squares, filled as the career goes.
    const days = $$("[data-testid='githug-graph'] .githug-day")
    expect(days.length).toBe(26 * 5)
    expect($$("[data-testid='githug-pinned'] strong").map((el) => el.textContent)).toEqual(["til", "hello-world"])
    expect(useGame.getState().fresh).not.toContain("githug")
  })

  it("shows the career's own handle, with nothing to edit", () => {
    useGame.setState({ skills: { "1": 1, "10": 1 }, unlocked: ["githug"], profile: { handle: "brisk-axolotl", product: "Axolotlly", chosen: true } })
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
    expect($("[data-testid='identity-keep']")).toBeNull()
    click($("[data-testid='identity-next']"))
    // The second step is the origin: the card cannot go on until one is picked.
    expect($("[data-testid='identity-origins']")).not.toBeNull()
    expect(($("[data-testid='identity-next']") as HTMLButtonElement | null)?.disabled).toBe(true)
    click($("[data-testid='identity-origin-bootcamp']"))
    expect(useGame.getState().build.origin).toBe("bootcamp")
    click($("[data-testid='identity-origin-college']"))
    expect(useGame.getState().build.origin).toBe("college")
    expect(($("[data-testid='identity-next']") as HTMLButtonElement | null)?.disabled).toBe(false)
    click($("[data-testid='identity-next']"))
    // The third step names the product after the new animal; its Reroll changes only the suffix.
    expect($("[data-testid='identity-product']")?.textContent).toBe(second.product)
    click($("[data-testid='identity-product-reroll']"))
    const third = useGame.getState().profile
    expect(third.handle).toBe(second.handle)
    expect(third.product).not.toBe(second.product)
    expect($("[data-testid='identity-product']")?.textContent).toBe(third.product)
    click($("[data-testid='identity-back']"))
    expect($("[data-testid='identity-origins']")).not.toBeNull()
    click($("[data-testid='identity-back']"))
    expect($("[data-testid='identity-handle']")?.textContent).toBe(`@${third.handle}`)
    click($("[data-testid='identity-next']"))
    click($("[data-testid='identity-next']"))
    click($("[data-testid='identity-next']"))
    expect($("[data-testid='identity-picker']")?.textContent).toContain(`build ${third.product} on nights and weekends`)
    expect($("[data-testid='identity-keep']")?.textContent).toBe(`Start as @${third.handle}`)
    click($("[data-testid='identity-keep']"))
    expect(useGame.getState().profile).toEqual({ ...third, chosen: true })
    expect(useGame.getState().build.origin).toBe("college")
    expect($("[data-testid='identity-picker']")).toBeNull()
  })

  it("keeps the whole card from any step in one call", () => {
    render(IdentityPicker)
    click($("[data-testid='identity-next']"))
    flushSync(() => useGame.getState().keepProfile())
    expect($("[data-testid='identity-picker']")).toBeNull()
  })

  it("never shows for a career that already kept its handle", () => {
    useGame.getState().keepProfile()
    render(IdentityPicker)
    expect($("[data-testid='identity-picker']")).toBeNull()
  })
})
