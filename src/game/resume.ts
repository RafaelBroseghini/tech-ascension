import { artFor, EQUIP_ART, GIG_ART, jobArtId, SKILL_ART } from "../data/art.ts"
import { GEAR_ICONS, GIG_ICONS, JOB_ICONS, SKILL_ICONS } from "../data/clickIcons.ts"
import type { IconName } from "../data/clickIcons.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { ownedCount } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"

export type ResumeMark = {
  key: string
  label: string
  /** Developer logo when this row has one. Otherwise the pixel thumb. */
  icon: IconName | null
  artId: number
}

type Owners = {
  skills: OwnedMap
  equipment: OwnedMap
  jobs: readonly number[]
  gigs: readonly number[]
}

/**
 * One mark per owned skill, tool, gig, or job. A logo that already appeared
 * (React on a skill and again on a job) is kept once. Rows with no logo use their sprite.
 */
export function resumeMarks(owned: Owners): ResumeMark[] {
  const seen = new Set<string>()
  const marks: ResumeMark[] = []

  const push = (key: string, label: string, icon: IconName | null, artId: number) => {
    const dedupe = icon ?? key
    if (seen.has(dedupe)) return
    seen.add(dedupe)
    marks.push({ key, label, icon, artId })
  }

  for (const row of SKILL_TIERS) {
    if (ownedCount(owned.skills, row.id) <= 0) continue
    const icons = SKILL_ICONS[row.id]
    const artId = artFor(SKILL_ART, row.id)
    if (icons && icons.length > 0) for (const icon of icons) push(`icon:${icon}`, row.name, icon, artId)
    else push(`skill:${row.id}`, row.name, null, artId)
  }
  for (const row of EQUIPMENT) {
    if (ownedCount(owned.equipment, row.id) <= 0) continue
    const icons = GEAR_ICONS[row.id]
    const artId = artFor(EQUIP_ART, row.id)
    if (icons && icons.length > 0) for (const icon of icons) push(`icon:${icon}`, row.name, icon, artId)
    else push(`gear:${row.id}`, row.name, null, artId)
  }
  for (const gig of GIGS) {
    if (!owned.gigs.includes(gig.id)) continue
    const icons = GIG_ICONS[gig.id]
    const artId = artFor(GIG_ART, gig.id)
    if (icons && icons.length > 0) for (const icon of icons) push(`icon:${icon}`, gig.name, icon, artId)
    else push(`gig:${gig.id}`, gig.name, null, artId)
  }
  for (const job of JOB_TIERS) {
    if (!owned.jobs.includes(job.id)) continue
    const icons = JOB_ICONS[job.rank]
    const artId = jobArtId(job.id)
    if (icons && icons.length > 0) for (const icon of icons) push(`icon:${icon}`, job.name, icon, artId)
    else push(`job:${job.id}`, job.name, null, artId)
  }
  return marks
}
