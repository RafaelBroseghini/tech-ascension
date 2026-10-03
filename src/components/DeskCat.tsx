import { useEffect, useState, useSyncExternalStore } from "react"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { getDeskActivity, getDeskPrefs, subscribeDeskActivity, subscribeDeskPrefs } from "../game/desk.ts"

const SLEEP_MS = 8000
const HOP_MS = 320
const DESK_CAT_SRC = deskCatEmojiUrl()

/**
 * Cat-on-a-computer emoji on the windowsill. Dozes when the desk goes quiet and hops when you click.
 */
export function DeskCat() {
  const on = useSyncExternalStore(subscribeDeskPrefs, () => getDeskPrefs().cat, () => getDeskPrefs().cat)
  const activity = useSyncExternalStore(subscribeDeskActivity, getDeskActivity, getDeskActivity)
  const [seen, setSeen] = useState(activity)
  const [asleep, setAsleep] = useState(false)
  const [hop, setHop] = useState(false)

  if (activity !== seen) {
    setSeen(activity)
    setAsleep(false)
    setHop(activity > 0)
  }

  useEffect(() => {
    const hopTimer = window.setTimeout(() => setHop(false), HOP_MS)
    const sleepTimer = window.setTimeout(() => setAsleep(true), SLEEP_MS)
    return () => {
      window.clearTimeout(hopTimer)
      window.clearTimeout(sleepTimer)
    }
  }, [activity])

  if (!on) return null

  const className = ["desk-cat", asleep ? "is-asleep" : "", hop ? "is-hop" : ""].filter(Boolean).join(" ")

  return (
    <span className={className} data-testid="desk-cat" aria-hidden="true">
      {asleep ? <i className="desk-cat-z">z</i> : null}
      <img className="desk-cat-img" src={DESK_CAT_SRC} alt="" width={118} height={108} draggable={false} decoding="async" />
    </span>
  )
}
