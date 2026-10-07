import { beforeEach, describe, expect, it } from "vitest"
import { HIDDEN_LORE_PATH } from "../data/ideHiddenLore.ts"
import { itemsOf, packForTier, type FilePack } from "../data/idePacks.ts"
import { packWithHiddenLore } from "./ide.ts"
import { resetLedgerForTests } from "./ledger.ts"
import {
  readIdeLoreUnlocked,
  tryUnlockIdeLoreFromStatusBar,
  tryUnlockIdeLoreFromTab,
  unlockIdeLore,
} from "./ideSecrets.ts"

describe("IDE hidden lore", () => {
  beforeEach(() => {
    resetLedgerForTests()
  })

  it("appends ARCHITECTURE.md only in late file bands when unlocked", () => {
    const early = packForTier(12)
    expect((packWithHiddenLore(early, true) as FilePack).files.some((f) => f.path === HIDDEN_LORE_PATH)).toBe(false)
    const late = packForTier(44)
    expect((packWithHiddenLore(late, false) as FilePack).files.some((f) => f.path === HIDDEN_LORE_PATH)).toBe(false)
    expect((packWithHiddenLore(late, true) as FilePack).files.at(-1)?.path).toBe(HIDDEN_LORE_PATH)
  })

  it("unlocks from status triple-click and persists in prefs", () => {
    expect(readIdeLoreUnlocked()).toBe(false)
    tryUnlockIdeLoreFromStatusBar(1000)
    tryUnlockIdeLoreFromStatusBar(1100)
    tryUnlockIdeLoreFromStatusBar(1200)
    expect(readIdeLoreUnlocked()).toBe(true)
    expect(unlockIdeLore()).toBe(false)
  })

  it("appends the hidden file after the problem pool for tab selection", () => {
    const bare = packForTier(44)
    const withLore = packWithHiddenLore(bare, true) as FilePack
    const last = itemsOf(withLore).length - 1
    expect(itemsOf(bare).length + 1).toBe(itemsOf(withLore).length)
    expect(withLore.files[last]?.path).toBe(HIDDEN_LORE_PATH)
    expect(withLore.files[last]?.code).toContain("Tech Ascension")
  })

  it("unlocks from the first three attention tabs in order", () => {
    resetLedgerForTests()
    tryUnlockIdeLoreFromTab("debounce", 0, 1)
    expect(readIdeLoreUnlocked()).toBe(false)
    tryUnlockIdeLoreFromTab("attention", 0, 1)
    tryUnlockIdeLoreFromTab("attention", 1, 2)
    tryUnlockIdeLoreFromTab("attention", 2, 3)
    expect(readIdeLoreUnlocked()).toBe(true)
  })

})
