import { useMemo, useSyncExternalStore } from "react"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { CAT_ROSTER } from "../game/catRoster.ts"
import { getDeskPrefs, setDeskPref, subscribeDeskPrefs } from "../game/desk.ts"
import { useGame } from "../game/store.ts"
import { RosterModal, type RosterItem } from "./RosterModal.tsx"

/** The sleeping cat the desk starts with. Always unlocked, so a pick can be undone. */
const DEFAULT_KEY = "cat:default"
const DEFAULT_CAT: RosterItem = { key: DEFAULT_KEY, no: 0, name: "Sleepy desk cat", art: deskCatEmojiUrl() }

// Each cat has one found and one locked row, built once, so a new find only swaps that cat's
// row and the memoized grid leaves every other cell alone.
const FOUND_ROWS = new Map<string, RosterItem>(CAT_ROSTER.map((cat) => [cat.url, { key: cat.url, no: cat.no, name: cat.name, art: cat.url }]))
const LOCKED_ROWS = new Map<string, RosterItem>(
  CAT_ROSTER.map((cat) => [cat.url, { key: cat.url, no: cat.no, name: cat.name, art: cat.url, locked: true }]),
)

/**
 * Character select for the desk cat. Found cats show their art; the rest stay a black silhouette
 * until the desk cat turns into them. Clicking a found cat puts it on the desk for good.
 */
export function CatRosterModal({ onClose }: { onClose: () => void }) {
  const found = useGame((state) => state.stats.catsFound)
  const art = useSyncExternalStore(subscribeDeskPrefs, () => getDeskPrefs().catArt, () => getDeskPrefs().catArt)
  const owned = useMemo(() => new Set(found), [found])
  const items = useMemo<RosterItem[]>(
    () => [DEFAULT_CAT, ...CAT_ROSTER.map((cat) => (owned.has(cat.url) ? FOUND_ROWS : LOCKED_ROWS).get(cat.url)!)],
    [owned],
  )
  const chosenKey = art ?? DEFAULT_KEY

  return (
    <RosterModal
      id="cats"
      kicker="Desk cat"
      title="Select your cat"
      items={items}
      total={CAT_ROSTER.length}
      unlockedCount={owned.size}
      accent="mauve"
      startKey={chosenKey}
      chosenKey={chosenKey}
      chosenTag="Desk"
      onChoose={(item) => setDeskPref("catArt", item.key === DEFAULT_KEY ? null : item.key)}
      hint={(item) => {
        if (item.locked) return "Tap the desk cat to find this one"
        return item.key === chosenKey ? "On your desk" : "Click to put on your desk"
      }}
      empty="No cats yet."
      onClose={onClose}
    />
  )
}
