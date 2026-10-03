/**
 * In-browser Python for IDE files (function + TESTS).
 *
 * PyScript 2026.7.3 boots this same Pyodide (v314.0.3) inside a worker and only
 * resolves once that worker dispatches `py:done`. In this app that event never
 * arrives, so the donkey call stays pending. Load Pyodide on the page instead
 * and run each file in a fresh namespace.
 */

export const PYSCRIPT_VERSION = "2026.7.3"
export const PYODIDE_VERSION = "314.0.3"
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

export type PythonTestCase = {
  index: number
  ok: boolean
  argsLabel: string
  expect?: string
  got?: string
  error?: string
}

export type PythonRunResult =
  | { ok: true; cases: PythonTestCase[] }
  | { ok: false; message: string; cases: PythonTestCase[] }

const HARNESS = `
def __ide_run_tests__(ns, fn_name):
    cases = []
    if "TESTS" not in ns:
        return {
            "ok": False,
            "error": 'Define TESTS = [{"args": [...], "expect": ...}, ...]',
            "cases": [],
        }
    fn = ns.get(fn_name)
    if not callable(fn):
        return {"ok": False, "error": "Function %r not found" % (fn_name,), "cases": []}
    for i, t in enumerate(ns["TESTS"]):
        args = t.get("args", [])
        expect = t["expect"]
        label = repr(list(args))
        try:
            got = fn(*args)
            ok = got == expect
            cases.append({
                "index": i,
                "ok": ok,
                "argsLabel": label,
                "expect": repr(expect),
                "got": repr(got),
            })
        except Exception as e:
            cases.append({"index": i, "ok": False, "argsLabel": label, "error": str(e)})
    return {"ok": all(c["ok"] for c in cases), "cases": cases}
`

type PyodideRuntime = {
  runPython: (code: string) => unknown
}

const stdoutLog = { write: (_line: string) => {} }

type RunHooks = {
  onStatus?: (message: string) => void
  onStdout?: (text: string) => void
}

let runtimePromise: Promise<PyodideRuntime> | null = null

async function loadRuntime(onStatus?: (message: string) => void): Promise<PyodideRuntime> {
  if (!runtimePromise) {
    onStatus?.("Downloading Pyodide…")
    runtimePromise = (async () => {
      const url = `${PYODIDE_INDEX}pyodide.mjs`
      const mod = (await import(/* @vite-ignore */ url)) as {
        loadPyodide: (opts?: {
          indexURL?: string
          stdout?: (line: string) => void
          stderr?: (line: string) => void
        }) => Promise<PyodideRuntime>
      }
      onStatus?.("Starting Pyodide…")
      return mod.loadPyodide({
        indexURL: PYODIDE_INDEX,
        stdout: (line) => stdoutLog.write(String(line)),
        stderr: (line) => stdoutLog.write(String(line)),
      })
    })().catch((err) => {
      runtimePromise = null
      throw err
    })
  }
  return runtimePromise
}

/** Boot Pyodide without running a file. Later runs reuse the same interpreter. */
export function ensurePythonRuntime(onStatus?: (message: string) => void) {
  return loadRuntime(onStatus)
}

