import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react"
import { deskCatEmojiUrl, randomDeskCatReactionUrl } from "../data/emojiAssets.ts"
import { EMOJI_CLICK_MS } from "../data/emojiCdn.ts"
import { getDeskActivity, getDeskPrefs, pokeDesk, subscribeDeskActivity, subscribeDeskPrefs } from "../game/desk.ts"

const SLEEP_MS = 8000
const HOP_MS = 320
const DESK_CAT_SRC = deskCatEmojiUrl()

/**
 * Cat-on-a-computer emoji on the windowsill. Dozes when the desk goes quiet and hops when you click.
 * Tap the cat for a random cat from the emoji.gg pool; the default sleeping-on-PC art returns after.
 */
export function DeskCat() {
  const on = useSyncExternalStore(subscribeDeskPrefs, () => getDeskPrefs().cat, () => getDeskPrefs().cat)
  const activity = useSyncExternalStore(subscribeDeskActivity, getDeskActivity, getDeskActivity)
  const [seen, setSeen] = useState(activity)
  const [asleep, setAsleep] = useState(false)
  const [hop, setHop] = useState(false)
  const [reactionSrc, setReactionSrc] = useState<string | null>(null)
  const reactionTimer = useRef(0)

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

  useEffect(() => {
    return () => window.clearTimeout(reactionTimer.current)
  }, [])

  if (!on) return null

  function onCatPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setAsleep(false)
    setReactionSrc(randomDeskCatReactionUrl())
    pokeDesk()
    window.clearTimeout(reactionTimer.current)
    reactionTimer.current = window.setTimeout(() => setReactionSrc(null), EMOJI_CLICK_MS)
  }

  const reacting = reactionSrc !== null
  const className = ["desk-cat", asleep ? "is-asleep" : "", hop ? "is-hop" : "", reacting ? "is-react" : ""]
    .filter(Boolean)
    .join(" ")

  const src = reactionSrc ?? DESK_CAT_SRC

  return (
    <button
      type="button"
      className={className}
      data-testid="desk-cat"
      aria-label="Desk cat"
      onPointerDown={onCatPointerDown}
    >
      {asleep && !reacting ? <i className="desk-cat-z">z</i> : null}
      <img className="desk-cat-img" src={src} alt="" width={118} height={108} draggable={false} decoding="async" />
    </button>
  )
}
