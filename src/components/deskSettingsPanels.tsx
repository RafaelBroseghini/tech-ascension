import { MousePointer2, MousePointerClick, Music, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect } from "react"
import type { CSSProperties, ReactNode } from "react"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle, ideThemesOf } from "../data/ideThemes.ts"
import { UI_FONTS } from "../data/uiFonts.ts"
import { setDeskPref } from "../game/desk.ts"
import type { DeskPrefs } from "../game/desk.ts"
import { CLICK_KIT_IDS, CLICK_KITS } from "../game/deskClickKits.ts"
import { MUSIC_STYLE_IDS, MUSIC_STYLES } from "../game/deskMusicStyles.ts"
import { clearIdeThemePreview, previewIdeTheme, setIdeTheme } from "../game/ideTheme.ts"
import { clearUiFontPreview, loadUiFonts, previewUiFont, setUiFont } from "../game/uiFont.ts"
import { clickKitChoices, musicChoices, themeChoices } from "../game/features.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { NewMark } from "./FeatureMarks.tsx"

const DESK_CAT_EMOJI = deskCatEmojiUrl()

export type DeskToggleKey = "music" | "sounds" | "clicks" | "cat" | "hoverClick"

export const DESK_TOGGLES: readonly {
  key: DeskToggleKey
  label: string
  Icon?: LucideIcon
  emoji?: string
  /** Hidden until hover clicking is unlocked (a gold hover skill, or every catalog row owned). */
  complete?: boolean
  title?: string
}[] = [
  { key: "music", label: "Music", Icon: Music },
  { key: "sounds", label: "Desk sounds", Icon: Volume2 },
  { key: "clicks", label: "Click sound", Icon: MousePointer2 },
  {
    key: "hoverClick",
    label: "Hover or hold click",
    Icon: MousePointerClick,
    complete: true,
    title: "Hover or hold the emoji to click automatically",
  },
  { key: "cat", label: "Cat", emoji: DESK_CAT_EMOJI },
]

const THEME_GROUPS = [
  { kind: "dark", label: "Dark" },
  { kind: "light", label: "Light" },
] as const

export function SettingsSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="ide-settings-section">
      <p className="ide-theme-heading">{heading}</p>
      <div className="ide-settings-section-panel">{children}</div>
    </section>
  )
}

type DeskToggleListProps = {
  desk: DeskPrefs
  /** Hover clicks a second: 0 while hover clicking is locked. */
  hoverPerSec: number
  keys?: readonly DeskToggleKey[]
}

export function DeskToggleList({ desk, hoverPerSec, keys }: DeskToggleListProps) {
  const allowed = new Set(keys)
  const rows = DESK_TOGGLES.filter((toggle) => {
    if (keys && !allowed.has(toggle.key)) return false
    if (toggle.complete && hoverPerSec <= 0) return false
    return true
  })
  return (
    <div className="desk-toggles">
      {rows.map((toggle) => (
        <button
          key={toggle.key}
          type="button"
          className="desk-toggle"
          data-testid={`desk-${toggle.key}`}
          aria-pressed={desk[toggle.key]}
          title={toggle.key === "hoverClick" ? `Hover or hold the emoji to click at ${hoverPerSec}/s` : toggle.title}
          onClick={() => setDeskPref(toggle.key, !desk[toggle.key])}
        >
          <span className="desk-toggle-label">
            {toggle.emoji ? (
              <img className="desk-toggle-emoji" src={toggle.emoji} alt="" width={14} height={14} draggable={false} decoding="async" />
            ) : toggle.Icon ? (
              <toggle.Icon {...UI_ICON_SM} aria-hidden />
            ) : null}
            {toggle.label}
          </span>
          <i>{desk[toggle.key] ? "On" : "Off"}</i>
        </button>
      ))}
    </div>
  )
}

type MusicStyleListProps = {
  desk: DeskPrefs
  /** The career's unlocked rows. Only styles, kits and themes it has earned are listed (plus the one in use). */
  unlocked: ReadonlySet<string>
}

/** The picks a career has earned, in table order, plus the saved one so a choice never disappears. */
function earned<T extends string>(ids: readonly T[], allowed: readonly string[], current: string): T[] {
  return ids.filter((id) => allowed.includes(id) || id === current)
}

