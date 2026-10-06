import { Github, ScrollText, Star } from "lucide-react"
import { UI_ICON } from "./icons/ui.tsx"
import { useEffect, useMemo, useState } from "react"
import { resumeDocument } from "../game/resumeDoc.ts"
import { useGame } from "../game/store.ts"
import { CatRosterButton } from "./CatRosterButton.tsx"
import { EditorSettings } from "./EditorSettings.tsx"
import { MetricsButton } from "./MetricsButton.tsx"
import { ResumeModal } from "./ResumeModal.tsx"
import { GitHugModal, REPO } from "./GitHugModal.tsx"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { useFeatureOpen, useSurface } from "./useFeature.ts"

function formatStars(count: number): string {
  if (count < 1000) return String(count)
  const thousands = count / 1000
  const digits = thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1)
  return `${digits.replace(/\.0$/, "")}k`
}

export function ResumeButton() {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const [open, setOpen] = useState(false)
  const doc = useMemo(() => resumeDocument({ skills, equipment, jobs, gigs }), [skills, equipment, jobs, gigs])
  // The profile is a career unlock: it arrives with Portfolio site live.
  const unlocked = useFeatureOpen("linkedout")
  const seeFeature = useGame((state) => state.seeFeature)
  const show = () => {
    seeFeature("linkedout")
    setOpen(true)
  }
  useSurface("linkedout", show)

  if (!unlocked) {
    return (
      <FeatureGhost id="linkedout" place="below" className="ide-settings">
        <ScrollText {...UI_ICON} aria-hidden />
      </FeatureGhost>
    )
  }
  if (!doc) return null

  return (
    <>
      <button
        type="button"
        className="ide-settings"
        data-testid="view-resume"
        data-feature-anchor="linkedout"
        aria-label="View your LinkedOut profile"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <ScrollText {...UI_ICON} aria-hidden />
        <NewMark id="linkedout" />
      </button>
      {open ? <ResumeModal doc={doc} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

/** The real repo's star count, fetched once the GitHug corner is on screen. */
function useRepoStars(enabled: boolean): number | null {
  const [stars, setStars] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    fetch("https://api.github.com/repos/RafaelBroseghini/tech-ascension", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { stargazers_count?: unknown } | null) => {
        if (typeof body?.stargazers_count === "number") setStars(body.stargazers_count)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [enabled])
  return stars
}

/**
 * The GitHug corner, a career unlock with Git + GitHug hygiene: the profile button, and the star for the real repo
 * beside it. Before the unlock only the button's outline stands there, when it is the next thing to open.
 */
export function GitHugCorner() {
  const unlocked = useFeatureOpen("githug")
  const stars = useRepoStars(unlocked)
  const [open, setOpen] = useState(false)
  const seeFeature = useGame((state) => state.seeFeature)
  const show = () => {
    seeFeature("githug")
    setOpen(true)
  }
  useSurface("githug", show)

  if (!unlocked) {
    return (
      <FeatureGhost id="githug" place="below" className="ide-settings">
        <Github {...UI_ICON} aria-hidden />
      </FeatureGhost>
    )
  }
  return (
    <>
      <span className="gh-star">
        <a className="gh-star-main" href={REPO} target="_blank" rel="noreferrer" data-testid="github-star">
          <Star {...UI_ICON} aria-hidden />
          Star
        </a>
        {stars !== null ? (
          <a className="gh-star-count" href={`${REPO}/stargazers`} target="_blank" rel="noreferrer">
            {formatStars(stars)}
          </a>
        ) : null}
      </span>
      <button
        type="button"
        className="ide-settings"
        data-testid="view-githug"
        data-feature-anchor="githug"
        aria-label="View your GitHug profile"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <Github {...UI_ICON} aria-hidden />
        <NewMark id="githug" />
      </button>
      {open ? <GitHugModal stars={stars} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export function CornerActions() {
  return (
    <div className="top-actions">
      <GitHugCorner />
      <ResumeButton />
      <CatRosterButton />
      <MetricsButton />
      <EditorSettings />
    </div>
  )
}
