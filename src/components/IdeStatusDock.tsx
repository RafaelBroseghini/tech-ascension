import { Music, MousePointer2, MousePointerClick, Palette, Swords, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { deskCatEmojiUrl } from "../data/emojiAssets.ts"
import { ideThemeStyle } from "../data/ideThemes.ts"
import { getDeskPrefs, subscribeDeskPrefs } from "../game/desk.ts"
import { getSavedIdeTheme, subscribeIdeTheme } from "../game/ideTheme.ts"
import { ownsEverything } from "../game/nextUnlock.ts"
import { useGame } from "../game/store.ts"
import {
  ClickKitList,
  DeskToggleList,
  EditorThemeList,
  MusicStyleList,
  SettingsSection,
  clearEditorThemePreview,
} from "./deskSettingsPanels.tsx"
import { UI_ICON_SM } from "./icons/ui.tsx"

const DESK_CAT_EMOJI = deskCatEmojiUrl()

type ChipId = "music" | "sounds" | "clicks" | "cat" | "enemies" | "hoverClick" | "theme"

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

export function IdeStatusDock() {
  const desk = useSyncExternalStore(subscribeDeskPrefs, getDeskPrefs, getDeskPrefs)
  const savedTheme = useSyncExternalStore(subscribeIdeTheme, getSavedIdeTheme, getSavedIdeTheme)
  const catalogComplete = useGame((state) => ownsEverything(state))
  const [openChip, setOpenChip] = useState<ChipId | null>(null)

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
        id="music"
        label="Music"
        active={desk.music}
        open={openChip === "music"}
        onOpen={() => setOpenChip("music")}
        onClose={closeChip}
        icon={
          <span className={desk.music ? "ide-status-music-icon is-on" : "ide-status-music-icon"}>
            <ChipIcon Icon={Music} />
          </span>
        }
        panel={
          <>
            <SettingsSection heading="Music">
              <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["music"]} />
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
        id="sounds"
        label="Desk sounds"
        active={desk.sounds}
        open={openChip === "sounds"}
        onOpen={() => setOpenChip("sounds")}
        onClose={closeChip}
        icon={<ChipIcon Icon={Volume2} />}
        panel={
          <SettingsSection heading="Desk sounds">
            <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["sounds"]} />
          </SettingsSection>
        }
      />

      <StatusChip
        id="clicks"
        label="Click sound"
        active={desk.clicks}
        open={openChip === "clicks"}
        onOpen={() => setOpenChip("clicks")}
        onClose={closeChip}
        icon={<ChipIcon Icon={MousePointer2} />}
        panel={
          <>
            <SettingsSection heading="Click sound">
              <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["clicks"]} />
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
        icon={<ChipIcon src={DESK_CAT_EMOJI} alt="" />}
        panel={
          <SettingsSection heading="Cat">
            <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["cat"]} />
          </SettingsSection>
        }
      />

      <StatusChip
        id="enemies"
        label="Enemies"
        active={desk.enemies}
        open={openChip === "enemies"}
        onOpen={() => setOpenChip("enemies")}
        onClose={closeChip}
        icon={<ChipIcon Icon={Swords} />}
        panel={
          <SettingsSection heading="Enemies">
            <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["enemies"]} />
          </SettingsSection>
        }
      />

      {catalogComplete ? (
        <StatusChip
          id="hoverClick"
          label="Hover click"
          active={desk.hoverClick}
          open={openChip === "hoverClick"}
          onOpen={() => setOpenChip("hoverClick")}
          onClose={closeChip}
          icon={<ChipIcon Icon={MousePointerClick} />}
          panel={
            <SettingsSection heading="Hover click">
              <DeskToggleList desk={desk} catalogComplete={catalogComplete} keys={["hoverClick"]} />
            </SettingsSection>
          }
        />
      ) : null}

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
}
