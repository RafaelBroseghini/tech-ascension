import { MousePointer2, MousePointerClick, Music, Settings, Sparkles, Trash2, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { AdminSettings } from "./AdminSettings.tsx"
import { HowToPlay } from "./HowToPlay.tsx"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import type { CSSProperties, ReactNode } from "react"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle, ideThemesOf } from "../data/ideThemes.ts"
import { HOVER_MODES, getDeskPrefs, setDeskPref, subscribeDeskPrefs } from "../game/desk.ts"
import { CLICK_KIT_IDS, CLICK_KITS } from "../game/deskClickKits.ts"
import { MUSIC_STYLE_IDS, MUSIC_STYLES } from "../game/deskMusicStyles.ts"
import { clearIdeThemePreview, getSavedIdeTheme, previewIdeTheme, setIdeTheme, subscribeIdeTheme } from "../game/ideTheme.ts"
import { clearUiFontPreview, getSavedUiFont, subscribeUiFont } from "../game/uiFont.ts"
import { hoverRate } from "../game/gold.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { paradeCounts as countParadeGifs } from "../game/paradePool.ts"
import { useGame } from "../game/store.ts"
import { clickKitChoices, musicChoices, themeChoices } from "../game/features.ts"
import { useFeatureOpen, useFresh, useSurface, useUnlockedSet } from "./useFeature.ts"
import { useNarrow } from "./useNarrow.ts"
import { HoverModeList, ParadeSourceList, ParadeStyleList, UiFontList } from "./deskSettingsPanels.tsx"
import { useParadeProgress } from "./useParadeProgress.ts"
import { RosterButtons } from "./IdeStatusDock.tsx"
import { setOpenRoster } from "../game/rosterModal.ts"
import type { FeatureId } from "../data/features.ts"
import { useFocusTrap } from "./useFocusTrap.ts"
import { ModalBackdrop } from "./ModalBackdrop.tsx"

const GROUPS = [
  { kind: "dark", label: "Dark" },
  { kind: "light", label: "Light" },
] as const

const DESK_CAT_EMOJI = deskCatEmojiUrl()

type ToggleKey = "music" | "sounds" | "clicks" | "cat" | "parade" | "hoverClick"

const TOGGLES: readonly {
  key: ToggleKey
  label: string
  Icon?: LucideIcon
  emoji?: string
  /** The career row this switch belongs to: its NEW mark shows here, and picking the switch uses that row. */
  feature?: FeatureId
  /** Hidden until hover clicking is unlocked (a gold hover skill, or every catalog row owned). */
  complete?: boolean
  title?: string
}[] = [
  { key: "music", label: "Music", Icon: Music, feature: "music" },
  { key: "sounds", label: "Desk sounds", Icon: Volume2, feature: "music" },
  { key: "clicks", label: "Click sound", Icon: MousePointer2, feature: "clickKits" },
  {
    key: "hoverClick",
    label: "Auto-click",
    Icon: MousePointerClick,
    feature: "hoverClick",
    complete: true,
    title: "Hover on PC, hold on mobile",
  },
  { key: "cat", label: "Cat", emoji: DESK_CAT_EMOJI, feature: "cat" },
  { key: "parade", label: "Gif parade", Icon: Sparkles, title: "Unlocked gifs move round the stage together" },
]

/** Rows in the settings menu that can carry a NEW mark: the career rows above, and the recurring picks under them. */
const SETTINGS_FEATURES: readonly FeatureId[] = ["music", "clickKits", "hoverClick", "themes", "cat", "parade", "rosters"]
const SETTINGS_PICK_PREFIXES = ["music:", "kit:", "theme:"] as const
/** Anchors for the reveal cards on narrow screens, where the status bar is folded into this menu. */
const SETTINGS_ANCHORS = [...SETTINGS_FEATURES, ...SETTINGS_PICK_PREFIXES.map((prefix) => prefix.slice(0, -1))].join(" ")

