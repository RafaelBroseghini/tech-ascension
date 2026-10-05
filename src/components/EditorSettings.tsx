import { MousePointer2, MousePointerClick, Music, Settings, Trash2, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { AdminSettings } from "./AdminSettings.tsx"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import type { CSSProperties } from "react"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle, ideThemesOf } from "../data/ideThemes.ts"
import { getDeskPrefs, setDeskPref, subscribeDeskPrefs } from "../game/desk.ts"
import { CLICK_KIT_IDS, CLICK_KITS } from "../game/deskClickKits.ts"
import { MUSIC_STYLE_IDS, MUSIC_STYLES } from "../game/deskMusicStyles.ts"
import { clearIdeThemePreview, getSavedIdeTheme, previewIdeTheme, setIdeTheme, subscribeIdeTheme } from "../game/ideTheme.ts"
import { hoverRate } from "../game/gold.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { useGame } from "../game/store.ts"

const GROUPS = [
  { kind: "dark", label: "Dark" },
  { kind: "light", label: "Light" },
] as const

const DESK_CAT_EMOJI = deskCatEmojiUrl()

type ToggleKey = "music" | "sounds" | "clicks" | "cat" | "hoverClick"

const TOGGLES: readonly {
  key: ToggleKey
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
    label: "Hover click",
    Icon: MousePointerClick,
    complete: true,
    title: "Hover the emoji to click automatically",
  },
  { key: "cat", label: "Cat", emoji: DESK_CAT_EMOJI },
]

/** The one destructive action in settings. The button opens a modal; only its red button wipes. */
function WipeSave({ onWiped }: { onWiped: () => void }) {
  const wipe = useGame((state) => state.wipe)
  const [confirming, setConfirming] = useState(false)
  const promptId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!confirming) return
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape") return
      key.stopPropagation()
      setConfirming(false)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [confirming])

  return (
    <section className="ide-settings-section ide-settings-danger">
      <button type="button" className="ide-wipe" data-testid="wipe-save" onClick={() => setConfirming(true)}>
        <Trash2 {...UI_ICON_SM} aria-hidden />
        Wipe save
      </button>
      {confirming
        ? createPortal(
            <div className="event-backdrop" data-wipe-modal data-testid="wipe-backdrop" onClick={() => setConfirming(false)}>
              <div
                ref={dialogRef}
                className="event-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={promptId}
                tabIndex={-1}
                data-testid="wipe-confirm-panel"
                onClick={(click) => click.stopPropagation()}
              >
                <h2 id={promptId} className="event-title">
                  Wipe this save?
                </h2>
                <p className="event-flavor">Your career restarts at high school. This can't be undone.</p>
                <div className="event-actions">
                  <button type="button" className="event-choice event-no" data-testid="wipe-cancel" onClick={() => setConfirming(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="event-choice ide-wipe-yes"
                    data-testid="wipe-confirm"
                    onClick={() => {
                      setConfirming(false)
                      wipe()
                      onWiped()
                    }}
                  >
                    <Trash2 {...UI_ICON_SM} aria-hidden />
                    Wipe save
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}

export function EditorSettings() {
  const saved = useSyncExternalStore(subscribeIdeTheme, getSavedIdeTheme, getSavedIdeTheme)
  const desk = useSyncExternalStore(subscribeDeskPrefs, getDeskPrefs, getDeskPrefs)
  const hoverPerSec = useGame((state) => hoverRate(state.gold, ownsEverything(state)))
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
      const target = event.target as Element
      if (target.closest?.("[data-wipe-modal]")) return
      if (!wrapRef.current?.contains(target)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("[data-wipe-modal]")) close()
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
          <AdminSettings headingId={`${menuId}-admin`} />
          <section className="ide-settings-section" aria-labelledby={`${menuId}-settings`}>
            <p className="ide-theme-heading" id={`${menuId}-settings`}>
              Settings
            </p>
            <div className="ide-settings-section-panel">
              <ul className="desk-toggles">
                {TOGGLES.filter((toggle) => !toggle.complete || hoverPerSec > 0).map((toggle) => (
                  <li key={toggle.key}>
                    <button
                      type="button"
                      className="desk-toggle"
                      data-testid={`desk-${toggle.key}`}
                      aria-pressed={desk[toggle.key]}
                      title={toggle.key === "hoverClick" ? `Hover the emoji to click at ${hoverPerSec}/s` : toggle.title}
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
          {desk.clicks ? (
            <section className="ide-settings-section" aria-labelledby={`${menuId}-click-kit`}>
              <p className="ide-theme-heading" id={`${menuId}-click-kit`}>
                Click kit
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
          <WipeSave onWiped={close} />
        </div>
      ) : null}
    </div>
  )
}