/** First `FUNCTION = "name"` line, else the first top-level `def`. */
export function inferPythonFunction(source: string): string | null {
  const explicit = source.match(/^FUNCTION\s*=\s*["'](\w+)["']\s*(?:#.*)?$/m)
  if (explicit?.[1]) return explicit[1]
  const defLine = source.match(/^def\s+(\w+)\s*\(/m)
  return defLine?.[1] ?? null
}

export function formatRunResult(result: PythonRunResult): string {
  if (!result.ok && result.message && result.cases.length === 0) return result.message
  const lines: string[] = []
  for (const row of result.cases) {
    if (row.ok) lines.push(`✓ TESTS[${row.index}] args=${row.argsLabel}`)
    else if (row.error) lines.push(`✗ TESTS[${row.index}] args=${row.argsLabel} — ${row.error}`)
    else lines.push(`✗ TESTS[${row.index}] args=${row.argsLabel} — expected ${row.expect}, got ${row.got}`)
  }
  if (result.cases.length === 0 && result.message) lines.unshift(result.message)
  if (result.ok) lines.push(`\n${result.cases.length} passed`)
  else lines.push(`\n${result.cases.filter((c) => c.ok).length}/${result.cases.length} passed`)
  return lines.join("\n")
}

function program(source: string, fnName: string): string {
  return `${HARNESS}
import json
_ns = {}
exec(${JSON.stringify(source)}, _ns)
json.dumps(__ide_run_tests__(_ns, ${JSON.stringify(fnName)}))
`
}

function asResult(raw: unknown): PythonRunResult {
  if (typeof raw !== "string") {
    return { ok: false, message: "Pyodide did not return test JSON.", cases: [] }
  }
  const parsed = JSON.parse(raw) as {
    ok?: boolean
    error?: string
    cases?: PythonTestCase[]
  }
  const cases = parsed.cases ?? []
  if (parsed.error) return { ok: false, message: parsed.error, cases }
  return { ok: Boolean(parsed.ok), cases }
}

export async function runPythonTests(source: string, hooks: RunHooks = {}): Promise<PythonRunResult> {
  const fnName = inferPythonFunction(source)
  if (!fnName) {
    return {
      ok: false,
      message: 'Add a top-level def … or FUNCTION = "name" before TESTS.',
      cases: [],
    }
  }

  let py: PyodideRuntime
  try {
    py = await loadRuntime(hooks.onStatus)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `Pyodide failed to start: ${message}`, cases: [] }
  }

  hooks.onStatus?.("Running…")
  let stdout = ""
  stdoutLog.write = (line) => {
    stdout += line.endsWith("\n") ? line : `${line}\n`
    hooks.onStdout?.(stdout)
  }

  try {
    return asResult(py.runPython(program(source, fnName)))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, message, cases: [] }
  }
}

const REPL_BOOT = `
import json, sys
from io import StringIO

def __ide_repl__(src):
    try:
        code = compile(src, "<stdin>", "single")
    except SyntaxError as e:
        msg = e.msg or str(e)
        if any(mark in msg for mark in ("EOF", "indent", "never closed")):
            return json.dumps({"incomplete": True, "output": ""})
        return json.dumps({"incomplete": False, "output": "SyntaxError: " + msg + "\\n"})
    shown = []
    buf = StringIO()
    old_out, old_err, old_hook = sys.stdout, sys.stderr, sys.displayhook
    sys.stdout = sys.stderr = buf
    def hook(value):
        if value is not None:
            shown.append(repr(value))
            globals()["_"] = value
    sys.displayhook = hook
    try:
        exec(code, globals())
    except Exception as e:
        text = buf.getvalue() + type(e).__name__ + ": " + str(e) + "\\n"
        return json.dumps({"incomplete": False, "output": text})
    finally:
        sys.stdout, sys.stderr, sys.displayhook = old_out, old_err, old_hook
    text = buf.getvalue()
    if shown:
        if text and not text.endswith("\\n"):
            text += "\\n"
        text += shown[-1] + "\\n"
    return json.dumps({"incomplete": False, "output": text})
`

let replInstalled = false

async function installRepl(py: PyodideRuntime) {
  if (replInstalled) return
  py.runPython(REPL_BOOT)
  replInstalled = true
}

/** Run a file in the shared interpreter. Definitions stay available at the prompt. */
export async function execPythonFile(source: string, hooks: RunHooks = {}): Promise<{ output: string; error?: string }> {
  let py: PyodideRuntime
  try {
    py = await loadRuntime(hooks.onStatus)
    await installRepl(py)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { output: "", error: `Pyodide failed to start: ${message}\n` }
  }

  let output = ""
  stdoutLog.write = (line) => {
    output += line.endsWith("\n") ? line : `${line}\n`
    hooks.onStdout?.(output)
  }
  try {
    py.runPython(`exec(${JSON.stringify(source)})`)
    return { output }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { output, error: `${message}\n` }
  }
}

/** One interactive statement. `incomplete` means the prompt should stay open for more lines. */
export async function evalPythonRepl(source: string): Promise<{ output: string; incomplete: boolean }> {
  const py = await loadRuntime()
  await installRepl(py)
  const raw = py.runPython(`__ide_repl__(${JSON.stringify(source)})`)
  if (typeof raw !== "string") return { output: "Pyodide did not return a result.\n", incomplete: false }
  const parsed = JSON.parse(raw) as { output?: string; incomplete?: boolean }
  return { output: parsed.output ?? "", incomplete: Boolean(parsed.incomplete) }
}

/** Test helper: drop the cached interpreter so the next run loads it again. */
export function resetPythonRunnerForTests() {
  runtimePromise = null
  replInstalled = false
}
