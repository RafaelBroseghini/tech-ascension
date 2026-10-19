import { Github, ScrollText, Star } from "lucide-react"
import { UI_ICON } from "./icons/ui.tsx"
import { useEffect, useMemo, useState } from "react"
import { resumeDocument } from "../game/resumeDoc.ts"
import { useGame } from "../game/store.ts"
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
  const handle = useGame((state) => state.profile.handle)
  const doc = useMemo(() => resumeDocument({ skills, equipment, jobs, gigs, handle }), [skills, equipment, jobs, gigs, handle])
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
      <FeatureGhost id="linkedout" className="ide-activity-btn">
        <ScrollText className="ide-activity-icon" {...UI_ICON} aria-hidden />
      </FeatureGhost>
    )
  }
  if (!doc) return null

  return (
    <>
      <button
        type="button"
        className="ide-activity-btn"
        data-testid="view-resume"
        data-feature-anchor="linkedout"
        aria-label="View your LinkedOut profile"
        title="LinkedOut"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <ScrollText className="ide-activity-icon" {...UI_ICON} aria-hidden />
        <NewMark id="linkedout" />
      </button>
      {open ? <ResumeModal doc={doc} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

let repoStars: Promise<number | null> | null = null

/** The real repo's star count, fetched once per page for the star pill and the profile both. */
function useRepoStars(enabled: boolean): number | null {
  const [stars, setStars] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    repoStars ??= fetch("https://api.github.com/repos/RafaelBroseghini/tech-ascension")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { stargazers_count?: unknown } | null) => (typeof body?.stargazers_count === "number" ? body.stargazers_count : null))
      .catch(() => null)
    repoStars.then((count) => {
      if (live) setStars(count)
    })
    return () => {
      live = false
    }
  }, [enabled])
  return stars
}

/** The star for the real repo, at the activity bar's foot once Git + GitHug hygiene unlocks the GitHug profile. */
export function GitHugStar() {
  const unlocked = useFeatureOpen("githug")
  const stars = useRepoStars(unlocked)
  if (!unlocked) return null
  const label = stars === null ? "Star Tech Ascension on GitHub" : `Star Tech Ascension on GitHub (${formatStars(stars)} stars)`
  return (
    <a className="ide-activity-btn gh-star" href={REPO} target="_blank" rel="noreferrer" data-testid="github-star" aria-label={label} title={label}>
      <Star className="ide-activity-icon" {...UI_ICON} aria-hidden />
      {stars !== null ? <span className="gh-star-count">{formatStars(stars)}</span> : null}
    </a>
  )
}

/**
 * The GitHug profile, an activity-bar button and a career unlock with Git + GitHug hygiene. Before the unlock only
 * its outline stands there, when it is the next thing to open.
 */
export function GitHugButton() {
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
      <FeatureGhost id="githug" className="ide-activity-btn">
        <Github className="ide-activity-icon" {...UI_ICON} aria-hidden />
      </FeatureGhost>
    )
  }
  return (
    <>
      <button
        type="button"
        className="ide-activity-btn"
        data-testid="view-githug"
        data-feature-anchor="githug"
        aria-label="View your GitHug profile"
        title="GitHug"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <Github className="ide-activity-icon" {...UI_ICON} aria-hidden />
        <NewMark id="githug" />
      </button>
      {open ? <GitHugModal stars={stars} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
