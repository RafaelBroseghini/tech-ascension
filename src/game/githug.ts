import { GIGS, SKILL_TIERS } from "../data/phases.ts"
import type { CareerEntry, CareerType } from "./careerLog.ts"
import { highestJobId, jobById, ownedCount } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import type { Identity } from "./identity.ts"

/**
 * The GitHug profile: the career journal drawn as a contribution graph, and the repos the career has made. Built
 * from progress and the career's handle (`identity.ts`), so it needs nothing else in the save.
 */

/** Journal lines that group into squares: things you did, not things that happened to you. */
const CONTRIBUTING: ReadonlySet<CareerType> = new Set<CareerType>(["learn", "gear", "perk", "gig", "invest", "hire"])

/** A square's shade: 0 is empty, 4 is the darkest green. */
export type GitHugLevel = 0 | 1 | 2 | 3 | 4

/** Where a square's contributions went: a public repo by name, or all the private ones together (hidden, like GitHub). */
export type GitHugRepoCount = { name: string; count: number; private: boolean }

/** A square holds a fixed run of career steps, so the graph fills with progress, not with real days. */
export type GitHugSquare = { index: number; count: number; level: GitHugLevel; steps: number; repos: GitHugRepoCount[] }

export type GitHugRepo = { name: string; about: string; lang: string; stars: number }

export type GitHugProfile = {
  handle: string
  bio: string
  /** Columns of `GITHUG_ROWS` squares, oldest first, filled top to bottom. Squares after the latest step stay empty. */
  weeks: GitHugSquare[][]
  /** Contributions inside the graph. */
  total: number
  /** Squares with at least one step. */
  filled: number
  pinned: GitHugRepo[]
  repos: number
  followers: number
  stars: number
}

/** Rows the graph shows. */
export const GITHUG_ROWS = 5

/** Columns the graph shows; with five rows that is 130 squares. */
export const GITHUG_WEEKS = 26

/** Contributing career steps in one square. A full career (about 1,500 steps) fills the graph. */
export const STEPS_PER_SQUARE = 8

/** A square's shade against the busiest square on the graph, in quarters, the way GitHub scales a profile to its owner. */
export function levelOf(count: number, busiest: number): GitHugLevel {
  if (count <= 0 || busiest <= 0) return 0
  return Math.min(4, Math.ceil((4 * count) / busiest)) as GitHugLevel
}

const refId = (ref: string) => Number(ref.slice(ref.indexOf(":") + 1))

/**
 * The repo a contribution lands in, or null for a private one (work for an employer or an investment is not public).
 * Skills go to the repo that skill started, gigs to their own repo, gear to dotfiles and perks to til.
 */
function repoOf(entry: CareerEntry): string | null {
  switch (entry.type) {
    case "learn": {
      const id = refId(entry.ref)
      return [...SKILL_REPOS].reverse().find((row) => row.skill <= id)?.name ?? "hello-world"
    }
    case "gig": {
      const gig = GIGS.find((row) => row.id === refId(entry.ref))
      return gig ? slug(gig.name) : "freelance"
    }
    case "gear":
      return "dotfiles"
    case "perk":
      return "til"
    default:
      return null
  }
}

/** A stable number from 1 to 50 for a repo line in a square: the same square always reads the same on every hover. */
function lineCount(index: number, name: string): number {
  let hash = 2166136261 ^ index
  for (let i = 0; i < name.length; i++) hash = Math.imul(hash ^ name.charCodeAt(i), 16777619)
  return 1 + ((hash >>> 0) % 50)
}

function addRepo(square: GitHugSquare, entry: CareerEntry): void {
  const name = repoOf(entry)
  const key = name ?? "private"
  if (!square.repos.some((repo) => repo.name === key)) square.repos.push({ name: key, count: lineCount(square.index, key), private: name === null })
}

/**
 * The graph: every run of `STEPS_PER_SQUARE` contributing steps is a square, and the newest squares fill the grid.
 * The numbers on a square's repo lines are made up, steady per square, and add up to the square's shade.
 */
