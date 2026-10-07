import { describe, expect, it } from "vitest"
import { markIdePythonRunHintSeen, readIdePythonRunHintSeen } from "./idePythonRunHint.ts"
import { readPref, resetLedgerForTests } from "./ledger.ts"
import { unlockIdeLore } from "./ideSecrets.ts"

describe("idePythonRunHint", () => {
  it("persists on ideLore without clearing lore unlock", () => {
    resetLedgerForTests()
    expect(readIdePythonRunHintSeen()).toBe(false)
    markIdePythonRunHintSeen()
    expect(readIdePythonRunHintSeen()).toBe(true)
    expect(readPref("ideLore")).toEqual({ runHintSeen: true })
  })

  it("unlockIdeLore keeps runHintSeen", () => {
    resetLedgerForTests()
    markIdePythonRunHintSeen()
    unlockIdeLore()
    expect(readPref("ideLore")).toEqual({ runHintSeen: true, lore: true })
    expect(readIdePythonRunHintSeen()).toBe(true)
  })
})
