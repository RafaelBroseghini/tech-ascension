import { ChevronDown, ChevronUp, X } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { markIdePythonRunHintSeen, readIdePythonRunHintSeen } from "../game/idePythonRunHint.ts"
import { ensurePythonRuntime, evalPythonRepl, execPythonFile } from "../game/pyRunner.ts"
import {
  closeIdePythonConsole,
  getIdePythonConsole,
  setIdePythonRunBusy,
  subscribeIdePythonConsole,
  toggleIdePythonConsoleExpanded,
} from "../game/idePythonConsole.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"

type Entry = { prompt: string; text: string; output: string }

export function IdePythonConsole() {
  const snap = useSyncExternalStore(subscribeIdePythonConsole, getIdePythonConsole, getIdePythonConsole)
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState("")
  const [entries, setEntries] = useState<Entry[]>([])
  const [banner, setBanner] = useState("")
  const [runHintSeen, setRunHintSeen] = useState(() => readIdePythonRunHintSeen())
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const history = useRef<string[]>([])
  const historyAt = useRef(-1)

  useEffect(() => {
    if (!snap.open) return
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [snap.open, entries, banner, ready])

  useEffect(() => {
    if (snap.bootNonce === 0) return
    const nonce = snap.bootNonce
    let alive = true
    const boot = async () => {
      setReady(false)
      setBanner("Starting Python…")
      setIdePythonRunBusy(true)
      try {
        await ensurePythonRuntime()
        if (!alive || getIdePythonConsole().bootNonce !== nonce) return
        setBanner("")
        setReady(true)
        inputRef.current?.focus()
      } catch (err) {
        if (!alive || getIdePythonConsole().bootNonce !== nonce) return
        const message = err instanceof Error ? err.message : String(err)
        setBanner(message)
      } finally {
        if (alive && getIdePythonConsole().bootNonce === nonce) setIdePythonRunBusy(false)
      }
    }
    void boot()
    return () => {
      alive = false
    }
  }, [snap.bootNonce])

  useEffect(() => {
    if (snap.runNonce === 0 || !snap.file) return
    const nonce = snap.runNonce
    const file = snap.file
    let alive = true
    const run = async () => {
      setReady(false)
      setBanner(`Running ${file.path}…`)
      setIdePythonRunBusy(true)
      const result = await execPythonFile(file.code)
      if (!alive || getIdePythonConsole().runNonce !== nonce) return
      const output = `${result.output}${result.error ?? ""}`
      if (output) {
        setEntries((current) => [...current, { prompt: "", text: file.path, output }])
      }
      setBanner("")
      setReady(true)
      setIdePythonRunBusy(false)
      if (!readIdePythonRunHintSeen()) {
        markIdePythonRunHintSeen()
        setRunHintSeen(true)
      }
      inputRef.current?.focus()
    }
    void run()
    return () => {
      alive = false
    }
  }, [snap.runNonce, snap.file])

  async function submit() {
    if (!ready) return
    const line = draft
    const source = pending ? `${pending}\n${line}` : line
    if (!source.trim()) {
      setDraft("")
      setPending("")
      return
    }
    setDraft("")
    setReady(false)
    history.current.push(source)
    historyAt.current = -1
    const prompt = pending ? "..." : ">>>"
    try {
      const result = await evalPythonRepl(source)
      if (result.incomplete) {
        setPending(source)
        setEntries((current) => [...current, { prompt, text: line, output: "" }])
        return
      }
      setPending("")
      setEntries((current) => [...current, { prompt, text: line, output: result.output }])
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPending("")
      setEntries((current) => [...current, { prompt, text: line, output: `${message}\n` }])
    } finally {
      setReady(true)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void submit()
      return
    }
    if (event.key === "ArrowUp" && draft === "") {
      const next = historyAt.current < 0 ? history.current.length - 1 : historyAt.current - 1
      const item = history.current[next]
      if (item === undefined) return
      event.preventDefault()
      historyAt.current = next
      setPending("")
      setDraft(item)
    }
  }

  if (!snap.open) return null

  const prompt = pending ? "..." : ">>>"
  const showRunHint = !runHintSeen && entries.length === 0 && !banner

  return (
    <section
      className={snap.expanded ? "ide-python-console is-expanded" : "ide-python-console"}
      data-testid="ide-run-panel"
      aria-label="Console"
    >
      <header className="ide-python-console-head">
        <span className="ide-python-console-title">Console</span>
        <span className="ide-python-console-file">{ready ? "" : "Starting…"}</span>
        <button
          type="button"
          className="ide-python-console-expand"
          data-testid="ide-console-expand"
          aria-label={snap.expanded ? "Collapse console" : "Expand console"}
          aria-expanded={snap.expanded}
          onClick={toggleIdePythonConsoleExpanded}
        >
          {snap.expanded ? <ChevronDown {...UI_ICON_SM} aria-hidden /> : <ChevronUp {...UI_ICON_SM} aria-hidden />}
        </button>
        <button type="button" className="ide-python-console-close" aria-label="Close console" onClick={closeIdePythonConsole}>
          <X {...UI_ICON_SM} aria-hidden />
        </button>
      </header>
      <div ref={logRef} className="ide-python-console-terminal" data-testid="ide-py-terminal">
        {showRunHint ? (
          <p className="ide-repl-hint" data-testid="ide-run-hint">
            Run a .py file with ▶ in the activity bar or Play on a row in the explorer.
          </p>
        ) : null}
        {entries.map((entry, index) => (
          <div key={index} className="ide-repl-entry">
            {entry.prompt ? (
              <div className="ide-repl-line">
                <span className="ide-repl-prompt">{entry.prompt}</span>
                <span>{entry.text}</span>
              </div>
            ) : (
              <div className="ide-repl-file">{entry.text}</div>
            )}
            {entry.output ? <pre className="ide-repl-out">{entry.output}</pre> : null}
          </div>
        ))}
        {banner ? <p className="ide-repl-banner">{banner}</p> : null}
        <form
          className="ide-repl-line"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <span className="ide-repl-prompt">{prompt}</span>
          <textarea
            ref={inputRef}
            className="ide-repl-input"
            data-testid="ide-repl-input"
            rows={Math.max(1, draft.split("\n").length)}
            value={draft}
            disabled={!ready}
            spellCheck={false}
            aria-label="Python prompt"
            placeholder={ready ? "" : "Starting Python…"}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </form>
      </div>
    </section>
  )
}
