// The pool itself, not emojiCdn.ts: save hydration reads this module from the entry chunk, and
// emojiCdn would pull the whole emoji manifest in with it.
import DESK_CAT_CLICK_POOL from "../data/deskCatClickPool.json"

export type RosterCat = {
  /** 1-based slot in the roster, in pool order. */
  no: number
  url: string
  name: string
}

/** "CatDance.gif" -> "Cat Dance", "2762-cat-sleep-pc.png" -> "Cat Sleep Pc". */
export function catName(url: string): string {
  const file = url.slice(url.lastIndexOf("/") + 1).replace(/\.[a-z0-9]+$/i, "")
  const words = file
    .replace(/^\d+[-_]/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[-_\s]+/)
    .filter(Boolean)
  if (words.length === 0) return "Cat"
  return words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join(" ")
}

/** Every cat the desk cat can turn into when tapped. */
export const CAT_ROSTER: readonly RosterCat[] = [...new Set(DESK_CAT_CLICK_POOL)].map((url, index) => ({
  no: index + 1,
  url,
  name: catName(url),
}))

const ROSTER_URLS = new Set(CAT_ROSTER.map((cat) => cat.url))

export function isRosterCat(url: unknown): url is string {
  return typeof url === "string" && ROSTER_URLS.has(url)
}

/** Discovery order, roster cats only, no repeats. */
export function normalizeCatsFound(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(isRosterCat))]
}

/** The list with `url` added, or the same list when it is already there or not a roster cat. */
export function addCatFound(found: string[], url: string): string[] {
  if (!isRosterCat(url) || found.includes(url)) return found
  return [...found, url]
}
