import { SKILL_TIERS } from "../data/phases.ts"
import { ownedCount } from "../game/economy.ts"
import { linkedOutProfile } from "../game/linkedout.ts"
import type { CompanyStint, LinkedRole, SideProject } from "../game/linkedout.ts"
import { productRole } from "../game/globe/hires.ts"
import { initialOf } from "../game/identity.ts"
import { useGame } from "../game/store.ts"
import { useMemo, useState } from "react"

const VISIBLE = 5

function orgLine(org: string, employment: string): string {
  return employment === "Full-time" ? org : `${org} · ${employment}`
}

function RoleBody({ role, place, companyLine }: { role: LinkedRole; place: string; companyLine: string | null }) {
  return (
    <>
      <strong className="lo-title">{role.title}</strong>
      {companyLine ? <span className="lo-org">{companyLine}</span> : null}
      <span className="lo-meta">
        {role.startLabel} - {role.endLabel} · {role.duration}
      </span>
      <span className="lo-meta">{place}</span>
      <p className="lo-summary">{role.summary}</p>
    </>
  )
}

function Stint({ stint }: { stint: CompanyStint }) {
  const several = stint.roles.length > 1
  const first = stint.roles[0]
  const shared = first && stint.roles.every((role) => role.employment === first.employment) ? first.employment : ""
  return (
    <li className="lo-stint" data-org={stint.orgId}>
      <span className="lo-logo" style={{ background: stint.hue }} aria-hidden="true">
        {stint.mark}
      </span>
      <div className="lo-stint-body">
        {several ? (
          <>
            <strong className="lo-title">{stint.org}</strong>
            <span className="lo-meta">
              {shared ? `${shared} · ` : ""}
              {stint.duration}
            </span>
            <span className="lo-meta">{stint.place}</span>
            <ul className="lo-roles">
              {stint.roles.map((role) => (
                <li key={role.id}>
                  <RoleBody
                    role={role}
                    place={stint.place}
                    companyLine={shared ? null : role.employment}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : first ? (
          <RoleBody role={first} place={stint.place} companyLine={orgLine(stint.org, first.employment)} />
        ) : null}
      </div>
    </li>
  )
}

function Project({ project }: { project: SideProject }) {
  return (
    <li className="lo-stint" data-kind="project">
      <span className="lo-logo" style={{ background: project.hue }} aria-hidden="true">
        {project.mark}
      </span>
      <div className="lo-stint-body">
        <strong className="lo-title">{project.title}</strong>
        <span className="lo-org">{project.org} · Side project</span>
        <span className="lo-meta">
          {project.startLabel} - {project.endLabel} · {project.duration}
        </span>
        <span className="lo-meta">{project.place}</span>
        <p className="lo-summary">{project.summary}</p>
      </div>
    </li>
  )
}

/** The product on the résumé: what the win made of the player, or the founder's job while the company is theirs. */
function ProductRole({ role, product, ended }: { role: string; product: string; ended: boolean }) {
  return (
    <li className="lo-stint" data-kind="product">
      <span className="lo-logo" style={{ background: "#c0392b" }} aria-hidden="true">
        {initialOf(product)}
      </span>
      <div className="lo-stint-body">
        <strong className="lo-title">{role}</strong>
        <span className="lo-meta">{ended ? "Seven billion users" : "Present"}</span>
      </div>
    </li>
  )
}

function ShowAll({ hidden, open, onOpen }: { hidden: number; open: boolean; onOpen: () => void }) {
  if (hidden <= 0 || open) return null
  return (
    <button type="button" className="lo-show-all" onClick={onOpen}>
      Show all →
    </button>
  )
}

export function LinkedOut() {
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const skills = useGame((state) => state.skills)
  const handle = useGame((state) => state.profile.handle)
  const product = useGame((state) => state.profile.product)
  const ending = useGame((state) => state.company.ending ?? null)
  const isFounder = useGame((state) => state.founder.track === "founder")
  const [experienceOpen, setExperienceOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const profile = useMemo(() => {
    const names = SKILL_TIERS.filter((row) => ownedCount(skills, row.id) > 0).map((row) => row.name)
    return linkedOutProfile({ jobs, gigs, skills: names })
  }, [jobs, gigs, skills])

  if (!profile) return null

  const experience = experienceOpen ? profile.experience : profile.experience.slice(0, VISIBLE)
  const projects = projectsOpen ? profile.projects : profile.projects.slice(0, VISIBLE)

  return (
    <article className="linkedout" data-testid="linkedout" aria-label="LinkedOut profile">
      <header className="lo-head">
        <div className="lo-banner" />
        <span className="lo-brand" aria-hidden="true">
          in
        </span>
        <div className={profile.openToWork ? "lo-avatar is-open" : "lo-avatar"} aria-hidden="true">
          {initialOf(handle)}
        </div>
        <div className="lo-id">
          <h3>
            {handle} <span>LinkedOut</span>
          </h3>
          <p>{profile.headline}</p>
          <p className="lo-meta">
            {profile.location}
            {profile.openToWork ? " · Open to work" : ""}
            {" · "}
            <span className="lo-link">Contact info</span>
          </p>
        </div>
      </header>
      {profile.experience.length > 0 ? (
        <section className="lo-block" aria-label="Experience">
          <h4>Experience</h4>
          <ol className="lo-timeline">
            {ending || isFounder ? <ProductRole role={productRole(ending, product)} product={product} ended={ending !== null} /> : null}
            {experience.map((stint) => (
              <Stint key={`${stint.orgId}-${stint.roles[0]?.id ?? stint.org}`} stint={stint} />
            ))}
          </ol>
          <ShowAll
            hidden={profile.experience.length - VISIBLE}
            open={experienceOpen}
            onOpen={() => setExperienceOpen(true)}
          />
        </section>
      ) : null}
      {profile.projects.length > 0 ? (
        <section className="lo-block" aria-label="Side projects">
          <h4>Projects</h4>
          <ol className="lo-timeline">
            {projects.map((project) => (
              <Project key={project.id} project={project} />
            ))}
          </ol>
          <ShowAll
            hidden={profile.projects.length - VISIBLE}
            open={projectsOpen}
            onOpen={() => setProjectsOpen(true)}
          />
        </section>
      ) : null}
      {profile.skills.length > 0 ? (
        <section className="lo-block" aria-label="Skills">
          <h4>Skills</h4>
          <ul className="lo-skills">
            {profile.skills.slice(0, 8).map((name) => (
              <li key={name}>{name}</li>
            ))}
            {profile.skills.length > 8 ? <li className="lo-more">+{profile.skills.length - 8}</li> : null}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
