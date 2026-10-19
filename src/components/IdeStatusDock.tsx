import { ChevronRight, LayoutGrid, MousePointer2, Palette, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { memo, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle } from "../data/ideThemes.ts"
import { getDeskPrefs, subscribeDeskPrefs } from "../game/desk.ts"
import { getSavedIdeTheme, subscribeIdeTheme } from "../game/ideTheme.ts"
import { getSavedUiFont, subscribeUiFont } from "../game/uiFont.ts"
import { hoverRate } from "../game/gold.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { openRosters, ROSTER_KINDS, ROSTER_LABEL, rosterEntries, type RosterKind } from "../game/rosters.ts"
import { getOpenRoster, setOpenRoster, subscribeOpenRoster } from "../game/rosterModal.ts"
import { isGif } from "../game/catParade.ts"
import { useGame } from "../game/store.ts"
import {
  ClickKitList,
  DeskToggleList,
  EditorThemeList,
  UiFontList,
  MusicStyleList,
  ParadeStyleList,
  SettingsSection,
  clearEditorThemePreview,
} from "./deskSettingsPanels.tsx"
import { CatalogRosterModal } from "./CatalogRosterModal.tsx"
import { CatRosterModal } from "./CatRosterModal.tsx"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { useFeatureOpen, useSurface, useUnlockedSet } from "./useFeature.ts"
import { useNarrow } from "./useNarrow.ts"
import type { FeatureId } from "../data/features.ts"

const DESK_CAT_EMOJI = deskCatEmojiUrl()

type ChipId = "sound" | "clicks" | "cat" | "rosters" | "theme"

function StatusChip({
  id,
  label,
  active,
  open,
  onOpen,
  onClose,
  icon,
  panel,
  feature,
}: {
  id: ChipId
  label: string
  active: boolean
  open: boolean
  onOpen: () => void
  onClose: (id: ChipId) => void
  icon: ReactNode
  panel: ReactNode
  /** The timeline row this chip belongs to: its reveal points here and its NEW marker sits on it. */
  feature?: FeatureId
}) {
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const leaveTimer = useRef(0)
  const [anchor, setAnchor] = useState<{ bottom: number; right: number } | null>(null)

  function enter() {
    window.clearTimeout(leaveTimer.current)
    onOpen()
  }

  function leave() {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      if (id === "theme") clearEditorThemePreview()
      onClose(id)
    }, 220)
  }

  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null)
      return
    }
    const place = () => {
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const bottom = window.innerHeight - rect.top + 4
      const right = window.innerWidth - rect.right
      setAnchor({ bottom, right })
      el.style.setProperty("--status-popover-bridge-bottom", `${window.innerHeight - rect.top}px`)
      el.style.setProperty("--status-popover-bridge-right", `${right}px`)
    }
    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open])

  const popover =
    open && anchor && typeof document !== "undefined"
      ? createPortal(
          <div
            className="ide-theme-menu ide-status-popover ide-status-popover-portal"
            id={panelId}
            role="dialog"
            aria-label={label}
            style={{ bottom: anchor.bottom, right: anchor.right }}
            onClick={(event) => event.stopPropagation()}
            onPointerEnter={enter}
            onPointerLeave={leave}
          >
            {panel}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={wrapRef}
      className={["ide-status-chip-wrap", open ? "is-open" : ""].filter(Boolean).join(" ")}
      data-status-chip={id}
      data-feature-anchor={feature}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) leave()
      }}
    >
      <button
        type="button"
        className={["ide-status-chip", active ? "is-active" : ""].filter(Boolean).join(" ")}
        data-testid={`status-chip-${id}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => {
          event.stopPropagation()
          if (!open) enter()
        }}
      >
        {icon}
        {feature ? <NewMark id={feature} /> : null}
        {feature === "themes" ? <NewMark id="theme:" /> : feature === "clickKits" ? <NewMark id="kit:" /> : feature === "music" ? <NewMark id="music:" /> : null}
      </button>
      {popover}
    </div>
  )
}

/** One button per shop panel that is open, each with how many rows it holds. */
export function RosterButtons({ onPick }: { onPick: (kind: RosterKind) => void }) {
  // The gates read lifetime XP and the peak balance, which move every tick. Joined into a string
  // the selector only changes when a roster actually opens.
  const kinds = useGame((state) => openRosters(state).join(" "))
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const counts = useMemo(() => {
    const progress = { skills, equipment, owned, jobs, gigs, xpTotal: 0, peakMoney: 0 }
    return new Map(ROSTER_KINDS.map((kind) => [kind, rosterEntries(kind, progress).length]))
  }, [skills, equipment, owned, jobs, gigs])
  return (
    <div className="desk-toggles">
      {(kinds ? (kinds.split(" ") as RosterKind[]) : []).map((kind) => (
        <button key={kind} type="button" className="desk-toggle" data-testid={`status-roster-${kind}`} onClick={() => onPick(kind)}>
          <span className="desk-toggle-label">{ROSTER_LABEL[kind]}</span>
          <i>{counts.get(kind) ?? 0}</i>
        </button>
      ))}
    </div>
  )
}

function ThemeDots() {
  const saved = useSyncExternalStore(subscribeIdeTheme, getSavedIdeTheme, getSavedIdeTheme)
  const style = ideThemeStyle(saved) as React.CSSProperties
  return (
    <span className="ide-status-theme-dots" aria-hidden="true" style={style}>
      <i style={{ background: "var(--ide-base)" }} />
      <i style={{ background: "var(--ide-mauve)" }} />
      <i style={{ background: "var(--ide-green)" }} />
    </span>
  )
}

function ChipIcon({ Icon, src }: { Icon?: LucideIcon; src?: string }) {
  if (src) {
    return <img className="ide-status-chip-emoji" src={src} alt="" width={14} height={14} draggable={false} decoding="async" />
  }
  if (Icon) return <Icon {...UI_ICON_SM} aria-hidden />
  return null
}

/** The roster modals. They live outside the dock, so they open from the settings menu on narrow screens too. */
export function RosterModals() {
  const roster = useSyncExternalStore(subscribeOpenRoster, getOpenRoster, getOpenRoster)
  const close = () => setOpenRoster(null)
  if (roster === "cats") return <CatRosterModal onClose={close} />
  if (roster) return <CatalogRosterModal key={roster} kind={roster} onClose={close} />
  return null
}

export const IdeStatusDock = memo(function IdeStatusDock() {
  const desk = useSyncExternalStore(subscribeDeskPrefs, getDeskPrefs, getDeskPrefs)
  const savedTheme = useSyncExternalStore(subscribeIdeTheme, getSavedIdeTheme, getSavedIdeTheme)
  const savedFont = useSyncExternalStore(subscribeUiFont, getSavedUiFont, getSavedUiFont)
  const hoverPerSec = useGame((state) => hoverRate(state.gold, ownsEverything(state)))
  const catsFound = useGame((state) => state.stats.catsFound.length)
  const gifsFound = useGame((state) => state.stats.catsFound.some(isGif))
  const seeFeature = useGame((state) => state.seeFeature)
  const [openChip, setOpenChip] = useState<ChipId | null>(null)
  const roster = useSyncExternalStore(subscribeOpenRoster, getOpenRoster, getOpenRoster)
  const narrow = useNarrow()
  const music = useFeatureOpen("music")
  const kits = useFeatureOpen("clickKits")
  const cat = useFeatureOpen("cat")
  const rosters = useFeatureOpen("rosters")
  const themes = useFeatureOpen("themes")
  const unlocked = useUnlockedSet()
  const clickChip = kits || hoverPerSec > 0

  // Opening a chip is using what it holds: its NEW markers go.
  const openChipFor = (id: ChipId) => {
    setOpenChip(id)
    if (id === "sound") seeFeature("music")
    if (id === "clicks") {
      seeFeature("clickKits")
      seeFeature("hoverClick")
    }
    if (id === "theme") seeFeature("themes")
    if (id === "rosters") seeFeature("rosters")
  }
  // On narrow screens the dock is folded into the settings menu, which owns these surfaces there.
  useSurface("rosters", () => {
    if (narrow) return
    seeFeature("rosters")
    setOpenRoster("skills")
  })
  useSurface("clickKits", () => {
    if (!narrow) openChipFor("clicks")
  })
  useSurface("themes", () => {
    if (!narrow) openChipFor("theme")
  })

  const closeChip = (id: ChipId) => {
    setOpenChip((current) => {
      if (current !== id) return current
      clearEditorThemePreview()
      return null
    })
  }

  // Narrow screens fold the dock into the settings menu (EditorSettings), so nothing sits in the status bar.
  if (narrow) return null

  return (
    <div className="ide-status-dock" onClick={(event) => event.stopPropagation()}>
      {music ? (
        <StatusChip
          id="sound"
          feature="music"
          label="Sound"
          active={desk.music || desk.sounds}
          open={openChip === "sound"}
          onOpen={() => openChipFor("sound")}
          onClose={closeChip}
          icon={
            <span className={desk.music ? "ide-status-music-icon is-on" : "ide-status-music-icon"}>
              <ChipIcon Icon={Volume2} />
            </span>
          }
          panel={
            <>
              <SettingsSection heading="Sound">
                <DeskToggleList desk={desk} hoverPerSec={hoverPerSec} keys={["music", "sounds"]} />
              </SettingsSection>
              {desk.music ? (
                <SettingsSection heading="Music style">
                  <MusicStyleList desk={desk} unlocked={unlocked} />
                </SettingsSection>
              ) : null}
            </>
          }
        />
      ) : (
        <FeatureGhost id="music" place="above" className="ide-status-chip">
          <ChipIcon Icon={Volume2} />
        </FeatureGhost>
      )}

      {clickChip ? (
        <StatusChip
          id="clicks"
          feature={kits ? "clickKits" : "hoverClick"}
          label="Click"
          active={desk.clicks || (hoverPerSec > 0 && desk.hoverClick)}
          open={openChip === "clicks"}
          onOpen={() => openChipFor("clicks")}
          onClose={closeChip}
          icon={<ChipIcon Icon={MousePointer2} />}
          panel={
            <>
              {/* Hover click is listed here once a gold hover skill or every catalog row is owned; before that the list holds the click sound alone. */}
              <SettingsSection heading="Click">
                <DeskToggleList desk={desk} hoverPerSec={hoverPerSec} keys={["clicks", "hoverClick"]} />
              </SettingsSection>
              {desk.clicks && kits ? (
                <SettingsSection heading="Click kit">
                  <ClickKitList desk={desk} unlocked={unlocked} />
                </SettingsSection>
              ) : null}
            </>
          }
        />
      ) : (
        <FeatureGhost id="clickKits" place="above" className="ide-status-chip">
          <ChipIcon Icon={MousePointer2} />
        </FeatureGhost>
      )}

      {cat ? (
        <StatusChip
          id="cat"
          label="Cat"
          active={desk.cat}
          open={openChip === "cat"}
          onOpen={() => openChipFor("cat")}
          onClose={closeChip}
          icon={<ChipIcon src={desk.catArt ?? DESK_CAT_EMOJI} />}
          panel={
            <>
            <SettingsSection heading="Cat">
              <DeskToggleList desk={desk} hoverPerSec={hoverPerSec} keys={gifsFound ? ["cat", "parade"] : ["cat"]} />
              {catsFound > 0 ? (
                <button
                  type="button"
                  className="desk-toggle"
                  data-testid="status-cat-roster"
                  onClick={() => {
                    setOpenChip(null)
                    setOpenRoster("cats")
                  }}
                >
                  <span className="desk-toggle-label">Cat roster</span>
                  <ChevronRight {...UI_ICON_SM} aria-hidden />
                </button>
              ) : null}
            </SettingsSection>
              {gifsFound && desk.parade ? (
                <SettingsSection heading="Cat parade">
                  <ParadeStyleList desk={desk} />
                </SettingsSection>
              ) : null}
            </>
          }
        />
      ) : null}

      {rosters ? (
        <StatusChip
          id="rosters"
          feature="rosters"
          label="Rosters"
          active={roster !== null && roster !== "cats"}
          open={openChip === "rosters"}
          onOpen={() => openChipFor("rosters")}
          onClose={closeChip}
          icon={<ChipIcon Icon={LayoutGrid} />}
          panel={
            <SettingsSection heading="Rosters">
              <RosterButtons
                onPick={(kind) => {
                  setOpenChip(null)
                  setOpenRoster(kind)
                }}
              />
            </SettingsSection>
          }
        />
      ) : (
        <FeatureGhost id="rosters" place="above" className="ide-status-chip">
          <ChipIcon Icon={LayoutGrid} />
        </FeatureGhost>
      )}

      {themes ? (
        <StatusChip
          id="theme"
          feature="themes"
          label={`Theme · ${savedTheme.name}`}
          active
          open={openChip === "theme"}
          onOpen={() => openChipFor("theme")}
          onClose={closeChip}
          icon={
            <>
              <ChipIcon Icon={Palette} />
              <ThemeDots />
            </>
          }
          panel={
            <>
              <SettingsSection heading="Editor theme">
                <EditorThemeList savedThemeId={savedTheme.id} unlocked={unlocked} onPreviewEnd={clearEditorThemePreview} />
              </SettingsSection>
              <SettingsSection heading="Font">
                <UiFontList savedFontId={savedFont.id} onPreviewEnd={clearEditorThemePreview} />
              </SettingsSection>
            </>
          }
        />
      ) : (
        <FeatureGhost id="themes" place="above" className="ide-status-chip">
          <ChipIcon Icon={Palette} />
        </FeatureGhost>
      )}
    </div>
  )
})
