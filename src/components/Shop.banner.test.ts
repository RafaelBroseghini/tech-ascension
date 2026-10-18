/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { SKILL_TIERS } from "../data/phases.ts"
import { writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { Shop } from "./Shop.tsx"

// A root left mounted keeps listening to the store and can reset the saved shop tab under the next test.
const roots: Root[] = []

function renderShop(): HTMLDivElement {
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  roots.push(root)
  flushSync(() => {
    root.render(createElement(Shop))
  })
  return host
}

function openTab(host: ParentNode, id: string) {
  flushSync(() => {
    host.querySelector<HTMLButtonElement>(`[role='tab'][data-phase='${id}']`)?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("shop panels carry no next-unlock banner", () => {
  afterEach(() => {
    for (const root of roots.splice(0)) flushSync(() => root.unmount())
    document.body.innerHTML = ""
    writeSavedShopTab("A")
  })

  it("shows no banner on an open panel or a closed one", () => {
    writeSavedShopTab("A")
    useGame.setState({ xp: 14_000, xpTotal: 14_000, skills: Object.fromEntries(SKILL_TIERS.slice(0, 15).map((row) => [String(row.id), 1])) })
    const host = renderShop()
    expect(host.querySelector("[data-testid='next-unlock']")).toBeNull()
    openTab(host, "A")
    expect(host.querySelector("[data-testid='next-unlock']")).toBeNull()
  })

  it("a closed board still says what it needs in its lock panel", () => {
    writeSavedShopTab("B")
    useGame.setState({ xp: 14_000, xpTotal: 14_000, skills: Object.fromEntries(SKILL_TIERS.slice(0, 15).map((row) => [String(row.id), 1])) })
    const host = renderShop()
    expect(host.querySelector("[data-testid='next-unlock']")).toBeNull()
    expect(host.querySelector("[data-testid='lock-panel']")?.textContent).toContain("React")
  })
})
