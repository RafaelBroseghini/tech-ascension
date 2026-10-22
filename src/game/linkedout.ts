import { gigById, jobById, jobRank } from "./economy.ts"

/**
 * A LinkedIn-shaped career, built from the jobs and gigs the player actually holds.
 * Dates walk backward from October 2026 so the latest role is always "Present".
 */

const NOW = { year: 2026, month: 9 }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

export type YearMonth = { year: number; month: number }

export type CompanyId =
  | "byte"
  | "puddle"
  | "northwind"
  | "lumenhold"
  | "foundry"
  | "omnigroup"
  | "helio"
  | "kepler"
  | "holdings"
  | "chair"
  | "independent"

type Company = { id: CompanyId; name: string; place: string; hue: string }

export const COMPANIES: Readonly<Record<CompanyId, Company>> = {
  byte: { id: "byte", name: "Byte & Mortar", place: "Columbus, OH", hue: "#5b4b8a" },
  puddle: { id: "puddle", name: "Puddle", place: "Austin, TX", hue: "#0a66c2" },
  northwind: { id: "northwind", name: "Northwind", place: "Seattle, WA", hue: "#1d4e4a" },
  lumenhold: { id: "lumenhold", name: "Lumenhold", place: "San Francisco, CA", hue: "#8a3e2b" },
  foundry: { id: "foundry", name: "Foundry Seed", place: "Remote", hue: "#3d5a2a" },
  omnigroup: { id: "omnigroup", name: "Omnigroup", place: "New York, NY", hue: "#1a1a1a" },
  helio: { id: "helio", name: "Helio Lab", place: "Pasadena, CA", hue: "#6b3fa0" },
  kepler: { id: "kepler", name: "Kepler Board", place: "London, UK", hue: "#8a6a2f" },
  holdings: { id: "holdings", name: "Ascendant Holdings", place: "Singapore", hue: "#16324f" },
  chair: { id: "chair", name: "The Chair", place: "Orbital", hue: "#4a3060" },
  independent: { id: "independent", name: "Independent", place: "Remote", hue: "#444444" },
}

const POSTS: Readonly<Record<number, { company: CompanyId; employment: string; months: number }>> = {
  1: { company: "byte", employment: "Internship", months: 4 },
  2: { company: "byte", employment: "Full-time", months: 14 },
  3: { company: "byte", employment: "Full-time", months: 10 },
  4: { company: "byte", employment: "Full-time", months: 8 },
  5: { company: "byte", employment: "Full-time", months: 6 },
  6: { company: "byte", employment: "Full-time", months: 8 },
  7: { company: "puddle", employment: "Full-time", months: 16 },
  8: { company: "puddle", employment: "Full-time", months: 12 },
  9: { company: "puddle", employment: "Full-time", months: 8 },
  10: { company: "puddle", employment: "Full-time", months: 14 },
  11: { company: "puddle", employment: "Full-time", months: 12 },
  12: { company: "puddle", employment: "Full-time", months: 14 },
  13: { company: "puddle", employment: "Full-time", months: 10 },
  14: { company: "northwind", employment: "Full-time", months: 18 },
  15: { company: "northwind", employment: "Full-time", months: 14 },
  16: { company: "northwind", employment: "Full-time", months: 20 },
  17: { company: "northwind", employment: "Full-time", months: 16 },
  18: { company: "northwind", employment: "Full-time", months: 18 },
  19: { company: "lumenhold", employment: "Full-time", months: 16 },
  20: { company: "lumenhold", employment: "Full-time", months: 20 },
  21: { company: "lumenhold", employment: "Full-time", months: 22 },
  22: { company: "foundry", employment: "Full-time", months: 18 },
  23: { company: "omnigroup", employment: "Full-time", months: 16 },
  24: { company: "omnigroup", employment: "Full-time", months: 20 },
  25: { company: "kepler", employment: "Part-time", months: 24 },
  26: { company: "kepler", employment: "Contract", months: 12 },
  27: { company: "omnigroup", employment: "Full-time", months: 18 },
  28: { company: "helio", employment: "Full-time", months: 20 },
  29: { company: "helio", employment: "Full-time", months: 16 },
  30: { company: "holdings", employment: "Full-time", months: 24 },
  31: { company: "chair", employment: "Full-time", months: 36 },
}

