import { useEffect, useMemo, useRef, useState } from "react"
import type { Company } from "../../game/globe/company.ts"
import { useGame } from "../../game/store.ts"
import { openSurface } from "../../game/surfaces.ts"
import { enqueue, feedItems, FEED_SHOW_MS } from "./feed.ts"
import type { FeedFacts, FeedItem } from "./feed.ts"

/**
 * One short line above the desk's globe for what just happened to the company: an incident that started or ended, a first
 * user in a region, a milestone, requests dropping. One at a time, a few seconds each. Quiet while the "while you were away" note is up.
 */
export function GlobeFeed({ company }: { company: Company }) {
  const facts = useMemo<FeedFacts>(
    () => ({ users: company.regionUsers, incidents: company.incidents, health: company.health, won: company.won }),
    [company.regionUsers, company.incidents, company.health, company.won],
  )
  const prev = useRef(facts)
  const seen = useRef(new Map<string, number>())
  const [queue, setQueue] = useState<readonly FeedItem[]>([])

  useEffect(() => {
    const items = feedItems(prev.current, facts)
    prev.current = facts
    if (items.length === 0 || useGame.getState().toast?.note) return
    setQueue((q) => enqueue(q, items, seen.current, Date.now()))
  }, [facts])

  const current = queue[0]
  useEffect(() => {
    if (!current) return
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), FEED_SHOW_MS)
    return () => window.clearTimeout(id)
  }, [current])

  return (
    <div className="globe-feed" role="status" aria-live="polite">
      {current ? (
        <button key={current.key} type="button" className={`globe-feed-item is-${current.tone}`} data-testid="globe-feed" data-key={current.key} onClick={() => openSurface("studio")}>
          <i className="globe-feed-dot" aria-hidden />
          <span>{current.text}</span>
        </button>
      ) : null}
    </div>
  )
}
