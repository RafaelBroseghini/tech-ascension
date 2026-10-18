import { describe, expect, it } from "vitest"
import type { CareerEntry, CareerType } from "./careerLog.ts"
import { contributionWeeks, gitHugProfile, gitHugRepos, levelOf, STEPS_PER_SQUARE } from "./githug.ts"

const now = new Date(2026, 9, 7, 12).getTime()
let seq = 0
const entry = (type: CareerType, at: number, ref = ""): CareerEntry => ({ seq: ++seq, at, type, ref, money: 0, xpTotal: 0 })
const identity = { handle: "brisk-axolotl" }

describe("the contribution graph", () => {
  it("counts what you did, not what happened to you", () => {
    const squares = contributionWeeks([entry("start", now), entry("learn", now, "skill:1"), entry("unlock", now, "editor"), entry("return", now), entry("gig", now, "gig:1")], 2).flat()
    expect(squares).toHaveLength(10)
    expect(squares[0]!.steps).toBe(2)
    expect(squares[1]!.steps).toBe(0)
  })

  it("starts a new square every run of steps, whatever the real time between them", () => {
    const steps = Array.from({ length: STEPS_PER_SQUARE * 2 + 1 }, (_, i) => entry("learn", now + i * 40 * 86_400_000, "skill:1"))
    const squares = contributionWeeks(steps, 2).flat()
    expect(squares.map((square) => square.steps).slice(0, 4)).toEqual([STEPS_PER_SQUARE, STEPS_PER_SQUARE, 1, 0])
  })

  it("files contributions under public repos by name and hides private ones behind one entry", () => {
    const entries = [entry("learn", now, "skill:1"), entry("learn", now, "skill:2"), entry("gear", now, "gear:1"), entry("hire", now, "job:1"), entry("invest", now, "capital:1")]
    const [square] = contributionWeeks(entries, 2).flat()
    expect(square!.repos.map((repo) => [repo.name, repo.private])).toEqual([
      ["hello-world", false],
      ["dotfiles", false],
      ["private", true],
    ])
  })

  it("gives each repo line a steady number from 1 to 50, and the square the sum of its lines", () => {
    const entries = [entry("learn", now, "skill:1"), entry("gear", now, "gear:1"), entry("hire", now, "job:1")]
    const first = contributionWeeks(entries, 2).flat()[0]!
    const again = contributionWeeks(entries, 2).flat()[0]!
    expect(first.repos).toEqual(again.repos)
    for (const repo of first.repos) {
      expect(repo.count).toBeGreaterThanOrEqual(1)
      expect(repo.count).toBeLessThanOrEqual(50)
    }
    expect(first.count).toBe(first.repos.reduce((sum, repo) => sum + repo.count, 0))
  })

  it("shades a square against the busiest square, in quarters", () => {
    expect([0, 1, 5, 10, 11, 20].map((count) => levelOf(count, 20))).toEqual([0, 1, 1, 2, 3, 4])
    expect(levelOf(3, 0)).toBe(0)
  })

  it("fills the newest squares once the grid is full, in columns of five", () => {
    const steps = Array.from({ length: STEPS_PER_SQUARE * 20 }, () => entry("learn", now, "skill:1"))
    const weeks = contributionWeeks(steps, 2)
    expect(weeks).toHaveLength(2)
    expect(weeks.every((week) => week.length === 5)).toBe(true)
    expect(weeks[0]![0]!.index).toBe(10)
    expect(weeks[1]![4]!.index).toBe(19)
  })
})

describe("the profile", () => {
  const entries = Array.from({ length: STEPS_PER_SQUARE + 2 }, () => entry("learn", now, "skill:1"))

  it("adds up the graph and the filled squares", () => {
    const profile = gitHugProfile({ entries, skills: { "1": 1 }, gigs: [], jobs: [], xpTotal: 0, identity })
    expect(profile.total).toBe(profile.weeks.flat().reduce((sum, square) => sum + square.count, 0))
    expect(profile.total).toBeGreaterThan(0)
    expect(profile.filled).toBe(2)
    expect(profile.weeks.flat()).toHaveLength(26 * 5)
  })

  it("pins the newest repos: cleared gigs first, then the ones skills start", () => {
    expect(gitHugRepos({ skills: { "1": 1 }, gigs: [] }).map((repo) => repo.name)).toEqual(["hello-world"])
    const repos = gitHugRepos({ skills: { "1": 1, "8": 1, "10": 1 }, gigs: [1, 2] }).map((repo) => repo.name)
    expect(repos).toEqual(["local-biz-landing-page", "fix-broken-login-blog-engine-bug", "til", "dotfiles", "hello-world"])
    const profile = gitHugProfile({ entries: [], skills: { "1": 1, "8": 1, "10": 1 }, gigs: [1, 2], jobs: [], xpTotal: 0, identity })
    expect(profile.pinned).toHaveLength(4)
    expect(profile.repos).toBe(5)
    expect(profile.bio).toBe("Freelance, open to gigs")
  })

  it("grows followers, repos and stars as the career goes on", () => {
    const at = (p: Partial<Parameters<typeof gitHugProfile>[0]>) => gitHugProfile({ entries: [], skills: {}, gigs: [], jobs: [], xpTotal: 0, identity, ...p })
    const early = at({ skills: { "1": 1 }, gigs: [1], xpTotal: 20_000 })
    const hired = at({ skills: { "1": 1 }, gigs: [1], jobs: [1, 2], xpTotal: 100_000 })
    const rich = at({ skills: { "1": 1 }, gigs: [1], jobs: [1, 2], owned: { "1": 1, "2": 1 }, equipment: { "1": 4 }, xpTotal: 5_000_000 })
    for (const [a, b] of [[early, hired], [hired, rich]] as const) {
      expect(b.followers).toBeGreaterThan(a.followers)
      expect(b.repos).toBeGreaterThan(a.repos)
      expect(b.stars).toBeGreaterThan(a.stars)
    }
  })

  it("names the top job in the bio, and grows followers with the career", () => {
    const early = gitHugProfile({ entries: [], skills: {}, gigs: [], jobs: [], xpTotal: 0, identity })
    const later = gitHugProfile({ entries: [], skills: {}, gigs: [1], jobs: [1], xpTotal: 40_000, identity })
    expect(early.bio).toBe("Learning to code")
    expect(early.handle).toBe("brisk-axolotl")
    expect(later.bio).toBe("Internship offer")
    expect(later.followers).toBeGreaterThan(early.followers)
  })
})
