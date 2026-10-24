import { useEffect, useState } from "react"
import { agoLabel, describeEntry } from "../game/careerLog.ts"
import { progressOf } from "../game/careerSync.ts"
import { markById, upcomingMarks, yearNumber } from "../game/careerYear.ts"
import { upNext } from "../game/features.ts"
import { useGame } from "../game/store.ts"
import { useAdmin } from "./useFeature.ts"
import { arrivedLate, enterRef, laidOut } from "./useMotion.ts"

/** A commit that lands at the head of the log drops in from above. Only a new head does: the list as it opens, and older history, do not. */
const headIn = enterRef({
  fade: { in: 0.22, out: 0 },
  move: { from: { y: -14 }, to: {}, spring: { stiffness: 520, damping: 30, mass: 0.8 } },
})
const newHead = (el: HTMLElement | null) => {
  const list = el?.parentElement
  if (el && list && laidOut(el) && arrivedLate(list)) headIn(el)
}

type Tease = { id: string; name: string; via: string; left: string; mystery: boolean }

/** Up next as one string, so the panel re-renders only when a row changes and not on every tick. */
function upNextKey(state: ReturnType<typeof useGame.getState>): string {
  const rows = upNext(progressOf(state), new Set(state.unlocked)).map((row) => ({
    id: row.id,
    name: row.name,
    via: row.via,
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

/** Where the career is in years, and the next marks its path has coming. One string, so it re-renders only when a year or a mark changes. */
function yearsKey(state: ReturnType<typeof useGame.getState>): string {
  const ahead = upcomingMarks(state.xpTotal, state.build.origin, state.build.leadership, 3).map((mark) => mark.id)
  return JSON.stringify({ year: yearNumber(state.xpTotal), ahead })
}

function CareerYears() {
  const key = useGame(yearsKey)
  const { year, ahead } = JSON.parse(key) as { year: number; ahead: string[] }
  return (
    <section aria-label="Career years" data-testid="career-years">
      <p className="career-log-sec">
        Year <span data-testid="career-year">{year}</span>
      </p>
      {ahead.length > 0 ? (
        <ol className="career-log-list is-next" data-testid="career-years-next">
          {ahead.map((id) => {
            const mark = markById(id)
            return mark ? (
              <li key={id} data-mark={id}>
                <b>{mark.title}</b>
                <small>{`Year ${Math.floor(mark.at) + 1} · ${mark.blurb}`}</small>
              </li>
            ) : null
          })}
        </ol>
      ) : null}
    </section>
  )
}

/** The Git view of the sidebar: what unlocks next, then the career as commits, newest on top. */
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
      </div>
      <div className="career-log-scroll">
        <CareerYears />
        {up.length > 0 ? (
          <section aria-label="Up next">
            <p className="career-log-sec">Up next</p>
            <ol className="career-log-list is-next" data-testid="career-log-next">
              {up.map((row) => (
                <li key={row.id} data-feature={row.id}>
                  <b>{row.mystery ? "???" : row.name}</b>
                  <small>{row.left || row.via}</small>
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
                <li key={entry.seq} ref={index === 0 ? newHead : undefined} data-tone={row.tone} className={index === 0 ? "is-head" : undefined}>
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

