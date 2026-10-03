import { beforeEach, describe, expect, it } from "vitest"
import { readPref, resetLedgerForTests, writePref } from "./ledger.ts"
import { parseSavedShopTab, readSavedShopTab, writeSavedShopTab } from "./shopTabPrefs.ts"

describe("shop tab prefs", () => {
  beforeEach(() => {
    resetLedgerForTests()
  })

  it("defaults to null when nothing is stored", () => {
    expect(parseSavedShopTab(null)).toBeNull()
    expect(readSavedShopTab()).toBeNull()
  })

  it("persists each shop tab id", () => {
    writeSavedShopTab("G")
    expect(readSavedShopTab()).toBe("G")
    expect(readPref("shopTab")).toBe("G")
  })

  it("clears when the player follows the current phase again", () => {
    writeSavedShopTab("B")
    writeSavedShopTab(null)
    expect(readSavedShopTab()).toBeNull()
    expect(readPref("shopTab")).toBeNull()
  })

  it("ignores unknown values", () => {
    writePref("shopTab", "nope")
    expect(readPref("shopTab")).toBe("nope")
    expect(readSavedShopTab()).toBeNull()
  })
})
