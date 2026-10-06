import { GIGS, SKILL_TIERS } from "../data/phases.ts"
import type { CareerEntry, CareerType } from "./careerLog.ts"
import { highestJobId, jobById, ownedCount } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import type { Identity } from "./identity.ts"

/**
 * The GitHug profile: the career journal drawn as a contribution graph, and the repos the career has made. Built
 * from progress and the career's handle (`identity.ts`), so it needs nothing else in the save.
 */

/**
 * Journal lines that count as contributions (things you did, not things that happened to you), and how many commits
 * each is worth before the career stage multiplies it.
 */
const COMMITS: Partial<Record<CareerType, number>> = { learn: 1, gear: 1, perk: 1, gig: 3, invest: 2, hire: 5 }

/**
 * How much a step counts for at a career stage, read from the lifetime XP the journal line stamped: one more per
 * tenfold of XP, so a senior engineer's day is far greener than a student's. 1 at zero XP, 5 at 10,000, 9 at 100M.
 */
export function stageOf(xpTotal: number): number {
  return 1 + Math.floor(Math.log10(Math.max(1, xpTotal)))
}

/** Commits a journal line adds to its day; 0 for lines that are not contributions. */
export function commitsOf(entry: Pick<CareerEntry, "type" | "xpTotal">): number {
  const base = COMMITS[entry.type] ?? 0
  return base * stageOf(entry.xpTotal)
}

/** A day's square: 0 is empty, 4 is the darkest green. */
export type GitHugLevel = 0 | 1 | 2 | 3 | 4

export type GitHugDay = { date: string; count: number; level: GitHugLevel }

export type GitHugRepo = { name: string; about: string; lang: string; stars: number }

export type GitHugProfile = {
  handle: string
  bio: string
  /** Week columns, oldest first, Sunday on top. The current week stops at today. */
  weeks: GitHugDay[][]
  /** Contributions inside the graph. */
  total: number
  /** Days in a row with at least one contribution, ending today (or yesterday, if today is still empty). */
  streak: number
  pinned: GitHugRepo[]
  repos: number
  followers: number
  stars: number
}

/** Weeks the graph shows: half a year. */
export const GITHUG_WEEKS = 26

/** A day's shade against the busiest day on the graph, in quarters, the way GitHub scales a profile to its owner. */
export function levelOf(count: number, busiest: number): GitHugLevel {
  if (count <= 0 || busiest <= 0) return 0
  return Math.min(4, Math.ceil((4 * count) / busiest)) as GitHugLevel
}

/** Local calendar day, the way the graph labels it. */
export function dayKey(at: number): string {
  const date = new Date(at)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Contributions (commits) per local day. */
export function contributionsByDay(entries: readonly CareerEntry[]): Map<string, number> {
  const days = new Map<string, number>()
  for (const entry of entries) {
    const commits = commitsOf(entry)
    if (commits === 0) continue
    const key = dayKey(entry.at)
    days.set(key, (days.get(key) ?? 0) + commits)
  }
  return days
}

/** The graph: `weeks` columns ending with the week that holds `now`. */
export function contributionWeeks(days: ReadonlyMap<string, number>, now: number, weeks: number): GitHugDay[][] {
  const today = new Date(now)
  today.setHours(12, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - today.getDay() - (weeks - 1) * 7)
  const columns: GitHugDay[][] = []
  for (let week = 0; week < weeks; week++) {
    const column: GitHugDay[] = []
    for (let weekday = 0; weekday < 7; weekday++) {
      const day = new Date(start)
      day.setDate(start.getDate() + week * 7 + weekday)
      if (day.getTime() > today.getTime()) break
      const date = dayKey(day.getTime())
      const count = days.get(date) ?? 0
      column.push({ date, count, level: 0 })
    }
    columns.push(column)
  }
  const busiest = Math.max(0, ...columns.flat().map((day) => day.count))
  for (const day of columns.flat()) day.level = levelOf(day.count, busiest)
  return columns
}

function streakOf(days: ReadonlyMap<string, number>, now: number): number {
  const day = new Date(now)
  day.setHours(12, 0, 0, 0)
  // An empty today does not break the streak yet.
  if (!days.get(dayKey(day.getTime()))) day.setDate(day.getDate() - 1)
  let streak = 0
  while (days.get(dayKey(day.getTime()))) {
    streak += 1
    day.setDate(day.getDate() - 1)
  }
  return streak
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const GIG_LANGS = ["TypeScript", "Python", "Go", "JavaScript", "Rust", "PHP"] as const

/** Repos the skills make on the way: each opens with the skill that would start it. */
const SKILL_REPOS: readonly { skill: number; name: string; about: string; lang: string }[] = [
  { skill: 1, name: "hello-world", about: "print('hello, world') and then some", lang: "Python" },
  { skill: 8, name: "dotfiles", about: "Aliases nobody else understands", lang: "Shell" },
  { skill: 10, name: "til", about: "Today I learned, one commit at a time", lang: "Markdown" },
  { skill: 15, name: "portfolio", about: "The site that got you the first gig", lang: "TypeScript" },
  { skill: 18, name: "leetcrate", about: "Solutions, mostly accepted", lang: "Python" },
]

type Progress = { skills: OwnedMap; gigs: readonly number[]; jobs: readonly number[]; xpTotal: number }

/** Every repo the career has, newest first: cleared gigs, then the skill repos. */
export function gitHugRepos(p: Pick<Progress, "skills" | "gigs">): GitHugRepo[] {
  const skillCount = SKILL_TIERS.filter((row) => ownedCount(p.skills, row.id) > 0).length
  const fromGigs = GIGS.filter((gig) => p.gigs.includes(gig.id))
    .reverse()
    .map((gig) => ({
      name: slug(gig.name),
      about: gig.retainerCps > 0 ? `${gig.name}. Still on retainer.` : `${gig.name}. Shipped.`,
      lang: GIG_LANGS[gig.id % GIG_LANGS.length]!,
      stars: Math.max(1, Math.round(Math.log2(gig.lump + 1) * 3)),
    }))
  const fromSkills = SKILL_REPOS.filter((row) => ownedCount(p.skills, row.skill) > 0)
    .reverse()
    .map((row) => ({ name: row.name, about: row.about, lang: row.lang, stars: row.name === "til" ? skillCount : Math.max(1, Math.floor(skillCount / 4)) }))
  return [...fromGigs, ...fromSkills]
}

export function gitHugProfile(p: Progress & { entries: readonly CareerEntry[]; now: number; identity: Identity; weeks?: number }): GitHugProfile {
  const days = contributionsByDay(p.entries)
  const weeks = contributionWeeks(days, p.now, p.weeks ?? GITHUG_WEEKS)
  const repos = gitHugRepos(p)
  const top = highestJobId(p.jobs)
  return {
    handle: p.identity.handle,
    bio: top !== null ? (jobById(top)?.name ?? "Developer") : p.gigs.length > 0 ? "Freelance, open to gigs" : "Learning to code",
    weeks,
    total: weeks.flat().reduce((sum, day) => sum + day.count, 0),
    streak: streakOf(days, p.now),
    pinned: repos.slice(0, 4),
    repos: repos.length,
    followers: Math.floor(Math.sqrt(Math.max(0, p.xpTotal)) / 4) + p.gigs.length * 2 + p.jobs.length * 5,
    stars: repos.reduce((sum, repo) => sum + repo.stars, 0),
  }
}
