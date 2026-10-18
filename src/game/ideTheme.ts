import { ideThemeById, ideThemeStyle, isIdeThemeId } from "../data/ideThemes.ts"
import type { IdeTheme, IdeThemeId } from "../data/ideThemes.ts"
import { readPref, writePref } from "./ledger.ts"

/** Separate from the career save, so wiping a run keeps the editor. */

const listeners = new Set<() => void>()
let saved: IdeTheme | null = null
let preview: IdeTheme | null = null
/** The palette actually painted, so a repeat paint (a click on the row already previewed) does nothing. */
let painted: IdeThemeId | null = null
let pending: ReturnType<typeof setTimeout> | 0 = 0

/** A hover preview waits for the pointer to rest on a row, so sweeping down the list does not strobe through every palette. */
export const PREVIEW_REST_MS = 120

export function parseIdeThemeId(value: string | null): IdeThemeId {
  return value && isIdeThemeId(value) ? value : "mocha"
}

/** What a first run gets: Latte for a light OS (a base theme, so no unlock is given away), Mocha otherwise (and where there is no matchMedia, as under node). Never written to prefs; only a click stores a theme. */
function osThemeId(): IdeThemeId {
  const light = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches
  return light ? "latte" : "mocha"
}

function readStoredId(): IdeThemeId {
  const raw = readPref("theme")
  return typeof raw === "string" && isIdeThemeId(raw) ? raw : osThemeId()
}

function writeStoredId(id: IdeThemeId): void {
  writePref("theme", id)
}

function savedTheme(): IdeTheme {
  if (!saved) saved = ideThemeById(readStoredId())
  return saved
}

/** The palette on screen: a hover preview, or the saved choice. */
export function getIdeTheme(): IdeTheme {
  return preview ?? savedTheme()
}

/** The choice a click stored. Hovering does not change this. */
export function getSavedIdeTheme(): IdeTheme {
  return savedTheme()
}

function paint(theme: IdeTheme): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  for (const [key, value] of Object.entries(ideThemeStyle(theme))) root.style.setProperty(key, value)
  root.dataset.ideScheme = theme.kind
  root.dataset.ideTheme = theme.id
  // The browser bar follows the desk's top chrome. index.html carries Mocha's mantle for the first paint.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.colors.mantle)
}

type FadingDocument = Document & { startViewTransition?: (update: () => void) => unknown }

/** Whether a palette change can cross-fade: the View Transitions API is there and the player has not asked for less motion. */
function canFade(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false
  if (typeof (document as FadingDocument).startViewTransition !== "function") return false
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

/** Puts `theme` on screen: cross-faded when `smooth` and the browser can, else at once. Nothing happens when it is already there. */
function show(theme: IdeTheme, smooth: boolean): void {
  if (painted === theme.id) return
  painted = theme.id
  if (smooth && canFade()) (document as FadingDocument).startViewTransition!(() => paint(theme))
  else paint(theme)
}

/** Shows what `getIdeTheme` says, after `delay` (a hover at rest) or now. A newer call replaces a waiting one. */
function settle(delay: number): void {
  if (pending) clearTimeout(pending)
  pending = 0
  if (delay <= 0) {
    show(getIdeTheme(), true)
    return
  }
  pending = setTimeout(() => {
    pending = 0
    show(getIdeTheme(), true)
  }, delay)
}

function emit(): void {
  settle(0)
  for (const listener of listeners) listener()
}

/** Paints the saved theme before the first frame. */
export function applyIdeThemeScheme(): void {
  show(getIdeTheme(), false)
}

/** Previews a palette once the pointer rests on its row (`PREVIEW_REST_MS`), cross-faded. Nothing is written until `setIdeTheme`. */
export function previewIdeTheme(id: string): void {
  if (!isIdeThemeId(id)) return
  const next = ideThemeById(id)
  if (next.id === savedTheme().id) {
    if (!preview) return
    preview = null
    settle(PREVIEW_REST_MS)
    return
  }
  if (preview?.id === next.id) return
  preview = next
  settle(PREVIEW_REST_MS)
}

/** Drops a hover preview and fades back to the saved palette. */
export function clearIdeThemePreview(): void {
  if (!preview) {
    // A preview may still be waiting to paint the saved palette back.
    if (pending) settle(0)
    return
  }
  preview = null
  settle(0)
}

export function setIdeTheme(id: string): void {
  if (!isIdeThemeId(id)) return
  const next = ideThemeById(id)
  const same = saved?.id === next.id && !preview
  saved = next
  preview = null
  writeStoredId(next.id)
  if (same) {
    if (pending) settle(0)
    return
  }
  emit()
}

export function subscribeIdeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
