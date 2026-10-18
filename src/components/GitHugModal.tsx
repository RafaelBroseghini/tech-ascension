import { Flame, Lock, Star, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { GITHUG_ROWS, gitHugProfile } from "../game/githug.ts"
import type { GitHugRepoCount, GitHugSquare } from "../game/githug.ts"
import { formatNumber } from "../game/format.ts"
import { initialOf } from "../game/identity.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import { useFocusTrap } from "./useFocusTrap.ts"

export const REPO = "https://github.com/RafaelBroseghini/tech-ascension"

const LANG_HUE: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  PHP: "#4f5d95",
  Shell: "#89e051",
  Markdown: "#9aa4b2",
}

const TIP_ROWS = 5

function repoLine(repo: GitHugRepoCount): string {
  return `${repo.count} contribution${repo.count === 1 ? "" : "s"} in ${repo.private ? "private repositories" : repo.name}`
}

function squareTitle(square: GitHugSquare): string {
  return square.steps === 0 ? "Nothing here yet" : square.repos.map(repoLine).join(", ")
}

/** The parody GitHub profile: a green square per run of career steps, pinned repos, and the real repo's star. */
export function GitHugModal({ stars, onClose }: { stars: number | null; onClose: () => void }) {
  const entries = useGame((state) => state.journal.entries)
  const skills = useGame((state) => state.skills)
  const gigs = useGame((state) => state.gigs)
  const jobs = useGame((state) => state.jobs)
  const owned = useGame((state) => state.owned)
  const equipment = useGame((state) => state.equipment)
  const xpTotal = useGame((state) => state.xpTotal)
  const identity = useGame((state) => state.profile)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const [hover, setHover] = useState<GitHugSquare | null>(null)
  const profile = useMemo(() => gitHugProfile({ entries, skills, gigs, jobs, owned, equipment, xpTotal, identity }), [entries, skills, gigs, jobs, owned, equipment, xpTotal, identity])

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div className="resume-backdrop" data-testid="githug-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="resume-modal githug-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="githug-handle"
        tabIndex={-1}
        data-testid="githug-modal"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="githug-head">
          <span className="githug-avatar" aria-hidden="true">
            {initialOf(profile.handle)}
          </span>
          <div className="githug-who">
            <p className="event-kicker">GitHug</p>
            <h2 id="githug-handle" data-testid="githug-handle">
              {profile.handle}
            </h2>
            <p className="githug-bio" data-testid="githug-bio">
              {profile.bio}
            </p>
            <p className="githug-meta" data-testid="githug-meta">
              <b>{formatNumber(profile.followers)}</b> followers · <b>{profile.repos}</b> repos · <b>{formatNumber(profile.stars)}</b> stars
            </p>
          </div>
          <button type="button" className="resume-x" aria-label="Close GitHug profile" onClick={onClose}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>

        <div className="resume-sheet">
          <section className="githug-graph-wrap" aria-label="Contributions">
            <p className="githug-sec">
              <span data-testid="githug-total">
                {formatNumber(profile.total)} contribution{profile.total === 1 ? "" : "s"} so far
              </span>
              <span className="githug-streak" data-testid="githug-streak">
                <Flame {...UI_ICON_SM} aria-hidden />
                {profile.filled} / {profile.weeks.length * GITHUG_ROWS} squares
              </span>
            </p>
            {/* One grid, filled a week (a column) at a time, so the squares stay square at any width. */}
            <div className="githug-graph" data-testid="githug-graph" style={{ ["--weeks" as string]: profile.weeks.length }}>
              {profile.weeks.flat().map((square) => (
                <i
                  key={square.index}
                  className="githug-day"
                  data-level={square.level}
                  data-index={square.index}
                  title={squareTitle(square)}
                  onMouseEnter={() => setHover(square)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </div>
            <div className="githug-tip" data-testid="githug-tip" aria-live="polite">
              {hover && hover.steps > 0 ? (
                <>
                  <ul>
                    {hover.repos.slice(0, TIP_ROWS).map((repo) => (
                      <li key={repo.name} data-private={repo.private}>
                        {repo.private ? <Lock {...UI_ICON_SM} aria-label="Private" role="img" /> : null}
                        {repoLine(repo)}
                      </li>
                    ))}
                  </ul>
                  {hover.repos.length > TIP_ROWS ? <p className="githug-tip-more">+{hover.repos.length - TIP_ROWS} more</p> : null}
                </>
              ) : (
                <p className="githug-tip-head">Hover a square to see where the work went</p>
              )}
            </div>
            <p className="githug-legend" aria-hidden="true">
              Less
              {[0, 1, 2, 3, 4].map((level) => (
                <i key={level} className="githug-day" data-level={level} />
              ))}
              More
            </p>
          </section>

          {profile.pinned.length > 0 ? (
            <section aria-label="Pinned">
              <h3 className="resume-section">Pinned</h3>
              <ul className="githug-pinned" data-testid="githug-pinned">
                {profile.pinned.map((repo) => (
                  <li key={repo.name}>
                    <strong>{repo.name}</strong>
                    <p>{repo.about}</p>
                    <span className="githug-repo-meta">
                      <i style={{ background: LANG_HUE[repo.lang] ?? "var(--ide-overlay)" }} aria-hidden="true" />
                      {repo.lang}
                      <Star {...UI_ICON_SM} aria-hidden />
                      {repo.stars}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <footer className="githug-real">
          <p>This game is open source, on the real one.</p>
          <a className="gh-star-main" href={REPO} target="_blank" rel="noreferrer" data-testid="githug-real-star">
            <Star {...UI_ICON_SM} aria-hidden />
            Star tech-ascension{stars !== null ? ` · ${formatNumber(stars)}` : ""}
          </a>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
