import { X } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import { SKILL_TIERS } from "../data/phases.ts"
import { ownedCount } from "../game/economy.ts"
import { linkedOutProfile } from "../game/linkedout.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { createPortal } from "react-dom"
import type { ResumeDoc, ResumeEntry, ResumeGroup } from "../game/resumeDoc.ts"
import { LINKEDOUT_TAGLINE } from "./icons/LinkedOut.tsx"
import { LinkedOut } from "./LinkedOut.tsx"

function Entry({ entry, heading }: { entry: ResumeEntry; heading: "h3" | "h4" }) {
  const Title = heading
  return (
    <article className="resume-entry">
      <Title>{entry.title}</Title>
      {entry.orgLine ? <p>{entry.orgLine}</p> : null}
      <p className="resume-meta">{entry.when}</p>
      <p className="resume-meta">{entry.place}</p>
      <p className="resume-summary">{entry.summary}</p>
    </article>
  )
}

function Group({ group }: { group: ResumeGroup }) {
  const only = group.entries.length === 1 ? group.entries[0] : null
  if (only && group.meta === null) return <Entry entry={only} heading="h3" />
  return (
    <section className="resume-group">
      <h3>{group.title}</h3>
      {group.meta ? <p className="resume-meta">{group.meta}</p> : null}
      {group.place ? <p className="resume-meta">{group.place}</p> : null}
      <div className="resume-roles">
        {group.entries.map((entry) => (
          <Entry key={`${entry.title}-${entry.when}`} entry={entry} heading="h4" />
        ))}
      </div>
    </section>
  )
}

export function ResumeModal({ doc, onClose }: { doc: ResumeDoc | null; onClose: () => void }) {
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const skills = useGame((state) => state.skills)
  const dialogRef = useRef<HTMLDivElement>(null)
  const linkedOut = useMemo(() => {
    const names = SKILL_TIERS.filter((row) => ownedCount(skills, row.id) > 0).map((row) => row.name)
    return linkedOutProfile({ jobs, gigs, skills: names })
  }, [jobs, gigs, skills])
  const where = doc
    ? [doc.location, doc.openToWork && !doc.openToWorkBanner ? "Open to work" : ""]
        .filter((part) => part.length > 0)
        .join(" · ")
    : ""
  const empty =
    !doc ||
    (doc.experience.length === 0 && doc.projects.length === 0 && doc.skills.length === 0 && doc.tools.length === 0)

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div className="resume-backdrop" data-testid="resume-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="resume-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-linkedout-kicker resume-doc-title"
        aria-describedby="resume-linkedout-tagline"
        tabIndex={-1}
        data-testid="resume-modal"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="resume-doc-head">
          <p className="event-kicker" id="resume-linkedout-kicker">
            LinkedOut
          </p>
          <p className="resume-linkedout-tagline" id="resume-linkedout-tagline">
            {LINKEDOUT_TAGLINE}
          </p>
          <h2 id="resume-doc-title">{doc?.name ?? "You"}</h2>
          <p className="resume-headline">{doc?.headline ?? "Nothing earned yet"}</p>
          {where ? <p className="resume-meta">{where}</p> : null}
          {doc?.openToWorkBanner ? <p className="resume-otw-banner">{doc.openToWorkBanner}</p> : null}
          <button type="button" className="resume-x" aria-label="Close resume" onClick={onClose}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>
        <div className="resume-sheet">
          <LinkedOut />
          {empty && !linkedOut ? <p className="resume-meta">Earn a skill to start a resume.</p> : null}
          {doc && doc.experience.length > 0 ? (
            <section>
              <h3 className="resume-section">Experience</h3>
              {doc.experience.map((group) => (
                <Group key={`${group.title}-${group.entries[0]?.when ?? ""}`} group={group} />
              ))}
            </section>
          ) : null}
          {doc && doc.projects.length > 0 ? (
            <section>
              <h3 className="resume-section">Projects</h3>
              {doc.projects.map((project) => (
                <Entry key={`${project.title}-${project.when}`} entry={project} heading="h3" />
              ))}
            </section>
          ) : null}
          {doc && doc.skills.length > 0 ? (
            <section>
              <h3 className="resume-section">Skills</h3>
              <ul className="resume-pills">
                {doc.skills.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {doc && doc.tools.length > 0 ? (
            <section>
              <h3 className="resume-section">Tools</h3>
              <ul className="resume-pills">
                {doc.tools.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {doc && doc.thoughtLeadership.length > 0 ? (
            <section>
              <h3 className="resume-section">Activity</h3>
              {doc.thoughtLeadership.map((post) => (
                <article key={post.text} className="resume-entry resume-post">
                  <p className="resume-summary">{post.text}</p>
                  <p className="resume-meta">{post.reactions}</p>
                </article>
              ))}
            </section>
          ) : null}
        </div>
        {doc?.recruiterInMail ? (
          <footer className="resume-inmail" data-testid="resume-inmail">
            <p className="resume-inmail-kicker">InMail</p>
            <p className="resume-inmail-from">{doc.recruiterInMail.from}</p>
            <p className="resume-inmail-preview">{doc.recruiterInMail.preview}</p>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
