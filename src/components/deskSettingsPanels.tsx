import { MousePointerClick, Music, Swords, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle, ideThemesOf } from "../data/ideThemes.ts"
import { MAX_CLICKS_PER_SEC } from "../game/autoClick.ts"
import { setDeskPref } from "../game/desk.ts"
import type { DeskPrefs } from "../game/desk.ts"
import { MUSIC_STYLE_IDS, MUSIC_STYLES } from "../game/deskMusicStyles.ts"
import { clearIdeThemePreview, previewIdeTheme, setIdeTheme } from "../game/ideTheme.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"

const DESK_CAT_EMOJI = deskCatEmojiUrl()

export type DeskToggleKey = "music" | "sounds" | "cat" | "enemies" | "hoverClick"

export const DESK_TOGGLES: readonly {
  key: DeskToggleKey
  label: string
  Icon?: LucideIcon
  emoji?: string
  complete?: boolean
  title?: string
}[] = [
  { key: "music", label: "Music", Icon: Music },
  { key: "sounds", label: "Desk sounds", Icon: Volume2 },
  { key: "cat", label: "Cat", emoji: DESK_CAT_EMOJI },
  { key: "enemies", label: "Enemies", Icon: Swords },
  {
    key: "hoverClick",
    label: "Hover click",
    Icon: MousePointerClick,
    complete: true,
    title: `Hover the emoji to click at ${MAX_CLICKS_PER_SEC}/s`,
  },
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
  catalogComplete: boolean
  keys?: readonly DeskToggleKey[]
}

export function DeskToggleList({ desk, catalogComplete, keys }: DeskToggleListProps) {
  const allowed = new Set(keys)
  const rows = DESK_TOGGLES.filter((toggle) => {
    if (keys && !allowed.has(toggle.key)) return false
    if (toggle.complete && !catalogComplete) return false
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
          title={toggle.title}
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
}

export function MusicStyleList({ desk }: MusicStyleListProps) {
  return (
    <div className="desk-toggles" role="listbox" aria-label="Music styles">
      {MUSIC_STYLE_IDS.map((id) => (
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
        </button>
      ))}
    </div>
  )
}

type EditorThemeListProps = {
  savedThemeId: string
  onPreviewEnd?: () => void
}

export function EditorThemeList({ savedThemeId, onPreviewEnd }: EditorThemeListProps) {
  return (
    <>
      {THEME_GROUPS.map((group) => (
        <div key={group.kind}>
          <p className="ide-theme-group">{group.label}</p>
          <div className="desk-toggles" role="listbox" aria-label={`${group.label} editor themes`}>
            {ideThemesOf(group.kind).map((entry) => (
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
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export function clearEditorThemePreview(): void {
  clearIdeThemePreview()
}
