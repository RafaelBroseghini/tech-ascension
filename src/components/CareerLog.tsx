import { Braces } from "lucide-react"
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { agoLabel, CAREER_TYPES, careerLine, describeEntry } from "../game/careerLog.ts"
import type { CareerEntry, CareerType } from "../game/careerLog.ts"
import { progressOf } from "../game/careerSync.ts"
import { upNext } from "../game/features.ts"
import { useGame } from "../game/store.ts"
import { openSurface } from "../game/surfaces.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { useAdmin } from "./useFeature.ts"

type Tease = { id: string; name: string; via: string; fill: number; left: string; mystery: boolean }

/** Up next as one string, rounded, so the panel re-renders when a bar visibly moves and not on every tick. */
function upNextKey(state: ReturnType<typeof useGame.getState>): string {
  const rows = upNext(progressOf(state), new Set(state.unlocked)).map((row) => ({
    id: row.id,
    name: row.name,
    via: row.via,
    fill: Math.floor(row.fill * 50) / 50,
    left: row.left,
    mystery: row.mystery,
  }))
  return JSON.stringify(rows)
}

/** Re-renders every half minute, so "4m" ages without following the game clock. */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

const HISTORY_STEP = 150

/**
 * The Git view of the sidebar: what unlocks next, then the career as commits, newest on top. The braces button
 * opens the same entries as JSON in the console's Output tab.
 */
export function CareerLog() {
  const entries = useGame((state) => state.journal.entries)
  const admin = useAdmin()
  const upKey = useGame((state) => (admin ? "[]" : upNextKey(state)))
  const now = useMinuteClock()
  const [limit, setLimit] = useState(HISTORY_STEP)
  const up = JSON.parse(upKey) as Tease[]
  const shown = entries.slice(-limit).reverse()

  return (
    <div className="career-log" data-testid="career-log">
      <div className="ide-tree-head">
        <p className="ide-tree-title">Career log</p>
        <button
          type="button"
          className="ide-tree-action"
          data-testid="career-log-json"
          aria-label="Open the career log as JSON"
          title="JSON, in the console's Output tab"
          onClick={() => openSurface("output")}
        >
          <Braces {...UI_ICON_SM} aria-hidden />
        </button>
      </div>
      <div className="career-log-scroll">
        {up.length > 0 ? (
          <section aria-label="Up next">
            <p className="career-log-sec">Up next</p>
            <ol className="career-log-list is-next" data-testid="career-log-next">
              {up.map((row) => (
                <li key={row.id} data-feature={row.id}>
                  <b>{row.mystery ? "???" : row.name}</b>
                  <small>{row.mystery ? row.via : row.left || row.via}</small>
                  {row.mystery ? null : (
                    <span className="career-log-bar" aria-hidden="true">
                      <i style={{ width: `${Math.round(row.fill * 100)}%` }} />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <section aria-label="History">
          <p className="career-log-sec">
            History <span>{entries.length}</span>
          </p>
          <ol className="career-log-list" data-testid="career-log-history">
            {shown.map((entry, index) => {
              const row = describeEntry(entry)
              return (
                <li key={entry.seq} data-tone={row.tone} className={index === 0 ? "is-head" : undefined}>
                  <b>
                    {row.tone === "unlock" ? <em>+</em> : null}
                    {row.title}
                    {index === 0 ? <span className="career-log-tag">HEAD</span> : null}
                  </b>
                  <small>
                    {row.detail ? `${row.detail} · ` : ""}
                    {entry.data?.backfill === true ? "before the log" : agoLabel(entry.at, now)}
                  </small>
                </li>
              )
            })}
          </ol>
          {entries.length > limit ? (
            <button type="button" className="career-log-more" onClick={() => setLimit((current) => current + HISTORY_STEP)}>
              Show older
            </button>
          ) : null}
        </section>
      </div>
    </div>
  )
}

/** JSON coloured with the editor's own token colours: keys blue, strings green, numbers peach. */
function colorJson(line: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])/g
  let last = 0
  let key = 0
  for (let match = re.exec(line); match; match = re.exec(line)) {
    if (match.index > last) out.push(line.slice(last, match.index))
    const [text, str, colon, num, bool] = match
    if (str) {
      out.push(
        <span key={key++} className={colon ? "tok-fn" : "tok-str"}>
          {str}
        </span>,
      )
      if (colon) out.push(<span key={key++} className="out-punc">{colon}</span>)
    } else if (num) out.push(<span key={key++} className="tok-num">{num}</span>)
    else if (bool) out.push(<span key={key++} className="tok-kw">{bool}</span>)
    else out.push(<span key={key++} className="out-punc">{text}</span>)
    last = match.index + text.length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

function clock(at: number): string {
  const date = new Date(at)
  return [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, "0")).join(":")
}

const OutputLine = memo(function OutputLine({ entry }: { entry: CareerEntry }) {
  return (
    <div className="out-line" data-testid="output-line" data-type={entry.type}>
      <span className="out-time">{clock(entry.at)}</span>
      <code>{colorJson(careerLine(entry))}</code>
    </div>
  )
})

const OUTPUT_WINDOW = 300

/**
 * The console's Output tab: the career journal as JSON lines, one object per step, newest at the bottom. Filter by
 * type, copy the lot, or save it as a .jsonl file.
 */
export function CareerOutput() {
  const entries = useGame((state) => state.journal.entries)
  const [filter, setFilter] = useState<CareerType | "all">("all")
  const [everything, setEverything] = useState(false)
  const [copied, setCopied] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const rows = filter === "all" ? entries : entries.filter((entry) => entry.type === filter)
  const shown = everything ? rows : rows.slice(-OUTPUT_WINDOW)

  useLayoutEffect(() => {
    const list = listRef.current
    if (list && pinned.current) list.scrollTop = list.scrollHeight
  }, [shown.length, filter])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(id)
  }, [copied])

  const text = () => `${rows.map(careerLine).join("\n")}\n`

  return (
    <div className="career-output" data-testid="career-output">
      <div className="career-output-bar">
        <label className="career-output-filter">
          <span>Show</span>
          <select value={filter} data-testid="output-filter" onChange={(event) => setFilter(event.target.value as CareerType | "all")}>
            <option value="all">every line</option>
            {CAREER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <span className="career-output-count" data-testid="output-count">
          {rows.length} {rows.length === 1 ? "line" : "lines"}
        </span>
        <button
          type="button"
          className="career-output-btn"
          data-testid="output-copy"
          onClick={() => {
            void navigator.clipboard?.writeText(text()).then(() => setCopied(true), () => {})
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className="career-output-btn"
          data-testid="output-download"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text()], { type: "application/x-ndjson" }))
            const link = document.createElement("a")
            link.href = url
            link.download = "career-log.jsonl"
            link.click()
            window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}
        >
          Save .jsonl
        </button>
      </div>
      <div
        ref={listRef}
        className="career-output-lines"
        data-testid="output-lines"
        onScroll={(event) => {
          const list = event.currentTarget
          pinned.current = list.scrollHeight - list.scrollTop - list.clientHeight < 24
        }}
      >
        {!everything && rows.length > shown.length ? (
          <button type="button" className="career-log-more" onClick={() => setEverything(true)}>
            Show {rows.length - shown.length} older lines
          </button>
        ) : null}
        {shown.map((entry) => (
          <OutputLine key={entry.seq} entry={entry} />
        ))}
        {rows.length === 0 ? <p className="ide-repl-hint">Nothing of that type yet.</p> : null}
      </div>
    </div>
  )
}
