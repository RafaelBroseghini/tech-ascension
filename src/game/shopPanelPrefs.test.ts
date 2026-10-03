import { beforeEach, describe, expect, it } from "vitest"
import { createMemoryPort, readPref, resetLedgerForTests, sealImage } from "./ledger.ts"
import { freshSave } from "./save.ts"
import { readShopPanelOpen, writeShopPanelOpen } from "./shopPanelPrefs.ts"

describe("shop panel prefs", () => {
  beforeEach(() => {
    resetLedgerForTests()
    const port = createMemoryPort()
    sealImage(freshSave(1), null, 1, [], port)
  })

  it("defaults to open", () => {
    expect(readShopPanelOpen()).toBe(true)
  })

  it("persists hidden state", () => {
    writeShopPanelOpen(false)
    expect(readShopPanelOpen()).toBe(false)
    expect(readPref("shopPanel")).toBe(false)
  })

  it("hydrates from the durable shelf on boot", () => {
    resetLedgerForTests()
    const port = createMemoryPort()
    sealImage(freshSave(1), null, 1, [{ id: "shopPanel", rev: 2, body: false }], port)
    expect(readShopPanelOpen()).toBe(false)
  })
})
