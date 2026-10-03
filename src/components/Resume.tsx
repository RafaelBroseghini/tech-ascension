import { CLICK_ICONS } from "../data/clickIcons.ts"
import { thumbForTier } from "../data/sprites.ts"
import { resumeMarks } from "../game/resume.ts"
import { useGame } from "../game/store.ts"
import { useMemo } from "react"

export function Resume() {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const marks = useMemo(() => resumeMarks({ skills, equipment, jobs, gigs }), [skills, equipment, jobs, gigs])

  if (marks.length === 0) return null

  return (
    <section className="resume" data-testid="resume" aria-label="Resume">
      <h3>Resume</h3>
      <ul>
        {marks.map((mark) => {
          const Icon = mark.icon ? CLICK_ICONS[mark.icon] : null
          return (
            <li key={mark.key}>
              <span className="resume-mark" title={mark.label}>
                {Icon ? (
                  <Icon size={16} />
                ) : (
                  <img src={thumbForTier(mark.artId)} alt="" width={16} height={16} draggable={false} />
                )}
                <span className="sr-only">{mark.label}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
