import { Flame, Pencil, Star, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { gitHugProfile } from "../game/githug.ts"
import type { GitHugDay } from "../game/githug.ts"
import { formatNumber } from "../game/format.ts"
import { cleanHandle, cleanName, initialOf } from "../game/identity.ts"
import type { Identity } from "../game/identity.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"

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

const WEEKDAY_LABEL = ["", "Mon", "", "Wed", "", "Fri", ""]

function dayTitle(day: GitHugDay): string {
  const when = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  return `${day.count === 0 ? "No" : day.count} contribution${day.count === 1 ? "" : "s"} on ${when}`
}

/** Rename the career: the name and handle GitHug and LinkedOut both show. Enter saves, Esc backs out. */
function EditIdentity({ identity, onDone }: { identity: Identity; onDone: () => void }) {
  const setProfile = useGame((state) => state.setProfile)
  const [name, setName] = useState(identity.name)
  const [handle, setHandle] = useState(identity.handle)
  const nameOk = cleanName(name) !== null
  const handleOk = cleanHandle(handle) !== null
  const preview = cleanHandle(handle)
  const save = () => {
    if (setProfile({ name, handle })) onDone()
  }
  return (
    <form
      className="githug-edit"
      data-testid="githug-edit"
      onSubmit={(submit) => {
        submit.preventDefault()
        save()
      }}
      onKeyDown={(key) => {
        if (key.key !== "Escape") return
        // Esc leaves the form, not the profile.
        key.preventDefault()
        key.stopPropagation()
        onDone()
      }}
    >
      <label>
        Name
        <input value={name} maxLength={40} autoFocus aria-invalid={!nameOk} data-testid="githug-edit-name" onChange={(change) => setName(change.target.value)} />
      </label>
      <label>
        Handle
        <span className="githug-edit-handle">
          @
          <input value={handle} maxLength={40} aria-invalid={!handleOk} data-testid="githug-edit-handle" onChange={(change) => setHandle(change.target.value)} />
        </span>
      </label>
      <p className="githug-edit-note">{handleOk && preview !== handle ? `Saves as @${preview}` : "Letters, numbers and hyphens. LinkedOut uses it too."}</p>
      <div className="githug-edit-actions">
        <button type="submit" className="githug-btn is-primary" disabled={!nameOk || !handleOk} data-testid="githug-edit-save">
          Save
        </button>
        <button type="button" className="githug-btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/** The parody GitHub profile: a green square per day you shipped something, pinned repos, and the real repo's star. */
export function GitHugModal({ stars, onClose }: { stars: number | null; onClose: () => void }) {
  const entries = useGame((state) => state.journal.entries)
  const skills = useGame((state) => state.skills)
  const gigs = useGame((state) => state.gigs)
  const jobs = useGame((state) => state.jobs)
  const xpTotal = useGame((state) => state.xpTotal)
  const identity = useGame((state) => state.profile)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  // The graph ends on the day the profile was opened.
  const [openedAt] = useState(() => Date.now())
  const profile = useMemo(
    () => gitHugProfile({ entries, skills, gigs, jobs, xpTotal, identity, now: openedAt }),
    [entries, skills, gigs, jobs, xpTotal, identity, openedAt],
  )

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape" && !key.defaultPrevented) onClose()
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
        aria-labelledby="githug-name"
        tabIndex={-1}
        data-testid="githug-modal"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="githug-head">
          <span className="githug-avatar" aria-hidden="true">
            {initialOf(profile.name)}
          </span>
          <div className="githug-who">
            <p className="event-kicker">GitHug</p>
            {editing ? (
              <EditIdentity identity={identity} onDone={() => setEditing(false)} />
            ) : (
              <>
                <h2 id="githug-name" data-testid="githug-name">
                  {profile.name}
                  <button type="button" className="githug-edit-open" aria-label="Edit name and handle" data-testid="githug-edit-open" onClick={() => setEditing(true)}>
                    <Pencil {...UI_ICON_SM} aria-hidden />
                  </button>
                </h2>
                <p className="githug-handle" data-testid="githug-handle">
                  @{profile.handle} · {profile.bio}
                </p>
              </>
            )}
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
                {formatNumber(profile.total)} contribution{profile.total === 1 ? "" : "s"} in the last {profile.weeks.length} weeks
              </span>
              <span className="githug-streak" data-testid="githug-streak">
                <Flame {...UI_ICON_SM} aria-hidden />
                {profile.streak} day streak
              </span>
            </p>
            {/* One grid, filled a week (a column) at a time, so the squares stay square at any width. */}
            <div className="githug-graph" data-testid="githug-graph" style={{ ["--weeks" as string]: profile.weeks.length }}>
              {WEEKDAY_LABEL.map((label, index) => (
                <span key={`label-${index}`} className="githug-weekday" aria-hidden="true">
                  {label}
                </span>
              ))}
              {profile.weeks.flat().map((day) => (
                <i key={day.date} className="githug-day" data-level={day.level} data-date={day.date} title={dayTitle(day)} />
              ))}
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
