/** Appends TESTS + __main__ to IDE Python snippets (see idePythonFixtures.ts). */

import { IDE_PYTHON_FIXTURES, type IdePythonFixture } from "./idePythonFixtures.ts"

const MAIN_RE = /\nif __name__ == ["']__main__["']:[\s\S]*$/m
const TESTS_RE = /\nTESTS\s*=\s*\[[\s\S]*?\]\s*(?=\n|$)/m
const FUNCTION_RE = /\nFUNCTION\s*=\s*["'][\w]+["']\s*(?:#.*)?\n/m

export function stripHarness(code: string): string {
  return code
    .replace(MAIN_RE, "")
    .replace(TESTS_RE, "")
    .replace(FUNCTION_RE, "")
    .trimEnd()
}

function inferFirstDef(code: string): string | null {
  const m = code.match(/^def (\w+)\s*\(/m)
  return m?.[1] ?? null
}

function pythonLiteral(value: unknown): string {
  if (value === null) return "None"
  if (typeof value === "boolean") return value ? "True" : "False"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((v) => pythonLiteral(v)).join(", ")}]`
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}: ${pythonLiteral(v)}`).join(", ")}}`
  }
  return "None"
}

function formatTests(tests: IdePythonFixture["tests"]): string {
  const rows = tests.map(
    (t) => `    {"args": ${JSON.stringify(t.args)}, "expect": ${pythonLiteral(t.expect)}},`,
  )
  return `\n\nTESTS = [\n${rows.join("\n")}\n]`
}

function formatMain(mainLines: string[]): string {
  if (!mainLines.length) return ""
  return `\n\nif __name__ == "__main__":\n${mainLines.map((line) => `    ${line}`).join("\n")}`
}

const DEFAULT_SMOKE: IdePythonFixture = {
  function: "_ide_smoke",
  append: `\ndef _ide_smoke():\n    return True\n`,
  tests: [{ args: [], expect: true }],
  mainLines: ['print("ok")'],
}

export function ensurePythonHarness(code: string, path: string): string {
  const base = path.split("/").pop() ?? path
  const fixture = IDE_PYTHON_FIXTURES[base] ?? DEFAULT_SMOKE
  let body = stripHarness(code)
  if (fixture.append) body = `${body}\n${fixture.append.trim()}\n`

  const firstDef = inferFirstDef(body)
  const fn = fixture.function ?? firstDef ?? "_ide_smoke"
  const useFunctionLine = fn !== firstDef

  const mainLines =
    fixture.mainLines ??
    (fixture.tests[0]?.args.length
      ? [`print(${fn}(${fixture.tests[0].args.map((_, i) => `TESTS[0]["args"][${i}]`).join(", ")}))`]
      : [`print(${fn}())`])

  const fnLine = useFunctionLine ? `\nFUNCTION = ${JSON.stringify(fn)}\n` : ""
  return `${body}${fnLine}${formatTests(fixture.tests)}${formatMain(mainLines)}`
}