export function contributionWeeks(entries: readonly CareerEntry[], weeks: number): GitHugSquare[][] {
  const squares: GitHugSquare[] = []
  let stepsInSquare = 0
  for (const entry of entries) {
    if (!CONTRIBUTING.has(entry.type)) continue
    if (stepsInSquare % STEPS_PER_SQUARE === 0) squares.push({ index: squares.length, count: 0, level: 0, steps: 0, repos: [] })
    const square = squares[squares.length - 1]!
    square.steps += 1
    addRepo(square, entry)
    square.count = square.repos.reduce((sum, repo) => sum + repo.count, 0)
    stepsInSquare += 1
  }
  const capacity = weeks * GITHUG_ROWS
  const shown = squares.slice(Math.max(0, squares.length - capacity))
  const busiest = Math.max(0, ...shown.map((square) => square.count))
  for (const square of shown) square.repos.sort((a, b) => Number(a.private) - Number(b.private) || b.count - a.count)
  for (const square of shown) square.level = levelOf(square.count, busiest)
  const first = squares.length - shown.length
  while (shown.length < capacity) shown.push({ index: first + shown.length, count: 0, level: 0, steps: 0, repos: [] })
  const columns: GitHugSquare[][] = []
  for (let week = 0; week < weeks; week++) columns.push(shown.slice(week * GITHUG_ROWS, (week + 1) * GITHUG_ROWS))
  return columns
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

type Progress = {
  skills: OwnedMap
  gigs: readonly number[]
  jobs: readonly number[]
  xpTotal: number
  /** Capital rows and gear copies held; each earns followers and a private repo. */
  owned?: OwnedMap
  equipment?: OwnedMap
}

/** Stars grow with the career: 1x at the start, about 3x at a million lifetime XP, 4x at a billion. */
const starsFactor = (xpTotal: number) => 1 + Math.log10(Math.max(1, xpTotal)) / 3

const heldRows = (owned: OwnedMap | undefined) => Object.values(owned ?? {}).filter((n) => typeof n === "number" && n > 0).length
const heldCopies = (owned: OwnedMap | undefined) => Object.values(owned ?? {}).reduce<number>((sum, n) => sum + (typeof n === "number" && n > 0 ? n : 0), 0)

/** Every public repo the career has, newest first: cleared gigs, then the skill repos. Private ones (jobs, capital) are only counted. */
export function gitHugRepos(p: Pick<Progress, "skills" | "gigs"> & { xpTotal?: number }): GitHugRepo[] {
  const boost = starsFactor(p.xpTotal ?? 0)
  const skillCount = SKILL_TIERS.filter((row) => ownedCount(p.skills, row.id) > 0).length
  const fromGigs = GIGS.filter((gig) => p.gigs.includes(gig.id))
    .reverse()
    .map((gig) => ({
      name: slug(gig.name),
      about: gig.retainerCps > 0 ? `${gig.name}. Still on retainer.` : `${gig.name}. Shipped.`,
      lang: GIG_LANGS[gig.id % GIG_LANGS.length]!,
      stars: Math.max(1, Math.round(Math.log2(gig.lump + 1) * 3 * boost)),
    }))
  const fromSkills = SKILL_REPOS.filter((row) => ownedCount(p.skills, row.skill) > 0)
    .reverse()
    .map((row) => ({ name: row.name, about: row.about, lang: row.lang, stars: Math.max(1, Math.round((row.name === "til" ? skillCount : Math.floor(skillCount / 4)) * boost)) }))
  return [...fromGigs, ...fromSkills]
}

export function gitHugProfile(p: Progress & { entries: readonly CareerEntry[]; identity: Identity; weeks?: number }): GitHugProfile {
  const weeks = contributionWeeks(p.entries, p.weeks ?? GITHUG_WEEKS)
  const repos = gitHugRepos(p)
  const privateRepos = p.jobs.length + heldRows(p.owned)
  const top = highestJobId(p.jobs)
  return {
    handle: p.identity.handle,
    bio: top !== null ? (jobById(top)?.name ?? "Developer") : p.gigs.length > 0 ? "Freelance, open to gigs" : "Learning to code",
    weeks,
    total: weeks.flat().reduce((sum, square) => sum + square.count, 0),
    filled: weeks.flat().filter((square) => square.steps > 0).length,
    pinned: repos.slice(0, 4),
    repos: repos.length + privateRepos,
    followers: Math.floor(Math.sqrt(Math.max(0, p.xpTotal)) / 4) + p.gigs.length * 2 + p.jobs.length * 5 + heldRows(p.owned) * 25 + Math.floor(heldCopies(p.equipment) / 2),
    stars: repos.reduce((sum, repo) => sum + repo.stars, 0),
  }
}
