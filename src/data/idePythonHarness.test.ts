import { describe, expect, it } from "vitest"
import { IDE_PACKS } from "./idePacks.ts"
import { packForTier } from "./idePacks.ts"
import type { FilePack } from "./idePacks.ts"
import { ensurePythonHarness } from "./idePythonHarness.ts"

describe("IDE Python harness", () => {
  it("adds TESTS and __main__ to every resolved file tab", () => {
    for (const meta of IDE_PACKS) {
      if (meta.kind !== "files") continue
      const next = IDE_PACKS.find((p) => p.fromTier > meta.fromTier)
      const endArt = (next?.fromTier ?? 67) - 1
      const pack = packForTier(endArt) as FilePack
      if (pack.id !== meta.id) continue
      for (const file of pack.files) {
        expect(file.lang).toBe("python")
        expect(file.code).toMatch(/\nTESTS = \[\n/m)
        expect(file.code).toMatch(/\nif __name__ == ["']__main__["']:/m)
      }
    }
  })

  it("strips duplicate harness blocks when re-applied", () => {
    const once = ensurePythonHarness("def add(a, b):\n    return a + b", "add.py")
    const twice = ensurePythonHarness(once, "add.py")
    expect(twice.match(/TESTS = \[/g)?.length).toBe(1)
    expect(twice.match(/if __name__ == "__main__":/g)?.length).toBe(1)
  })
})
