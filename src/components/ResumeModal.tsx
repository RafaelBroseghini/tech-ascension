import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { ResumeDoc, ResumeEntry, ResumeGroup } from "../game/resumeDoc.ts"

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
  const dialogRef = useRef<HTMLDivElement>(null)
  const where = doc
    ? [doc.location, doc.openToWork ? "Open to work" : ""].filter((part) => part.length > 0).join(" · ")
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
        aria-labelledby="resume-doc-title"
        tabIndex={-1}
        data-testid="resume-modal"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="resume-doc-head">
          <p className="event-kicker">Resume</p>
          <h2 id="resume-doc-title">{doc?.name ?? "You"}</h2>
          <p className="resume-headline">{doc?.headline ?? "Nothing earned yet"}</p>
          {where ? <p className="resume-meta">{where}</p> : null}
          <button type="button" className="resume-x" aria-label="Close resume" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="resume-sheet">
          {empty ? <p className="resume-meta">Earn a skill to start a resume.</p> : null}
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
        </div>
      </div>
    </div>,
    document.body,
  )
}
