import { EQUIPMENT, SKILL_TIERS } from "../data/phases.ts"
import { ownedCount } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { linkedOutProfile, type LinkedOutPost, type RecruiterInMail } from "./linkedout.ts"
import { offerLine } from "./studio/interviews.ts"
import type { Band } from "./studio/interviews.ts"

export type ResumeEntry = {
  title: string
  orgLine: string | null
  when: string
  place: string
  summary: string
  /** The offer line for a job whose interview carried one. */
  offer: string | null
}

/** A company stay. One role is flat; several roles share the company header. */
export type ResumeGroup = {
  title: string
  meta: string | null
  place: string | null
  entries: ResumeEntry[]
}

export type ResumeDoc = {
  name: string
  headline: string
  location: string
  openToWork: boolean
  openToWorkBanner: string | null
  thoughtLeadership: readonly LinkedOutPost[]
  recruiterInMail: RecruiterInMail | null
  experience: ResumeGroup[]
  projects: ResumeEntry[]
  skills: readonly string[]
  tools: readonly string[]
}

type Owners = {
  skills: OwnedMap
  equipment: OwnedMap
  jobs: readonly number[]
  gigs: readonly number[]
  /** The career's handle (the store's `profile.handle`), the name the résumé goes by. */
  handle?: string
  /** The band of the offer each job's interview earned, by job id. */
  bands?: Readonly<Record<number, Band>>
}

function when(start: string, end: string, duration: string): string {
  return `${start} - ${end} · ${duration}`
}

function orgLine(org: string, employment: string): string {
  return employment === "Full-time" ? org : `${org} · ${employment}`
}

function skillNames(skills: OwnedMap): string[] {
  return SKILL_TIERS.filter((row) => ownedCount(skills, row.id) > 0).map((row) => row.name)
}

function toolNames(equipment: OwnedMap): string[] {
  return EQUIPMENT.filter((row) => ownedCount(equipment, row.id) > 0).map((row) => row.name)
}

/** The career on screen, as a resume. Null until the player owns a skill, tool, gig, or job. */
export function resumeDocument(owned: Owners): ResumeDoc | null {
  const skills = skillNames(owned.skills)
  const tools = toolNames(owned.equipment)
  const profile = linkedOutProfile({ jobs: owned.jobs, gigs: owned.gigs, skills, bands: owned.bands })
  if (!profile && skills.length === 0 && tools.length === 0) return null

  const experience: ResumeGroup[] = (profile?.experience ?? []).map((stint) => {
    const first = stint.roles[0]
    const shared = first && stint.roles.every((role) => role.employment === first.employment) ? first.employment : ""
    const entries = stint.roles.map((role) => ({
      title: role.title,
      orgLine: stint.roles.length > 1 ? (shared ? null : role.employment) : orgLine(stint.org, role.employment),
      when: when(role.startLabel, role.endLabel, role.duration),
      place: stint.place,
      summary: role.summary,
      offer: role.offer ? offerLine(role.offer) : null,
    }))
    if (entries.length === 1 && entries[0]) {
      return { title: entries[0].title, meta: null, place: null, entries }
    }
    return {
      title: stint.org,
      meta: `${shared ? `${shared} · ` : ""}${stint.duration}`,
      place: stint.place,
      entries,
    }
  })

  const projects: ResumeEntry[] = (profile?.projects ?? []).map((project) => ({
    title: project.title,
    orgLine: `${project.org} · Side project`,
    when: when(project.startLabel, project.endLabel, project.duration),
    place: project.place,
    summary: project.summary,
    offer: null,
  }))

  return {
    name: owned.handle ?? "You",
    headline: profile?.headline ?? "Self-taught",
    location: profile?.location ?? "",
    openToWork: profile?.openToWork ?? skills.length > 0,
    openToWorkBanner: profile?.openToWorkBanner ?? null,
    thoughtLeadership: profile?.thoughtLeadership ?? [],
    recruiterInMail: profile?.recruiterInMail ?? null,
    experience,
    projects,
    skills: profile?.skills ?? skills,
    tools,
  }
}

function entryLines(entry: ResumeEntry, depth: "###" | "####"): string[] {
  const lines = [`${depth} ${entry.title}`]
  if (entry.orgLine) lines.push(entry.orgLine)
  lines.push(entry.when, entry.place, "", entry.summary)
  if (entry.offer) lines.push("", `*${entry.offer}*`)
  lines.push("")
  return lines
}

/** Markdown of the same resume, for copy, download, and share. */
export function resumeMarkdown(doc: ResumeDoc): string {
  const lines: string[] = [`# ${doc.name}`, "", `**${doc.headline}**`]
  const where = [doc.location, doc.openToWork && !doc.openToWorkBanner ? "Open to work" : ""]
    .filter((part) => part.length > 0)
    .join(" · ")
  if (where) lines.push(where)
  if (doc.openToWorkBanner) lines.push("", `*${doc.openToWorkBanner}*`, "")
  lines.push("")

  if (doc.experience.length > 0) {
    lines.push("## Experience", "")
    for (const group of doc.experience) {
      const only = group.entries.length === 1 ? group.entries[0] : null
      if (only && group.meta === null) {
        lines.push(...entryLines(only, "###"))
        continue
      }
      lines.push(`### ${group.title}`)
      if (group.meta) lines.push(group.meta)
      if (group.place) lines.push(group.place)
      lines.push("")
      for (const entry of group.entries) lines.push(...entryLines(entry, "####"))
    }
  }

  if (doc.projects.length > 0) {
    lines.push("## Projects", "")
    for (const project of doc.projects) lines.push(...entryLines(project, "###"))
  }

  if (doc.skills.length > 0) {
    lines.push("## Skills", "", doc.skills.join(" · "), "")
  }

  if (doc.tools.length > 0) {
    lines.push("## Tools", "", doc.tools.join(" · "), "")
  }

  if (doc.thoughtLeadership.length > 0) {
    lines.push("## Activity", "")
    for (const post of doc.thoughtLeadership) {
      lines.push(post.text, "", post.reactions, "")
    }
  }

  if (doc.recruiterInMail) {
    lines.push("## InMail", "", `**${doc.recruiterInMail.from}**`, doc.recruiterInMail.preview, "")
  }

  return `${lines.join("\n").trim()}\n`
}
