import { describeEntry } from "./careerLog.ts"
import type { CareerEntry } from "./careerLog.ts"
import { featureById } from "./features.ts"
import type { FeatureId } from "../data/features.ts"
import type { Surface } from "./surfaces.ts"

/** The notification history: every unlock the player has been told about, newest first, read off the career journal. */

export type Notification = {
  seq: number
  at: number
  id: FeatureId
  name: string
  blurb: string
  /** Where "Open" goes. Null for rows with no place of their own (a board, dollars). */
  surface: Surface | null
}

/** Feature ids that are also surfaces the desk can open. */
const SURFACES = new Set<string>(["careerLog", "githug", "linkedout", "metrics", "rosters", "clickKits", "themes", "music", "tenx", "boardGear", "studio"])

/** The surface a row opens: its own, or its picker's for a cosmetic. */
export function surfaceOf(id: FeatureId): Surface | null {
  const row = featureById(id)
  if (!row) return null
  if (row.parent) return surfaceOf(row.parent)
  return SURFACES.has(id) ? (id as Surface) : null
}

/**
 * The journal's unlocks, newest first. Rows from before the log (a backfill) were never announced, and rows behind
 * admin mode play no reveal, so neither is listed unless `admin` shows the whole desk.
 */
export function notificationsOf(entries: readonly CareerEntry[], admin: boolean): Notification[] {
  const out: Notification[] = []
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (!entry || entry.type !== "unlock" || entry.data?.backfill === true) continue
    const row = featureById(entry.ref)
    if (!row || (row.admin && !admin)) continue
    out.push({ seq: entry.seq, at: entry.at, id: row.id, name: describeEntry(entry).title, blurb: row.blurb, surface: surfaceOf(row.id) })
  }
  return out
}

/** How many listed notifications still carry their NEW marker: the badge on the bell. */
export function unreadCount(list: readonly Notification[], fresh: readonly FeatureId[]): number {
  const marked = new Set<string>(fresh)
  return list.reduce((n, item) => n + (marked.has(item.id) ? 1 : 0), 0)
}
