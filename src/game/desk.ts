import { bindDeskAudio, playCozyClick, syncDeskAudio } from "./deskAudio.ts"
import { parseClickKitId } from "./deskClickKits.ts"
import type { ClickKitId } from "./deskClickKits.ts"
import { parseMusicStyleId } from "./deskMusicStyles.ts"
import type { MusicStyleId } from "./deskMusicStyles.ts"
import { readPref, writePref } from "./ledger.ts"

/** Separate from the career save, so wiping a run keeps the room. */

export type DeskPrefs = {
  music: boolean
  musicStyle: MusicStyleId
  /** The room: typing, coffee, a mouse. Not the player's own click. */
  sounds: boolean
  /** The player's own click. Separate from the room, so either can be off. */
  clicks: boolean
  clickKit: ClickKitId
  cat: boolean
  /** When false, rare enemies do not spawn. A fight already on screen is dismissed. */
  enemies: boolean
  /** When true, and every catalog row is owned, hovering the stage emoji clicks at the max rate. */
  hoverClick: boolean
  /** Pixel offset of the money/XP hero card from its default spot (persists across runs). */
  heroOffsetX: number
  heroOffsetY: number
  /** Dismissed the small-screen “best on desktop” notice. */
  mobilePlayAck: boolean
}

const DEFAULTS: DeskPrefs = {
  music: false,
  musicStyle: "cozy",
  sounds: true,
  clicks: true,
  clickKit: "thock",
  cat: true,
  enemies: true,
  hoverClick: false,
  heroOffsetX: 0,
  heroOffsetY: 0,
  mobilePlayAck: false,
}

const HERO_OFFSET_CLAMP = 280

function parseHeroOffset(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.round(Math.max(-HERO_OFFSET_CLAMP, Math.min(HERO_OFFSET_CLAMP, value)))
}

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
  for (const key of ["music", "sounds", "clicks", "cat", "enemies", "hoverClick", "mobilePlayAck"] as const) {
    const value = (body as Record<string, unknown>)[key]
    if (typeof value === "boolean") next[key] = value
  }
  // A room saved before the click had its own switch keeps what its desk sounds said.
  if (typeof (body as Record<string, unknown>).clicks !== "boolean") next.clicks = next.sounds
  next.musicStyle = parseMusicStyleId((body as Record<string, unknown>).musicStyle)
  next.clickKit = parseClickKitId((body as Record<string, unknown>).clickKit)
  next.heroOffsetX = parseHeroOffset((body as Record<string, unknown>).heroOffsetX)
  next.heroOffsetY = parseHeroOffset((body as Record<string, unknown>).heroOffsetY)
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
  if ((key === "clicks" && value) || (key === "clickKit" && prefs.clicks)) playCozyClick()
}

export function setDeskHeroOffset(x: number, y: number): void {
  const heroOffsetX = parseHeroOffset(x)
  const heroOffsetY = parseHeroOffset(y)
  const current = getDeskPrefs()
  if (current.heroOffsetX === heroOffsetX && current.heroOffsetY === heroOffsetY) return
  prefs = { ...current, heroOffsetX, heroOffsetY }
  writePrefs(prefs)
  for (const listener of prefListeners) listener()
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
  return { music: prefs.music, sounds: prefs.sounds, clicks: prefs.clicks, musicStyle: prefs.musicStyle, clickKit: prefs.clickKit }
})
