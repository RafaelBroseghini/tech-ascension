import { ScrollText, Star } from "lucide-react"
import { UI_ICON } from "./icons/ui.tsx"
import { useEffect, useMemo, useState } from "react"
import { resumeDocument } from "../game/resumeDoc.ts"
import { useGame } from "../game/store.ts"
import { CatRosterButton } from "./CatRosterButton.tsx"
import { EditorSettings } from "./EditorSettings.tsx"
import { MetricsButton } from "./MetricsButton.tsx"
import { ResumeModal } from "./ResumeModal.tsx"

const REPO = "https://github.com/RafaelBroseghini/tech-ascension"

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

  if (!doc) return null

  return (
    <>
      <button
        type="button"
        className="ide-settings"
        data-testid="view-resume"
        aria-label="View your LinkedOut profile"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ScrollText {...UI_ICON} aria-hidden />
      </button>
      {open ? <ResumeModal doc={doc} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export function CornerActions() {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch("https://api.github.com/repos/RafaelBroseghini/tech-ascension", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { stargazers_count?: unknown } | null) => {
        if (typeof body?.stargazers_count === "number") setStars(body.stargazers_count)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  return (
    <div className="top-actions">
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
      <ResumeButton />
      <CatRosterButton />
      <MetricsButton />
      <EditorSettings />
    </div>
  )
}
