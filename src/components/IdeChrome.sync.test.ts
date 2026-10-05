/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { SKILL_TIERS } from "../data/phases.ts"
import { readCollapsedFolders, writeCollapsedFolders } from "../game/ideTreePrefs.ts"
import { useGame } from "../game/store.ts"
import { IdeChrome } from "./IdeChrome.tsx"

const roots: Root[] = []

/** Enough skills that the open pack has a real strip of tabs to pick from. */
function ownSkills() {
  useGame.setState({ skills: Object.fromEntries(SKILL_TIERS.slice(0, 40).map((row) => [String(row.id), 1])) })
}

function renderIde(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(IdeChrome))
  })
  return host
}

/** The file on screen, the active tab, and the highlighted explorer row all name the same file. */
function names(host: ParentNode) {
  return {
    shown: host.querySelector<HTMLElement>("[data-testid='ide']")?.dataset.file,
    tab: host.querySelector(".ide-tab.is-active span")?.textContent,
    rows: [...host.querySelectorAll(".ide-item-wrap.is-active .ide-item-main")].map((el) => el.textContent),
  }
}

describe("explorer, tabs and editor stay on the same file", () => {
  afterEach(() => {
    flushSync(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
    writeCollapsedFolders(new Set())
    useGame.getState().wipe()
  })

  it("collapses every folder from the Explorer header and keeps them folded", () => {
    const host = renderIde()
    const button = host.querySelector<HTMLButtonElement>("[data-testid='ide-collapse-all']")!
    expect(button.getAttribute("aria-label")).toBe("Collapse all folders")
    expect(button.disabled).toBe(false)
    expect(host.querySelectorAll("[data-testid='ide-item']").length).toBeGreaterThan(0)
    flushSync(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(host.querySelectorAll("[data-testid='ide-item']")).toHaveLength(0)
    expect(host.querySelectorAll("[data-testid='ide-folder']").length).toBeGreaterThan(0)
    expect(button.disabled).toBe(true)
    expect(readCollapsedFolders().size).toBe(host.querySelectorAll("[data-testid='ide-folder']").length)
  })

  it("agrees on the starting file", () => {
    const { shown, tab, rows } = names(renderIde())
    expect(rows).toEqual([shown])
    expect(tab).toBe(shown)
  })

  it("keeps agreeing after a pick in the explorer and a pick in the tab strip", () => {
    ownSkills()
    const host = renderIde()
    const start = names(host).shown
    const items = host.querySelectorAll<HTMLButtonElement>("[data-testid='ide-item']")
    expect(items.length).toBeGreaterThan(5)
    flushSync(() => items[4]?.click())
    let now = names(host)
    expect(now.shown).not.toBe(start)
    expect(now.rows).toEqual([now.shown])
    expect(now.tab).toBe(now.shown)

    const tabs = host.querySelectorAll<HTMLButtonElement>("[data-testid='ide-tab']")
    flushSync(() => tabs[1]?.click())
    const afterTab = names(host)
    expect(afterTab.shown).not.toBe(now.shown)
    expect(afterTab.rows).toEqual([afterTab.shown])
    expect(afterTab.tab).toBe(afterTab.shown)
  })

  it("reopens a folded folder so the open file always has a visible row", () => {
    const open = renderIde().querySelector<HTMLElement>("[data-testid='ide']")?.dataset.pack
    if (!open) throw new Error("no open pack")
    flushSync(() => document.body.replaceChildren())
    writeCollapsedFolders(new Set([open]))
    const host = renderIde()
    expect(host.querySelector(`[data-testid='ide-folder'][data-pack='${open}'] .ide-item-wrap.is-active`)).not.toBeNull()
  })

  it("lets you fold the open folder, and reopens it only when the selection moves", () => {
    ownSkills()
    const host = renderIde()
    const head = host.querySelector<HTMLButtonElement>(".ide-folder-head.is-active")
    flushSync(() => head?.click())
    expect(host.querySelector(".ide-item-wrap.is-active")).toBeNull()
    // an unrelated re-render does not reopen what you folded
    flushSync(() => useGame.setState({ money: 123 }))
    expect(host.querySelector(".ide-item-wrap.is-active")).toBeNull()

    const tabs = host.querySelectorAll<HTMLButtonElement>("[data-testid='ide-tab']")
    expect(tabs.length).toBeGreaterThan(1)
    flushSync(() => tabs[1]?.click())
    const now = names(host)
    expect(now.rows).toEqual([now.shown])
    expect(now.tab).toBe(now.shown)
  })
})