export function MusicStyleList({ desk, unlocked }: MusicStyleListProps) {
  return (
    <div className="desk-toggles" role="listbox" aria-label="Music styles">
      {earned(MUSIC_STYLE_IDS, musicChoices(unlocked), desk.musicStyle).map((id) => (
        <button
          key={id}
          type="button"
          role="option"
          aria-selected={desk.musicStyle === id}
          className={desk.musicStyle === id ? "ide-theme-option is-active" : "ide-theme-option"}
          data-testid={`desk-music-${id}`}
          onClick={() => setDeskPref("musicStyle", id)}
        >
          <span className="ide-theme-name">{MUSIC_STYLES[id].label}</span>
          <NewMark id={`music:${id}`} pill />
        </button>
      ))}
    </div>
  )
}

export function ClickKitList({ desk, unlocked }: MusicStyleListProps) {
  return (
    <div className="desk-toggles" role="listbox" aria-label="Click sounds">
      {earned(CLICK_KIT_IDS, clickKitChoices(unlocked), desk.clickKit).map((id) => (
        <button
          key={id}
          type="button"
          role="option"
          aria-selected={desk.clickKit === id}
          className={desk.clickKit === id ? "ide-theme-option is-active" : "ide-theme-option"}
          data-testid={`desk-kit-${id}`}
          onClick={() => setDeskPref("clickKit", id)}
        >
          <span className="ide-theme-name">{CLICK_KITS[id].label}</span>
          <NewMark id={`kit:${id}`} pill />
        </button>
      ))}
    </div>
  )
}

type EditorThemeListProps = {
  savedThemeId: string
  unlocked: ReadonlySet<string>
  onPreviewEnd?: () => void
}

export function EditorThemeList({ savedThemeId, unlocked, onPreviewEnd }: EditorThemeListProps) {
  const allowed = themeChoices(unlocked)
  return (
    <>
      {THEME_GROUPS.map((group) => (
        <div key={group.kind}>
          <p className="ide-theme-group">{group.label}</p>
          <div className="desk-toggles" role="listbox" aria-label={`${group.label} editor themes`}>
            {ideThemesOf(group.kind)
              .filter((entry) => allowed.includes(entry.id) || entry.id === savedThemeId)
              .map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="option"
                aria-selected={entry.id === savedThemeId}
                className={entry.id === savedThemeId ? "ide-theme-option is-active" : "ide-theme-option"}
                data-testid="editor-theme"
                data-theme={entry.id}
                style={ideThemeStyle(entry) as CSSProperties}
                onPointerEnter={() => previewIdeTheme(entry.id)}
                onFocus={() => previewIdeTheme(entry.id)}
                onPointerLeave={() => onPreviewEnd?.()}
                onBlur={() => onPreviewEnd?.()}
                onClick={() => setIdeTheme(entry.id)}
              >
                <span className="ide-theme-dots" aria-hidden="true">
                  <i style={{ background: "var(--ide-base)" }} />
                  <i style={{ background: "var(--ide-mauve)" }} />
                  <i style={{ background: "var(--ide-green)" }} />
                  <i style={{ background: "var(--ide-blue)" }} />
                </span>
                <span className="ide-theme-name">{entry.name}</span>
                <NewMark id={`theme:${entry.id}`} pill />
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

type UiFontListProps = {
  savedFontId: string
  onPreviewEnd?: () => void
}

/** The face rows, each name set in its own face. Same hover, focus and click behavior as the theme rows. */
export function UiFontList({ savedFontId, onPreviewEnd }: UiFontListProps) {
  // Each name is set in its own face, so the files are fetched when the list is first shown.
  useEffect(() => {
    loadUiFonts()
  }, [])
  return (
    <div className="desk-toggles" role="listbox" aria-label="Fonts">
      {UI_FONTS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="option"
          aria-selected={entry.id === savedFontId}
          className={entry.id === savedFontId ? "ide-theme-option is-active" : "ide-theme-option"}
          data-testid="ui-font"
          data-font={entry.id}
          onPointerEnter={() => previewUiFont(entry.id)}
          onFocus={() => previewUiFont(entry.id)}
          onPointerLeave={() => onPreviewEnd?.()}
          onBlur={() => onPreviewEnd?.()}
          onClick={() => setUiFont(entry.id)}
        >
          <span className="ide-theme-name" style={{ fontFamily: entry.stack }}>
            {entry.name}
          </span>
        </button>
      ))}
    </div>
  )
}

/** Drops a hover preview of either picker, theme or font. */
export function clearEditorThemePreview(): void {
  clearIdeThemePreview()
  clearUiFontPreview()
}
