/** The gifs the parade can show: found cats and the art of every row held. Apart from gifParade.ts, which the harness loads, because this pulls in the emoji manifest. */
import { emojiClickUrl, emojiIdleUrl } from "../data/emojiAssets.ts"
import type { ParadeSourceId } from "../data/paradeStyles.ts"
import { catGifs, isGif } from "./gifParade.ts"
import { ROSTER_KINDS, rosterEntries, type RosterKind, type RosterProgress } from "./rosters.ts"

export type ParadeProgress = RosterProgress & { catsFound: readonly string[] }

/** Idle and click gifs of the rows held in one shop roster, in catalog order. */
export function heldGifs(kind: RosterKind, p: RosterProgress): string[] {
  const urls: string[] = []
  for (const entry of rosterEntries(kind, p)) {
    for (const url of [emojiIdleUrl(entry.art.kind, entry.art.id), emojiClickUrl(entry.art.kind, entry.art.id)]) {
      if (url && isGif(url)) urls.push(url)
    }
  }
  return urls
}

/** Every unlocked gif in the picked category (or all of them), each once. */
export function paradePool(source: ParadeSourceId, p: ParadeProgress): string[] {
  const kinds = source === "all" ? ROSTER_KINDS : source === "cats" ? [] : [source]
  const cats = source === "all" || source === "cats" ? catGifs(p.catsFound) : []
  return [...new Set([...cats, ...kinds.flatMap((kind) => heldGifs(kind, p))])]
}

/** Gifs unlocked per category, "all" included, so the picker can show the counts. */
export function paradeCounts(p: ParadeProgress): Record<ParadeSourceId, number> {
  const cats = catGifs(p.catsFound).length
  const byKind = Object.fromEntries(ROSTER_KINDS.map((kind) => [kind, new Set(heldGifs(kind, p)).size])) as Record<RosterKind, number>
  return { all: paradePool("all", p).length, cats, ...byKind }
}
