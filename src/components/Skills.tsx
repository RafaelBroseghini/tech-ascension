import { CLICK_ICONS } from "../data/clickIcons.ts"
import type { IconName } from "../data/clickIcons.ts"
import { resumeMarks } from "../game/resume.ts"
import type { ResumeMark } from "../game/resume.ts"
import { useGame } from "../game/store.ts"
import { useMemo } from "react"

function hasIcon(mark: ResumeMark): mark is ResumeMark & { icon: IconName } {
  return mark.icon !== null
}

export function Skills() {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const marks = useMemo(
    () => resumeMarks({ skills, equipment, jobs, gigs }).filter(hasIcon),
    [skills, equipment, jobs, gigs],
  )

  if (marks.length === 0) return null

  return (
    <section className="skills" data-testid="skills" aria-label="Skills">
      <h3>Skills</h3>
      <ul>
        {marks.map((mark) => {
          const Icon = CLICK_ICONS[mark.icon]
          return (
            <li key={mark.key}>
              <span className="skills-mark" title={mark.label}>
                <Icon size={24} />
                <span className="sr-only">{mark.label}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