/** One line under the role, the way a LinkedIn entry carries a short description. */
const BLURBS: Readonly<Record<number, string>> = {
  1: "Joined the team as an intern. Picked up tickets, sat in reviews, and learned how a release actually goes out.",
  2: "Shipped small features under review and kept the bug queue from growing back overnight.",
  3: "Paired with a mentor on the same codebase, then started taking tickets alone.",
  4: "Read other people's diffs and learned which comments are worth making.",
  5: "Spent a rotation breaking the product on purpose and writing the cases that stuck.",
  6: "Carried the pager. Wrote the notes, and handed the next shift a quieter board.",
  7: "Owned features end to end, from the ticket to the graph that said they stayed up.",
  8: "Named owner of a feature. Wrote the plan, shipped it, and stayed for the fallout.",
  9: "Studied how the system hangs together, then put that into the next design.",
  10: "Lived in the API and the database. Made the slow paths less slow.",
  11: "Owned the screens people touch. Cut the jank and kept the states honest.",
  12: "Moved between the UI and the service whenever the feature needed both.",
  13: "Acting lead. Unblocked the team, kept the plan honest, and still wrote code.",
  14: "Set the bar in review and took the problems that did not have a ticket yet.",
  15: "Kept the senior seat and ran the hiring loop so the next hire could do the job.",
  16: "Worked across teams on the problems no single squad could close.",
  17: "Built the platform the product teams stand on, and kept it from becoming a maze.",
  18: "Set technical direction and stayed close enough to know if it was real.",
  19: "Hired, coached, and kept the work pointed at something a user would notice.",
  20: "Held the plan, the budget, and the quality bar across several teams.",
  21: "Turned a strategy into teams that could ship it.",
  22: "Chose the stack, the first hires, and which fires were real.",
  23: "Brought a hard technical bet across the company and made it land.",
  24: "Wrote the pieces other teams copied, and said the quiet part in public.",
  25: "Translated the roadmap into risk a board could vote on.",
  26: "Bought in to stand the org up, then left the team able to run it.",
  27: "Owned a practice and the people who delivered it.",
  28: "Set the research agenda and kept the lab tied to something the company could ship.",
  29: "Funded the work, protected the time, and published what held up.",
  30: "Moved capital and people toward the bets that were working.",
  31: "The org chart ended here, and so did the hard calls.",
}

export type LinkedRole = {
  id: string
  title: string
  employment: string
  start: YearMonth
  end: YearMonth
  present: boolean
  months: number
  startLabel: string
  endLabel: string
  duration: string
  summary: string
}

export type CompanyStint = {
  orgId: CompanyId
  org: string
  place: string
  hue: string
  mark: string
  roles: LinkedRole[]
  duration: string
}

export type SideProject = {
  id: string
  title: string
  org: string
  place: string
  hue: string
  mark: string
  startLabel: string
  endLabel: string
  duration: string
  present: boolean
  summary: string
}

export type LinkedOutPost = {
  text: string
  reactions: string
}

export type RecruiterInMail = {
  from: string
  preview: string
}

export type LinkedOutProfile = {
  headline: string
  location: string
  openToWork: boolean
  /** Shown under the headline when the player is still job hunting. */
  openToWorkBanner: string | null
  thoughtLeadership: readonly LinkedOutPost[]
  recruiterInMail: RecruiterInMail | null
  experience: CompanyStint[]
  projects: SideProject[]
  skills: readonly string[]
}

const OPEN_TO_WORK_BANNER =
  "Open to work · Software engineering internships, new grad, and early-career full-time roles"

