import { ChevronRight, LayoutGrid, MousePointer2, Palette, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { memo, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle } from "../data/ideThemes.ts"
import { getDeskPrefs, subscribeDeskPrefs } from "../game/desk.ts"
import { getSavedIdeTheme, subscribeIdeTheme } from "../game/ideTheme.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { openRosters, ROSTER_KINDS, ROSTER_LABEL, rosterEntries, type RosterKind } from "../game/rosters.ts"
import { useGame } from "../game/store.ts"
import {
  ClickKitList,
  DeskToggleList,
  EditorThemeList,
  MusicStyleList,
  SettingsSection,
  clearEditorThemePreview,
} from "./deskSettingsPanels.tsx"
import { CatalogRosterModal } from "./CatalogRosterModal.tsx"
import { CatRosterModal } from "./CatRosterModal.tsx"
import { UI_ICON_SM } from "./icons/ui.tsx"

const DESK_CAT_EMOJI = deskCatEmojiUrl()

type ChipId = "sound" | "clicks" | "cat" | "rosters" | "theme"

type OpenRoster = "cats" | RosterKind | null

function StatusChip({
  id,
  label,
  active,
  open,
  onOpen,
  onClose,
  icon,
  panel,
}: {
  id: ChipId
  label: string
  active: boolean
  open: boolean
  onOpen: () => void
  onClose: (id: ChipId) => void
  icon: ReactNode
  panel: ReactNode
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
        onClick={(event) => event.stopPropagation()}
      >
        {icon}
      </button>
      {popover}
    </div>
  )
}

/** One button per shop panel that is open, each with how many rows it holds. */
function RosterButtons({ onPick }: { onPick: (kind: RosterKind) => void }) {
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

function ChipIcon({ Icon, src, alt }: { Icon?: LucideIcon; src?: string; alt?: string }) {
  if (src) {
    return <img className="ide-status-chip-emoji" src={src} alt="" width={14} height={14} draggable={false} decoding="async" />
  }
  if (Icon) return <Icon {...UI_ICON_SM} aria-hidden />
  return null
}

export const IdeStatusDock = memo(function IdeStatusDock() {
  const desk = useSyncExternalStore(subscribeDeskPrefs, getDeskPrefs, getDeskPrefs)
  const savedTheme = useSyncExternalStore(subscribeIdeTheme, getSavedIdeTheme, getSavedIdeTheme)
  const catalogComplete = useGame((state) => ownsEverything(state))
  const catsFound = useGame((state) => state.stats.catsFound.length)
  const [openChip, setOpenChip] = useState<ChipId | null>(null)
  const [roster, setRoster] = useState<OpenRoster>(null)

  const closeChip = (id: ChipId) => {
    setOpenChip((current) => {
      if (current !== id) return current
      clearEditorThemePreview()
      return null
    })
  }

  return (
    <div className="ide-status-dock" onClick={(event) => event.stopPropagation()}>
      <StatusChip
        id="sound"
        label="Sound"
        active={desk.music || desk.sounds}
        open={openChip === "sound"}
        onOpen={() => setOpenChip("sound")}
        onClose={closeChip}
        icon={
          <span className={desk.music ? "ide-status-music-icon is-on" : "ide-status-music-icon"}>
            <ChipIcon Icon={Volume2} />
          </span>
        }
        panel={
          <>
            <SettingsSection heading="Sound">
              <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["music", "sounds"]} />
            </SettingsSection>
            {desk.music ? (
              <SettingsSection heading="Music style">
                <MusicStyleList desk={desk} />
              </SettingsSection>
            ) : null}
          </>
        }
      />

      <StatusChip
        id="clicks"
        label="Click"
        active={desk.clicks || (catalogComplete && desk.hoverClick)}
        open={openChip === "clicks"}
        onOpen={() => setOpenChip("clicks")}
        onClose={closeChip}
        icon={<ChipIcon Icon={MousePointer2} />}
        panel={
          <>
            {/* Hover click is listed here once every catalog row is owned; before that the list holds the click sound alone. */}
            <SettingsSection heading="Click">
              <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["clicks", "hoverClick"]} />
            </SettingsSection>
            {desk.clicks ? (
              <SettingsSection heading="Click kit">
                <ClickKitList desk={desk} />
              </SettingsSection>
            ) : null}
          </>
        }
      />

      <StatusChip
        id="cat"
        label="Cat"
        active={desk.cat}
        open={openChip === "cat"}
        onOpen={() => setOpenChip("cat")}
        onClose={closeChip}
        icon={<ChipIcon src={desk.catArt ?? DESK_CAT_EMOJI} alt="" />}
        panel={
          <SettingsSection heading="Cat">
            <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["cat"]} />
            {catsFound > 0 ? (
              <button
                type="button"
                className="desk-toggle"
                data-testid="status-cat-roster"
                onClick={() => {
                  setOpenChip(null)
                  setRoster("cats")
                }}
              >
                <span className="desk-toggle-label">Cat roster</span>
                <ChevronRight {...UI_ICON_SM} aria-hidden />
              </button>
            ) : null}
          </SettingsSection>
        }
      />
      {roster === "cats" ? <CatRosterModal onClose={() => setRoster(null)} /> : null}
      {roster && roster !== "cats" ? <CatalogRosterModal key={roster} kind={roster} onClose={() => setRoster(null)} /> : null}

      <StatusChip
        id="rosters"
        label="Rosters"
        active={roster !== null && roster !== "cats"}
        open={openChip === "rosters"}
        onOpen={() => setOpenChip("rosters")}
        onClose={closeChip}
        icon={<ChipIcon Icon={LayoutGrid} />}
        panel={
          <SettingsSection heading="Rosters">
            <RosterButtons
              onPick={(kind) => {
                setOpenChip(null)
                setRoster(kind)
              }}
            />
          </SettingsSection>
        }
      />

      <StatusChip
        id="theme"
        label={`Theme · ${savedTheme.name}`}
        active
        open={openChip === "theme"}
        onOpen={() => setOpenChip("theme")}
        onClose={closeChip}
        icon={
          <>
            <ChipIcon Icon={Palette} />
            <ThemeDots />
          </>
        }
        panel={
          <SettingsSection heading="Editor theme">
            <EditorThemeList savedThemeId={savedTheme.id} onPreviewEnd={clearEditorThemePreview} />
          </SettingsSection>
        }
      />
    </div>
  )
})
