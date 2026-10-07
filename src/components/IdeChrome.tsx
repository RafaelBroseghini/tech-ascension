import { GitBranch, Presentation } from "lucide-react"
import { memo, useMemo, useSyncExternalStore } from "react"
import { getSidebarView, setSidebarView, subscribeSidebarView } from "../game/ideSidebar.ts"
import { CareerLog } from "./CareerLog.tsx"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { useFeatureOpen, useSurface } from "./useFeature.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { ideView } from "../game/ide.ts"
import { useGame } from "../game/store.ts"
import { IdeStatusDock } from "./IdeStatusDock.tsx"
import { loadStudio, openStudio } from "./studio/launcher.ts"
import { StudioHost } from "./studio/StudioHost.tsx"

/** The desk shell behind the stage: the activity bar, the career log sidebar and the status bar. The palette is the saved theme. */
export const IdeChrome = memo(function IdeChrome() {
  const skills = useGame((state) => state.skills)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const previewEra = useGame((state) => state.previewEra)
  const holdPreview = useGame((state) => state.holdPreview)
  const seeFeature = useGame((state) => state.seeFeature)

  const logOpen = useFeatureOpen("careerLog")
  const studioOpen = useFeatureOpen("studio")
  const sidebar = useSyncExternalStore(subscribeSidebarView, getSidebarView, getSidebarView)
  const showLog = logOpen && sidebar === "log"
  const { band, previewing } = useMemo(
    () => ideView({ skills, owned, jobs, gigs, previewEra }),
    [skills, owned, jobs, gigs, previewEra],
  )

  const openLog = () => {
    setSidebarView("log")
    seeFeature("careerLog")
  }
  useSurface("careerLog", openLog)
  const openWhiteboard = () => {
    seeFeature("studio")
    openStudio()
  }
  useSurface("studio", openWhiteboard)

  return (
    <div
      className="ide"
      role="region"
      aria-label="Desk"
      data-testid="ide"
      data-era={band.era}
      data-preview={previewing ? "true" : "false"}
      onPointerEnter={holdPreview}
      onPointerMove={holdPreview}
    >
      <nav className="ide-activity" aria-label="Activity bar" data-feature-anchor="studio">
        {studioOpen ? (
          <button
            type="button"
            className="ide-activity-btn"
            data-testid="ide-view-studio"
            aria-label="Whiteboard"
            title="Whiteboard"
            onPointerEnter={() => void loadStudio()}
            onFocus={() => void loadStudio()}
            onClick={openWhiteboard}
          >
            <Presentation className="ide-activity-icon" {...UI_ICON} aria-hidden />
            <NewMark id="studio" />
          </button>
        ) : null}
        {logOpen ? (
          <button
            type="button"
            className={showLog ? "ide-activity-btn is-active" : "ide-activity-btn"}
            data-testid="ide-view-log"
            data-feature-anchor="careerLog"
            aria-label="Career log"
            title="Career log"
            aria-pressed={showLog}
            onClick={() => (showLog ? setSidebarView("closed") : openLog())}
          >
            <GitBranch className="ide-activity-icon ide-activity-icon-git" {...UI_ICON} aria-hidden />
            <NewMark id="careerLog" />
          </button>
        ) : (
          <FeatureGhost id="careerLog" className="ide-activity-btn">
            <GitBranch className="ide-activity-icon ide-activity-icon-git" {...UI_ICON} aria-hidden />
          </FeatureGhost>
        )}
      </nav>
      {showLog ? (
        <aside className="ide-tree" aria-label="Career log">
          <CareerLog />
        </aside>
      ) : null}
      <footer className="ide-status">
        <a className="ide-status-powered" href="https://emoji.gg/" target="_blank" rel="noopener noreferrer">
          powered by emoji.gg
        </a>
        <span className={previewing ? "ide-mode is-preview" : "ide-mode"}>{previewing ? "PREVIEW" : "NORMAL"}</span>
        <span data-testid="ide-band">{band.label}</span>
        <span className="ide-status-gap" />
        <IdeStatusDock />
      </footer>
      <StudioHost />
    </div>
  )
})
