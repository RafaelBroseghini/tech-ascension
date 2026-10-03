import { beforeEach, describe, expect, it } from "vitest"
import { readPref, resetLedgerForTests, writePref } from "./ledger.ts"
import { readCollapsedFolders, writeCollapsedFolders } from "./ideTreePrefs.ts"

describe("ideTreePrefs", () => {
  beforeEach(() => {
    resetLedgerForTests()
  })

  it("round-trips collapsed folder ids", () => {
    writeCollapsedFolders(new Set(["fizzbuzz", "search"]))
    expect(readCollapsedFolders()).toEqual(new Set(["fizzbuzz", "search"]))
    expect(readPref("treeFolds")).toEqual(["fizzbuzz", "search"])
  })

  it("drops unknown pack ids", () => {
    writeCollapsedFolders(new Set(["fizzbuzz", "not-a-pack"]))
    expect(readCollapsedFolders()).toEqual(new Set(["fizzbuzz"]))
  })

  it("returns empty when storage is missing or invalid", () => {
    expect(readCollapsedFolders()).toEqual(new Set())
    writeCollapsedFolders(new Set(["fizzbuzz"]))
    writePref("treeFolds", "{")
    expect(readPref("treeFolds")).toBe("{")
    expect(readCollapsedFolders()).toEqual(new Set())
  })
})
