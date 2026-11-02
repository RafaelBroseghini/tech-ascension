import { Crown, GitBranch } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { getSidebarView, setSidebarView, subscribeSidebarView } from "../game/ideSidebar.ts"
import { CareerLog } from "./CareerLog.tsx"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { useFeatureOpen, useSurface } from "./useFeature.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { ideView } from "../game/ide.ts"
import { useGame } from "../game/store.ts"
import { IdeStatusDock, RosterModals } from "./IdeStatusDock.tsx"
import { PrestigePanel } from "./ExitPanel.tsx"
import { CatRosterButton } from "./CatRosterButton.tsx"
import { RostersButton } from "./RostersButton.tsx"
import { GitHugButton, GitHugStar, ResumeButton } from "./ActivityLinks.tsx"
import { StatusRates } from "./StatusRates.tsx"
import { EditorSettings } from "./EditorSettings.tsx"
import { MetricsButton } from "./MetricsButton.tsx"
import { NotificationsButton } from "./NotificationsButton.tsx"
import { OwnedButton } from "./OwnedModal.tsx"
import { useExitVisible } from "./useExit.ts"

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
  const prestigeVisible = useExitVisible()
  const [prestigeOpen, setPrestigeOpen] = useState(false)
  const closePrestige = useCallback(() => setPrestigeOpen(false), [])
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
  // The sidebar opens by itself the moment GitHug unlocks; a save that loads with it already unlocked keeps the sidebar as it was left.
  const githugOpen = useFeatureOpen("githug")
  const githugWas = useRef(githugOpen)
  useEffect(() => {
    if (githugOpen && !githugWas.current) setSidebarView("log")
    githugWas.current = githugOpen
  }, [githugOpen])

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
      <nav className="ide-activity" aria-label="Activity bar">
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
        <GitHugButton />
        <ResumeButton />
        <MetricsButton />
        <OwnedButton />
        <RostersButton />
        <CatRosterButton />
        {prestigeVisible ? (
          <button
            type="button"
            className={prestigeOpen ? "ide-activity-btn is-active" : "ide-activity-btn"}
            data-testid="ide-view-prestige"
            aria-label="Prestige"
            title="Prestige"
            aria-pressed={prestigeOpen}
            onClick={() => setPrestigeOpen((open) => !open)}
          >
            <Crown className="ide-activity-icon" {...UI_ICON} aria-hidden />
          </button>
        ) : null}
        {/* Last in the scrolling list, so a short phone still shows Owned without scrolling the bar. */}
        <NotificationsButton />
        <div className="ide-activity-foot">
          <GitHugStar />
          {/* The bare desk hides this bar, so settings wait in the stage's corner until GitHug opens it. */}
          {githugOpen ? <EditorSettings /> : null}
        </div>
      </nav>
      {prestigeVisible && prestigeOpen ? <PrestigePanel onClose={closePrestige} /> : null}
      {showLog ? (
        <aside className="ide-tree" aria-label="Career log">
          <CareerLog />
        </aside>
      ) : null}
      <footer className="ide-status">
        <span className={previewing ? "ide-mode is-preview" : "ide-mode"}>{previewing ? "PREVIEW" : "NORMAL"}</span>
        <span data-testid="ide-band">{band.label}</span>
        <StatusRates />
        <span className="ide-status-gap" />
        <IdeStatusDock />
      </footer>
      <RosterModals />
    </div>
  )
})