const THOUGHT_LEADERSHIP: readonly LinkedOutPost[] = [
  {
    text: "Hot take: the best architecture doc is the one your on-call can grep at 3am. Agree?",
    reactions: "847 reactions · 214 comments",
  },
  {
    text: "I did not leave big tech to work less. I left to choose which fires are mine.",
    reactions: "1,204 reactions · 89 comments",
  },
  {
    text: "Reminder: 'Staff engineer' is a scope, not a vibe. Thread 🧵",
    reactions: "562 reactions · 131 comments",
  },
]

function recruiterInMail(topRank: number): RecruiterInMail | null {
  if (topRank < 7) {
    return {
      from: "Alex T. · Talent partner",
      preview: "Saw you're interning — open to a quick chat about new grad roles next year?",
    }
  }
  if (topRank >= 16) {
    return {
      from: "Priya M. · Executive search",
      preview:
        "Hi — confidential Staff+ loop at a decacorn. Comp is 'flexible' (their words). 15 min this week?",
    }
  }
  if (topRank >= 14) {
    return {
      from: "Jordan K. · Tech recruiter",
      preview: "Saw your Senior title — open to Staff at a Series C? Remote-first, 'fast-paced culture.'",
    }
  }
  return {
    from: "Alex T. · Talent partner",
    preview: "Quick question: would you relocate for a 10% bump and free snacks?",
  }
}

export function shiftMonths(year: number, month: number, delta: number): YearMonth {
  const total = year * 12 + month + delta
  const nextYear = Math.floor(total / 12)
  return { year: nextYear, month: total - nextYear * 12 }
}

export function formatMonth(date: YearMonth): string {
  return `${MONTHS[date.month] ?? "Jan"} ${date.year}`
}

export function durationLabel(months: number): string {
  const span = Math.max(1, months)
  const years = Math.floor(span / 12)
  const rest = span % 12
  const parts: string[] = []
  if (years === 1) parts.push("1 yr")
  else if (years > 1) parts.push(`${years} yrs`)
  if (rest === 1) parts.push("1 mo")
  else if (rest > 1) parts.push(`${rest} mos`)
  return parts.join(" ") || "1 mo"
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word !== "&" && word.toLowerCase() !== "the")
  if (words.length === 0) return "IN"
  if (words.length === 1) return (words[0] ?? "IN").slice(0, 2).toUpperCase()
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase()
}

function monthsBetween(start: YearMonth, end: YearMonth): number {
  return (end.year - start.year) * 12 + (end.month - start.month)
}

function roleDates(
  ids: readonly number[],
  lengthOf: (id: number) => number,
  orderOf: (id: number) => number = (id) => id,
): Map<number, { start: YearMonth; end: YearMonth; present: boolean; months: number }> {
  const ordered = [...ids].filter((id) => lengthOf(id) > 0).sort((a, b) => orderOf(b) - orderOf(a))
  const dates = new Map<number, { start: YearMonth; end: YearMonth; present: boolean; months: number }>()
  let cursor = NOW
  ordered.forEach((id, index) => {
    const months = lengthOf(id)
    const end = cursor
    const start = shiftMonths(end.year, end.month, -months)
    dates.set(id, { start, end, present: index === 0, months })
    cursor = start
  })
  return dates
}

function toRole(
  id: string,
  title: string,
  employment: string,
  dated: { start: YearMonth; end: YearMonth; present: boolean; months: number },
  summary: string,
): LinkedRole {
  return {
    id,
    title,
    employment,
    start: dated.start,
    end: dated.end,
    present: dated.present,
    months: dated.months,
    startLabel: formatMonth(dated.start),
    endLabel: dated.present ? "Present" : formatMonth(dated.end),
    duration: durationLabel(dated.months),
    summary,
  }
}

