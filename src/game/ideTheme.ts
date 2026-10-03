import { ideThemeById, ideThemeStyle, isIdeThemeId } from "../data/ideThemes.ts"
import type { IdeTheme, IdeThemeId } from "../data/ideThemes.ts"
import { readPref, writePref } from "./ledger.ts"

/** Separate from the career save, so wiping a run keeps the editor. */

const listeners = new Set<() => void>()
let saved: IdeTheme | null = null
let preview: IdeTheme | null = null

export function parseIdeThemeId(value: string | null): IdeThemeId {
  return value && isIdeThemeId(value) ? value : "mocha"
}

function readStoredId(): IdeThemeId {
  const raw = readPref("theme")
  return parseIdeThemeId(typeof raw === "string" ? raw : null)
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
}

function emit(): void {
  paint(getIdeTheme())
  for (const listener of listeners) listener()
}

/** Paints the saved theme before the first frame. */
export function applyIdeThemeScheme(): void {
  paint(getIdeTheme())
}

/** Shows a palette immediately. Nothing is written until `setIdeTheme`. */
export function previewIdeTheme(id: string): void {
  if (!isIdeThemeId(id)) return
  const next = ideThemeById(id)
  if (next.id === savedTheme().id) {
    if (!preview) return
    preview = null
    paint(getIdeTheme())
    return
  }
  if (preview?.id === next.id) return
  preview = next
  paint(getIdeTheme())
}

/** Drops a hover preview and restores the saved palette. */
export function clearIdeThemePreview(): void {
  if (!preview) return
  preview = null
  paint(getIdeTheme())
}

export function setIdeTheme(id: string): void {
  if (!isIdeThemeId(id)) return
  const next = ideThemeById(id)
  const same = saved?.id === next.id && !preview
  saved = next
  preview = null
  writeStoredId(next.id)
  if (same) return
  emit()
}

export function subscribeIdeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
