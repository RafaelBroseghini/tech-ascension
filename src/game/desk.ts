import { bindDeskAudio, playCozyClick, syncDeskAudio } from "./deskAudio.ts"
import { parseMusicStyleId } from "./deskMusicStyles.ts"
import type { MusicStyleId } from "./deskMusicStyles.ts"
import { readPref, writePref } from "./ledger.ts"

/** Separate from the career save, so wiping a run keeps the room. */

export type DeskPrefs = {
  music: boolean
  musicStyle: MusicStyleId
  sounds: boolean
  cat: boolean
  /** When false, rare enemies do not spawn. A fight already on screen is dismissed. */
  enemies: boolean
  /** When true, and every catalog row is owned, hovering the stage emoji clicks at the max rate. */
  hoverClick: boolean
}

const DEFAULTS: DeskPrefs = { music: false, musicStyle: "cozy", sounds: true, cat: true, enemies: true, hoverClick: false }

const prefListeners = new Set<() => void>()
const activityListeners = new Set<() => void>()
let prefs: DeskPrefs | null = null
let activity = 0

export function parseDeskPrefs(raw: unknown): DeskPrefs {
  const next: DeskPrefs = { ...DEFAULTS }
  if (raw == null || raw === "") return next
  let body: unknown = raw
  if (typeof raw === "string") {
    try {
      body = JSON.parse(raw)
    } catch {
      return { ...DEFAULTS }
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ...DEFAULTS }
  for (const key of ["music", "sounds", "cat", "enemies", "hoverClick"] as const) {
    const value = (body as Record<string, unknown>)[key]
    if (typeof value === "boolean") next[key] = value
  }
  next.musicStyle = parseMusicStyleId((body as Record<string, unknown>).musicStyle)
  return next
}

function readPrefs(): DeskPrefs {
  return parseDeskPrefs(readPref("desk"))
}

function writePrefs(value: DeskPrefs): void {
  writePref("desk", value)
}

export function getDeskPrefs(): DeskPrefs {
  if (!prefs) prefs = readPrefs()
  return prefs
}

export function setDeskPref<K extends keyof DeskPrefs>(key: K, value: DeskPrefs[K]): void {
  const current = getDeskPrefs()
  if (current[key] === value) return
  prefs = { ...current, [key]: value }
  writePrefs(prefs)
  for (const listener of prefListeners) listener()
  syncDeskAudio()
  if (key === "sounds" && value) playCozyClick()
}

export function subscribeDeskPrefs(listener: () => void): () => void {
  prefListeners.add(listener)
  return () => prefListeners.delete(listener)
}

/** Bumps when the stage is clicked, so the cat can wake up. */
export function getDeskActivity(): number {
  return activity
}

export function subscribeDeskActivity(listener: () => void): () => void {
  activityListeners.add(listener)
  return () => activityListeners.delete(listener)
}

/** A real click: wake the cat, and play the cozy tap when desk sounds are on. */
export function pokeDesk(): void {
  activity += 1
  for (const listener of activityListeners) listener()
  playCozyClick()
  syncDeskAudio()
}

bindDeskAudio(() => {
  const prefs = getDeskPrefs()
  return { music: prefs.music, sounds: prefs.sounds, musicStyle: prefs.musicStyle }
})
