import { MousePointerClick, Music, Settings, Swords, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import type { CSSProperties } from "react"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle, ideThemesOf } from "../data/ideThemes.ts"
import { MAX_CLICKS_PER_SEC } from "../game/autoClick.ts"
import { getDeskPrefs, setDeskPref, subscribeDeskPrefs } from "../game/desk.ts"
import { CLICK_KIT_IDS, CLICK_KITS } from "../game/deskClickKits.ts"
import { MUSIC_STYLE_IDS, MUSIC_STYLES } from "../game/deskMusicStyles.ts"
import { clearIdeThemePreview, getSavedIdeTheme, previewIdeTheme, setIdeTheme, subscribeIdeTheme } from "../game/ideTheme.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { useGame } from "../game/store.ts"

const GROUPS = [
  { kind: "dark", label: "Dark" },
  { kind: "light", label: "Light" },
] as const

const DESK_CAT_EMOJI = deskCatEmojiUrl()

type ToggleKey = "music" | "sounds" | "cat" | "enemies" | "hoverClick"

const TOGGLES: readonly {
  key: ToggleKey
  label: string
  Icon?: LucideIcon
  emoji?: string
  /** Hidden until every catalog row is owned. */
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

export function EditorSettings() {
  const saved = useSyncExternalStore(subscribeIdeTheme, getSavedIdeTheme, getSavedIdeTheme)
  const desk = useSyncExternalStore(subscribeDeskPrefs, getDeskPrefs, getDeskPrefs)
  const catalogComplete = useGame((state) => ownsEverything(state))
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = () => {
    clearIdeThemePreview()
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
      clearIdeThemePreview()
    }
  }, [open])

  return (
    <div className="ide-settings-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ide-settings"
        data-testid="editor-settings"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Settings {...UI_ICON} aria-hidden />
      </button>
      {open ? (
        <div className="ide-theme-menu" id={menuId} role="dialog" aria-label="Settings" onPointerLeave={() => clearIdeThemePreview()}>
          <section className="ide-settings-section" aria-labelledby={`${menuId}-settings`}>
            <p className="ide-theme-heading" id={`${menuId}-settings`}>
              Settings
            </p>
            <div className="ide-settings-section-panel">
              <ul className="desk-toggles">
                {TOGGLES.filter((toggle) => !toggle.complete || catalogComplete).map((toggle) => (
                  <li key={toggle.key}>
                    <button
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
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="ide-settings-section" aria-labelledby={`${menuId}-music-style`}>
            <p className="ide-theme-heading" id={`${menuId}-music-style`}>
              Music style
            </p>
            <div className="ide-settings-section-panel">
              <ul role="listbox" aria-label="Music styles">
                {MUSIC_STYLE_IDS.map((id) => (
                  <li key={id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={desk.musicStyle === id}
                      className={desk.musicStyle === id ? "ide-theme-option is-active" : "ide-theme-option"}
                      data-testid={`desk-music-${id}`}
                      onClick={() => setDeskPref("musicStyle", id)}
                    >
                      <span className="ide-theme-name">{MUSIC_STYLES[id].label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          {desk.sounds ? (
            <section className="ide-settings-section" aria-labelledby={`${menuId}-click-kit`}>
              <p className="ide-theme-heading" id={`${menuId}-click-kit`}>
                Click sound
              </p>
              <div className="ide-settings-section-panel">
                <ul role="listbox" aria-label="Click sounds">
                  {CLICK_KIT_IDS.map((id) => (
                    <li key={id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={desk.clickKit === id}
                        className={desk.clickKit === id ? "ide-theme-option is-active" : "ide-theme-option"}
                        data-testid={`desk-kit-${id}`}
                        onClick={() => setDeskPref("clickKit", id)}
                      >
                        <span className="ide-theme-name">{CLICK_KITS[id].label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
          <section className="ide-settings-section" aria-labelledby={`${menuId}-editor-theme`}>
            <p className="ide-theme-heading" id={`${menuId}-editor-theme`}>
              Editor theme
            </p>
            <div className="ide-settings-section-panel">
              {GROUPS.map((group) => (
                <div key={group.kind}>
                  <p className="ide-theme-group">{group.label}</p>
                  <ul role="listbox" aria-label={`${group.label} editor themes`}>
                    {ideThemesOf(group.kind).map((entry) => (
                      <li key={entry.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={entry.id === saved.id}
                          className={entry.id === saved.id ? "ide-theme-option is-active" : "ide-theme-option"}
                          data-testid="editor-theme"
                          data-theme={entry.id}
                          style={ideThemeStyle(entry) as CSSProperties}
                          onPointerEnter={() => previewIdeTheme(entry.id)}
                          onFocus={() => previewIdeTheme(entry.id)}
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
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
