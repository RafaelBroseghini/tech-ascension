import { DEFAULT_UI_FONT_ID, isUiFontId, uiFontById } from "../data/uiFonts.ts"
import type { UiFont, UiFontId } from "../data/uiFonts.ts"
import { readPref, writePref } from "./ledger.ts"

/** Separate from the career save, so wiping a run keeps the face. Mirrors ideTheme.ts. */

const listeners = new Set<() => void>()
let saved: UiFont | null = null
let preview: UiFont | null = null
/** The face actually painted, so a repeat paint (a click on the row already previewed) does nothing. */
let painted: UiFontId | null = null
let pending: ReturnType<typeof setTimeout> | 0 = 0

/** A hover preview waits for the pointer to rest on a row, so sweeping down the list does not strobe through every face. */
export const FONT_PREVIEW_REST_MS = 120

/** Chakra Petch ships in the main CSS. The others are separate chunks, fetched the first time a face is previewed or picked. */
const LOADERS: Partial<Record<UiFontId, () => Promise<unknown>>> = {
  "jetbrains-mono": () => Promise.all([import("@fontsource/jetbrains-mono/latin-500.css"), import("@fontsource/jetbrains-mono/latin-600.css"), import("@fontsource/jetbrains-mono/latin-700.css")]),
  "space-grotesk": () => Promise.all([import("@fontsource/space-grotesk/latin-500.css"), import("@fontsource/space-grotesk/latin-600.css"), import("@fontsource/space-grotesk/latin-700.css")]),
  "pixelify-sans": () => Promise.all([import("@fontsource/pixelify-sans/latin-500.css"), import("@fontsource/pixelify-sans/latin-600.css"), import("@fontsource/pixelify-sans/latin-700.css")]),
  atkinson: () => Promise.all([import("@fontsource/atkinson-hyperlegible-next/latin-500.css"), import("@fontsource/atkinson-hyperlegible-next/latin-600.css"), import("@fontsource/atkinson-hyperlegible-next/latin-700.css")]),
}

const loading = new Map<UiFontId, Promise<unknown>>()

/** Starts fetching a face's CSS (and so its files) once. A failed fetch falls back to the stack's next family. */
function load(id: UiFontId): void {
  if (typeof document === "undefined" || loading.has(id)) return
  const loader = LOADERS[id]
  if (!loader) return
  loading.set(
    id,
    loader().catch(() => loading.delete(id)),
  )
}

/** Fetches every face's CSS, so the settings rows can show each name in its own face. Cheap: the files only download when text uses them. */
export function loadUiFonts(): void {
  for (const id of Object.keys(LOADERS) as UiFontId[]) load(id)
}

export function parseUiFontId(value: string | null): UiFontId {
  return value && isUiFontId(value) ? value : DEFAULT_UI_FONT_ID
}

function readStoredId(): UiFontId {
  const raw = readPref("font")
  return parseUiFontId(typeof raw === "string" ? raw : null)
}

function savedFont(): UiFont {
  if (!saved) saved = uiFontById(readStoredId())
  return saved
}

/** The face on screen: a hover preview, or the saved choice. */
export function getUiFont(): UiFont {
  return preview ?? savedFont()
}

/** The choice a click stored. Hovering does not change this. */
export function getSavedUiFont(): UiFont {
  return savedFont()
}

function paint(font: UiFont): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--font-display", font.stack)
  root.style.setProperty("--font-scale", String(font.scale))
  root.dataset.uiFont = font.id
}

/** Puts `font` on screen, loading its files first. Nothing happens when it is already there. */
function show(font: UiFont): void {
  load(font.id)
  if (painted === font.id) return
  painted = font.id
  paint(font)
}

/** Shows what `getUiFont` says, after `delay` (a hover at rest) or now. A newer call replaces a waiting one. */
function settle(delay: number): void {
  if (pending) clearTimeout(pending)
  pending = 0
  if (delay <= 0) {
    show(getUiFont())
    return
  }
  pending = setTimeout(() => {
    pending = 0
    show(getUiFont())
  }, delay)
}

function emit(): void {
  settle(0)
  for (const listener of listeners) listener()
}

/** Paints the saved face before the first frame. */
export function applyUiFont(): void {
  show(getUiFont())
}

/** Previews a face once the pointer rests on its row (`FONT_PREVIEW_REST_MS`). Nothing is written until `setUiFont`. */
export function previewUiFont(id: string): void {
  if (!isUiFontId(id)) return
  const next = uiFontById(id)
  if (next.id === savedFont().id) {
    if (!preview) return
    preview = null
    settle(FONT_PREVIEW_REST_MS)
    return
  }
  if (preview?.id === next.id) return
  preview = next
  load(next.id)
  settle(FONT_PREVIEW_REST_MS)
}

/** Drops a hover preview and returns to the saved face. */
export function clearUiFontPreview(): void {
  if (!preview) {
    // A preview may still be waiting to paint the saved face back.
    if (pending) settle(0)
    return
  }
  preview = null
  settle(0)
}

export function setUiFont(id: string): void {
  if (!isUiFontId(id)) return
  const next = uiFontById(id)
  const same = saved?.id === next.id && !preview
  saved = next
  preview = null
  writePref("font", next.id)
  if (same) {
    if (pending) settle(0)
    return
  }
  emit()
}

export function subscribeUiFont(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
