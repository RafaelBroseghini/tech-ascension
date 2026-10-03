import { describe, expect, it } from "vitest"
import { formatRunResult, inferPythonFunction } from "./pyRunner.ts"

describe("inferPythonFunction", () => {
  it("uses FUNCTION when set", () => {
    const src = `FUNCTION = "greet"\ndef hello():\n    return 1\n`
    expect(inferPythonFunction(src)).toBe("greet")
  })

  it("falls back to the first def", () => {
    const src = `def hello() -> str:\n    return "Hello, world!"\n`
    expect(inferPythonFunction(src)).toBe("hello")
  })

  it("returns null when no function is declared", () => {
    expect(inferPythonFunction('TESTS = [{"args": [], "expect": 1}]')).toBeNull()
  })
})

describe("formatRunResult", () => {
  it("summarizes passing and failing cases", () => {
    const text = formatRunResult({
      ok: false,
      cases: [
        { index: 0, ok: true, argsLabel: "[]" },
        { index: 1, ok: false, argsLabel: "['x']", expect: "'a'", got: "'b'" },
      ],
    })
    expect(text).toContain("✓ TESTS[0]")
    expect(text).toContain("✗ TESTS[1]")
    expect(text).toContain("1/2 passed")
  })
})