/** Jobs held, newest first, folded into company stints the way LinkedIn groups a stay. */
export function linkedOutProfile(input: {
  jobs: readonly number[]
  gigs: readonly number[]
  skills?: readonly string[]
}): LinkedOutProfile | null {
  // A specialization's row keeps the company, tenure and blurb of the backend row at its rank, and sorts by rank.
  const postOf = (id: number) => POSTS[jobRank(id)]
  const jobs = [...new Set(input.jobs)].filter((id) => jobById(id) && postOf(id))
  const gigs = [...new Set(input.gigs)].filter((id) => gigById(id))
  if (jobs.length === 0 && gigs.length === 0) return null

  const jobDates = roleDates(jobs, (id) => postOf(id)?.months ?? 0, (id) => jobRank(id) * 1000 + id)
  const roles = jobs
    .map((id) => {
      const job = jobById(id)
      const post = postOf(id)
      const dated = jobDates.get(id)
      if (!job || !post || !dated) return null
      return { post, role: toRole(`job:${id}`, job.name, post.employment, dated, BLURBS[jobRank(id)] ?? job.name) }
    })
    .filter((row): row is { post: (typeof POSTS)[number]; role: LinkedRole } => row !== null)
    .sort((a, b) => b.role.end.year - a.role.end.year || b.role.end.month - a.role.end.month || b.role.start.year - a.role.start.year)

  const experience: CompanyStint[] = []
  for (const row of roles) {
    const company = COMPANIES[row.post.company]
    const last = experience[experience.length - 1]
    if (last && last.orgId === company.id) {
      last.roles.push(row.role)
      continue
    }
    experience.push({
      orgId: company.id,
      org: company.name,
      place: company.place,
      hue: company.hue,
      mark: initials(company.name),
      roles: [row.role],
      duration: "",
    })
  }
  for (const stint of experience) {
    const newest = stint.roles[0]
    const oldest = stint.roles[stint.roles.length - 1]
    if (!newest || !oldest) continue
    stint.duration = durationLabel(monthsBetween(oldest.start, newest.present ? NOW : newest.end) || newest.months)
  }

  const earliestJob = [...jobDates.values()].sort((a, b) => a.start.year - b.start.year || a.start.month - b.start.month)[0]
  const gigDates = roleDates(
    gigs,
    () => 2,
  )
  // Park freelance work before the first job. With no job, the latest gig is current.
  if (earliestJob) {
    const ordered = [...gigs].sort((a, b) => b - a)
    let cursor = earliestJob.start
    for (const id of ordered) {
      const dated = gigDates.get(id)
      if (!dated) continue
      const end = cursor
      const start = shiftMonths(end.year, end.month, -2)
      dated.start = start
      dated.end = end
      dated.present = false
      dated.months = 2
      cursor = start
    }
  }

  const indie = COMPANIES.independent
  const projects: SideProject[] = gigs
    .map((id) => {
      const gig = gigById(id)
      const dated = gigDates.get(id)
      if (!gig || !dated) return null
      const role = toRole(`gig:${id}`, gig.name, "Contract", dated, `Independent contract. ${gig.name}.`)
      return {
        id: role.id,
        title: role.title,
        org: indie.name,
        place: indie.place,
        hue: indie.hue,
        mark: initials(gig.name),
        startLabel: role.startLabel,
        endLabel: role.endLabel,
        duration: role.duration,
        present: role.present,
        summary: role.summary,
      }
    })
    .filter((row): row is SideProject => row !== null)
    .sort((a, b) => Number(b.id.slice(4)) - Number(a.id.slice(4)))

  const top = experience[0]
  const topRole = top?.roles[0]
  const headline = top && topRole ? `${topRole.title} at ${top.org}` : "Freelance developer"
  const location = top?.place ?? indie.place
  const topRank = topRole ? jobRank(Number(topRole.id.slice(4))) : 0
  const openToWork = topRank < 14

  return {
    headline,
    location,
    openToWork,
    /** Same window as the top-right resume: any held job below Senior. */
    openToWorkBanner: openToWork && jobs.length > 0 ? OPEN_TO_WORK_BANNER : null,
    thoughtLeadership: topRank >= 16 ? THOUGHT_LEADERSHIP.slice(0, Math.min(3, 1 + Math.floor((topRank - 16) / 3))) : [],
    recruiterInMail: jobs.length > 0 ? recruiterInMail(topRank) : null,
    experience,
    projects,
    skills: input.skills ?? [],
  }
}
