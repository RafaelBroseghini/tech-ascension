import { describeEntry } from "./careerLog.ts"
import type { CareerEntry } from "./careerLog.ts"
import { featureById } from "./features.ts"
import { FEATURES } from "../data/features.ts"
import type { FeatureRow } from "../data/features.ts"
import type { Surface } from "./surfaces.ts"

/**
 * The notification history: everything that rings the unlock chime, newest first, read off the career journal.
 * That is a desk feature opening, a board opening, a balance milestone and the win (see `chimeFor`).
 */

export type Notification = {
  seq: number
  at: number
  /** A feature id, or the journal ref for a milestone or the win. Features are the ones that can carry a NEW marker. */
  id: string
  name: string
  blurb: string
  /** Where "Open" goes. Null for rows with no place of their own (a board, a milestone). */
  surface: Surface | null
  /** The settings rows "Open" goes to first, most exact first (see `settingsTargetsOf`). Null when it lives elsewhere. */
  settings: string[] | null
}

/** Feature ids that are also surfaces the desk can open. */
const SURFACES = new Set<string>(["careerLog", "githug", "linkedout", "metrics", "rosters", "clickKits", "themes", "music", "tenx", "boardGear", "studio"])

/** The surface a row opens: its own, or its picker's for a cosmetic. */
export function surfaceOf(id: string): Surface | null {
  const row = featureById(id)
  if (!row) return null
  if (row.parent) return surfaceOf(row.parent)
  return SURFACES.has(id) ? (id as Surface) : null
}

/** Rows that live in the settings menu, by the marks to look for there. */
const SETTINGS_TARGETS: Record<string, string[]> = {
  clickKits: ["kit", "clicks"],
  themes: ["theme"],
  music: ["music", "music-style"],
  parade: ["parade-source", "parade"],
  hoverClick: ["hoverClick"],
  cat: ["cat"],
  rosters: ["rosters"],
}

/** Where a cosmetic's option sits after its own mark: its picker's section, then the switch that shows it. */
const PICKER_TARGETS: Record<string, string[]> = {
  clickKits: ["kit", "clicks"],
  themes: ["theme"],
  music: ["music-style", "music"],
}

/**
 * Where a row sits in the settings menu, most exact first: a cosmetic's own option, then its picker's section, then
 * the switch that shows the section (the click kits hide while click sounds are off). Null for rows outside settings.
 */
export function settingsTargetsOf(id: string): string[] | null {
  const row = featureById(id)
  if (!row) return null
  const targets = row.parent ? PICKER_TARGETS[row.parent] : SETTINGS_TARGETS[id]
  if (!targets) return null
  return row.parent ? [id, ...targets] : [...targets]
}

/** A board that changes the phase is journaled as a phase entry ("phase:B"), not an unlock, so map it back to its row. */
const BOARD_OF_PHASE: Record<string, "gigs" | "jobs" | "capital"> = { "phase:B": "gigs", "phase:C": "jobs", "phase:D": "capital" }

function featureOf(entry: CareerEntry): FeatureRow | undefined {
  if (entry.type === "unlock") return featureById(entry.ref)
  const board = entry.type === "phase" ? BOARD_OF_PHASE[entry.ref] : undefined
  return board ? FEATURES.find((row) => row.trigger.kind === "board" && row.trigger.board === board) : undefined
}

/**
 * The journal's chiming steps, newest first. Rows from before the log (a backfill) were never announced, and rows
 * behind admin mode play no reveal, so neither is listed unless `admin` shows the whole desk.
 */
export function notificationsOf(entries: readonly CareerEntry[], admin: boolean): Notification[] {
  const out: Notification[] = []
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (!entry || entry.data?.backfill === true) continue
    if (entry.type === "milestone" || (entry.type === "world" && entry.ref === "world:won")) {
      out.push({ seq: entry.seq, at: entry.at, id: entry.ref, name: describeEntry(entry).title, blurb: describeEntry(entry).detail, surface: null, settings: null })
      continue
    }
    const row = featureOf(entry)
    if (!row || (row.admin && !admin)) continue
    out.push({ seq: entry.seq, at: entry.at, id: row.id, name: entry.type === "unlock" ? describeEntry(entry).title : row.name, blurb: row.blurb, surface: surfaceOf(row.id), settings: settingsTargetsOf(row.id) })
  }
  return out
}

/** How many listed notifications still carry their NEW marker: the badge on the bell. */
export function unreadCount(list: readonly Notification[], fresh: readonly string[]): number {
  const marked = new Set(fresh)
  return list.reduce((n, item) => n + (marked.has(item.id) ? 1 : 0), 0)
}
