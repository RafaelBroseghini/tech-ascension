import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("openGame", () => {
  // As a lazy chunk, the Dexie port shares a bundler chunk with the store in a production build. Loading it then boots the
  // store (a fresh career) before the saved one is read, and every reload starts from zero. Dev never chunks this way.
  it("imports the ledger port statically, so the store boots only after the saved career is sealed", () => {
    const source = readFileSync(new URL("./openGame.ts", import.meta.url), "utf8")
    expect(source).not.toMatch(/import\(\s*["']\.\/ledgerDexie\.ts["']\s*\)/)
    expect(source).toMatch(/^import \{[^}]*\} from "\.\/ledgerDexie\.ts"$/m)
  })
})
