import { LinkedOutIcon } from "./icons/LinkedOut.tsx"
import { useEffect, useMemo, useState } from "react"
import { resumeDocument } from "../game/resumeDoc.ts"
import { useGame } from "../game/store.ts"
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

  return (
    <>
      <button type="button" className="view-resume" data-testid="view-resume" aria-label="View resume" onClick={() => setOpen(true)}>
        <LinkedOutIcon size={18} />
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
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"
            />
          </svg>
          Star
        </a>
        {stars !== null ? (
          <a className="gh-star-count" href={`${REPO}/stargazers`} target="_blank" rel="noreferrer">
            {formatStars(stars)}
          </a>
        ) : null}
      </span>
    </div>
  )
}