const isSettingsMark = (key: string) =>
  (SETTINGS_FEATURES as readonly string[]).includes(key) || SETTINGS_PICK_PREFIXES.some((prefix) => key.startsWith(prefix))

/** The green mark: a dot on a settings row or section heading that holds something new to pick. */
function SettingsMark({ id }: { id: FeatureId | `${string}:` }) {
  return useFresh(id) ? <i className="settings-new" data-testid="settings-new" data-new={id} aria-hidden /> : null
}

/** The one destructive action in settings. The button opens a modal; only its red button wipes. */
function WipeSave({ onWiped }: { onWiped: () => void }) {
  const wipe = useGame((state) => state.wipe)
  const [confirming, setConfirming] = useState(false)
  const promptId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, confirming)

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
            <ModalBackdrop className="event-backdrop" data-wipe-modal data-testid="wipe-backdrop" onClick={() => setConfirming(false)}>
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
            </ModalBackdrop>,
            document.body,
          )
        : null}
    </section>
  )
}

/**
 * The gear and its menu. It sits in the stage's corner on the bare desk and at the foot of the activity bar after. The
 * menu is portaled, since the stage clips it: beside the bar it opens upward, from the corner it drops down.
 */
export function EditorSettings({ place = "activity" }: { place?: "activity" | "corner" }) {
  const saved = useSyncExternalStore(subscribeIdeTheme, getSavedIdeTheme, getSavedIdeTheme)
  const savedFont = useSyncExternalStore(subscribeUiFont, getSavedUiFont, getSavedUiFont)
  const desk = useSyncExternalStore(subscribeDeskPrefs, getDeskPrefs, getDeskPrefs)
  const hoverPerSec = useGame((state) => hoverRate(state.gold, ownsEverything(state)))
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<CSSProperties | null>(null)
  const menuId = useId()
  const narrow = useNarrow()
  const seeFeature = useGame((state) => state.seeFeature)
  const anyNew = useGame((state) => state.fresh.some(isSettingsMark))
  const rosters = useFeatureOpen("rosters")
  // Settings only offer what the career has unlocked: music after the headset, the cat after it moves in, and the
  // styles, kits and themes earned so far (plus whichever one is in use).
  const music = useFeatureOpen("music")
  const cat = useFeatureOpen("cat")
  const paradeOpen = useFeatureOpen("parade")
  const paradeProgress = useParadeProgress()
  const paradeCounts = useMemo(() => countParadeGifs(paradeProgress), [paradeProgress])
  const kits = useFeatureOpen("clickKits")
  const unlocked = useUnlockedSet()
  const styles = musicChoices(unlocked)
  const kitIds = clickKitChoices(unlocked)
  const themeIds = themeChoices(unlocked)
  const toggles = TOGGLES.filter((toggle) => {
    if (toggle.complete && hoverPerSec <= 0) return false
    if (toggle.key === "music" && !music) return false
    if (toggle.key === "cat" && !cat) return false
    if (toggle.key === "parade" && (!paradeOpen || paradeCounts.all === 0)) return false
    return true
  })

  const close = () => {
    clearIdeThemePreview()
    clearUiFontPreview()
    setOpen(false)
  }
  const gearRef = useRef<HTMLButtonElement>(null)
  // On narrow screens the status bar's rosters and picks live in this menu, so its reveals open the menu.
  useSurface("rosters", () => {
    if (narrow) setOpen(true)
  })
  useSurface("clickKits", () => {
    if (narrow) setOpen(true)
  })
  useSurface("themes", () => {
    if (narrow) setOpen(true)
  })

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element
      if (target.closest?.("[data-wipe-modal]")) return
      if (!wrapRef.current?.contains(target) && !menuRef.current?.contains(target)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("[data-wipe-modal]")) return
      // The portaled menu is the last thing in the page, so focus goes back to the gear rather than to the body.
      if (menuRef.current?.contains(document.activeElement)) gearRef.current?.focus()
      close()
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
      clearIdeThemePreview()
      clearUiFontPreview()
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const placeMenu = () => {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect) return
      // Never taller than the room the menu opens into, so a short screen scrolls it instead of cutting it off.
      if (place === "corner") {
        const top = rect.bottom + 6
        setAnchor({ top, right: Math.max(6, window.innerWidth - rect.right), maxHeight: Math.min(560, window.innerHeight - top - 6) })
        return
      }
      const bottom = Math.max(6, window.innerHeight - rect.bottom)
      setAnchor({ left: rect.right + 6, bottom, maxHeight: Math.min(560, window.innerHeight - bottom - 6) })
    }
    placeMenu()
    window.addEventListener("resize", placeMenu)
    // Tab from the gear would never reach a menu at the end of the page, so focus starts inside it.
    requestAnimationFrame(() => menuRef.current?.focus({ preventScroll: true }))
    return () => window.removeEventListener("resize", placeMenu)
  }, [open, place])

  const activity = place === "activity"
  // The menu waits for its anchor, measured from the gear.
  const portal = (menu: ReactNode) => (anchor ? createPortal(menu, document.body) : null)

  return (
    <div className="ide-settings-wrap" ref={wrapRef}>
      <button
        ref={gearRef}
        type="button"
        className={activity ? "ide-activity-btn" : "ide-settings"}
        data-testid="editor-settings"
        aria-label="Settings"
        title="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        data-feature-anchor={narrow ? SETTINGS_ANCHORS : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Settings {...(activity ? { className: "ide-activity-icon" } : {})} {...UI_ICON} aria-hidden />
        {anyNew ? <i className="settings-new settings-new-corner" data-testid="settings-new-gear" aria-hidden /> : null}
      </button>
      {open ? portal(
        <div
          ref={menuRef}
          className="ide-theme-menu ide-settings-portal"
          id={menuId}
          role="dialog"
          aria-label="Settings"
          tabIndex={-1}
          style={anchor ?? undefined}
          onPointerLeave={() => {
          clearIdeThemePreview()
          clearUiFontPreview()
        }}>
          <HowToPlay />
          <AdminSettings headingId={`${menuId}-admin`} />
          <section className="ide-settings-section" aria-labelledby={`${menuId}-settings`}>
            <p className="ide-theme-heading" id={`${menuId}-settings`}>
              Settings
            </p>
            <div className="ide-settings-section-panel">
              <ul className="desk-toggles">
                {toggles.map((toggle) => (
                  <li key={toggle.key}>
                    <button
                      type="button"
                      className="desk-toggle"
                      data-testid={`desk-${toggle.key}`}
                      aria-pressed={desk[toggle.key]}
                      title={toggle.key === "hoverClick" ? `Auto-click at ${hoverPerSec}/s. ${HOVER_MODES[0].blurb}` : toggle.title}
                      onClick={() => {
                        setDeskPref(toggle.key, !desk[toggle.key])
                        if (toggle.feature) seeFeature(toggle.feature)
                      }}
                    >
                      <span className="desk-toggle-label">
                        {toggle.emoji ? (
                          <img className="desk-toggle-emoji" src={toggle.emoji} alt="" width={14} height={14} draggable={false} decoding="async" />
                        ) : toggle.Icon ? (
                          <toggle.Icon {...UI_ICON_SM} aria-hidden />
                        ) : null}
                        {toggle.label}
                        {toggle.feature ? <SettingsMark id={toggle.feature} /> : null}
                      </span>
                      <i>{desk[toggle.key] ? "On" : "Off"}</i>
                    </button>
                  </li>
                ))}
              </ul>
              {hoverPerSec > 0 && desk.hoverClick ? <HoverModeList desk={desk} /> : null}
            </div>
          </section>
          {paradeOpen && paradeCounts.all > 0 && desk.parade ? (
            <>
              <section className="ide-settings-section" aria-labelledby={`${menuId}-parade-source`}>
                <p className="ide-theme-heading" id={`${menuId}-parade-source`}>
                  Parade gifs
                </p>
                <div className="ide-settings-section-panel">
                  <ParadeSourceList desk={desk} counts={paradeCounts} />
                </div>
              </section>
              <section className="ide-settings-section" aria-labelledby={`${menuId}-parade-style`}>
                <p className="ide-theme-heading" id={`${menuId}-parade-style`}>
                  Parade style
                </p>
                <div className="ide-settings-section-panel">
                  <ParadeStyleList desk={desk} />
                </div>
              </section>
            </>
          ) : null}
          {music ? (
          <section className="ide-settings-section" aria-labelledby={`${menuId}-music-style`}>
            <p className="ide-theme-heading" id={`${menuId}-music-style`}>
              Music style
              <SettingsMark id="music:" />
            </p>
            <div className="ide-settings-section-panel">
              <ul role="listbox" aria-label="Music styles">
                {MUSIC_STYLE_IDS.filter((id) => styles.includes(id) || id === desk.musicStyle).map((id) => (
                  <li key={id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={desk.musicStyle === id}
                      className={desk.musicStyle === id ? "ide-theme-option is-active" : "ide-theme-option"}
                      data-testid={`desk-music-${id}`}
                      onClick={() => {
                        setDeskPref("musicStyle", id)
                        seeFeature("music")
                      }}
                    >
                      <span className="ide-theme-name">{MUSIC_STYLES[id].label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          ) : null}
          {desk.clicks && kits ? (
            <section className="ide-settings-section" aria-labelledby={`${menuId}-click-kit`}>
              <p className="ide-theme-heading" id={`${menuId}-click-kit`}>
                Click kit
                <SettingsMark id="kit:" />
              </p>
              <div className="ide-settings-section-panel">
                <ul role="listbox" aria-label="Click sounds">
                  {CLICK_KIT_IDS.filter((id) => kitIds.includes(id) || id === desk.clickKit).map((id) => (
                    <li key={id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={desk.clickKit === id}
                        className={desk.clickKit === id ? "ide-theme-option is-active" : "ide-theme-option"}
                        data-testid={`desk-kit-${id}`}
                        onClick={() => {
                          setDeskPref("clickKit", id)
                          seeFeature("clickKits")
                        }}
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
              <SettingsMark id="theme:" />
            </p>
            <div className="ide-settings-section-panel">
              {GROUPS.map((group) => (
                <div key={group.kind}>
                  <p className="ide-theme-group">{group.label}</p>
                  <ul role="listbox" aria-label={`${group.label} editor themes`}>
                    {ideThemesOf(group.kind)
                      .filter((entry) => themeIds.includes(entry.id) || entry.id === saved.id)
                      .map((entry) => (
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
                          onClick={() => {
                            setIdeTheme(entry.id)
                            seeFeature("themes")
                          }}
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
          <section className="ide-settings-section" aria-labelledby={`${menuId}-ui-font`}>
            <p className="ide-theme-heading" id={`${menuId}-ui-font`}>
              Font
            </p>
            <div className="ide-settings-section-panel">
              <UiFontList savedFontId={savedFont.id} onPreviewEnd={clearUiFontPreview} />
            </div>
          </section>
          {narrow && rosters ? (
            <section className="ide-settings-section" aria-labelledby={`${menuId}-rosters`}>
              <p className="ide-theme-heading" id={`${menuId}-rosters`}>
                Rosters
                <SettingsMark id="rosters" />
              </p>
              <div className="ide-settings-section-panel">
                <RosterButtons
                  onPick={(kind) => {
                    seeFeature("rosters")
                    setOpenRoster(kind)
                    close()
                  }}
                />
              </div>
            </section>
          ) : null}
          <WipeSave onWiped={close} />
          <a className="ide-settings-powered" href="https://emoji.gg/" target="_blank" rel="noopener noreferrer">
            powered by emoji.gg
          </a>
        </div>
      ) : null}
    </div>
  )
}
