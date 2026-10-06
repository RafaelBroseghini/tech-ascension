import { describe, expect, it } from "vitest"
import type { CareerEntry, CareerType } from "./careerLog.ts"
import { contributionsByDay, contributionWeeks, dayKey, gitHugProfile, gitHugRepos, levelOf } from "./githug.ts"

// A Wednesday, at noon local time.
const now = new Date(2026, 9, 7, 12).getTime()
const DAY = 86_400_000
let seq = 0
const entry = (type: CareerType, at: number, ref = ""): CareerEntry => ({ seq: ++seq, at, type, ref, money: 0, xpTotal: 0 })

describe("the contribution graph", () => {
  it("counts what you did per day, not what happened to you", () => {
    const days = contributionsByDay([
      entry("start", now),
      entry("learn", now, "skill:1"),
      entry("learn", now, "skill:2"),
      entry("unlock", now, "editor"),
      entry("return", now),
      entry("gig", now - DAY, "gig:1"),
    ])
    expect(days.get(dayKey(now))).toBe(2)
    expect(days.get(dayKey(now - DAY))).toBe(1)
  })

  it("shades a day by how much happened", () => {
    expect([0, 1, 2, 3, 5, 6, 10, 11, 50].map(levelOf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
  })

  it("lays weeks out Sunday first, ending at today", () => {
    const weeks = contributionWeeks(new Map([[dayKey(now), 4]]), now, 20)
    expect(weeks).toHaveLength(20)
    expect(weeks.slice(0, -1).every((week) => week.length === 7)).toBe(true)
    // Wednesday: Sunday through Wednesday so far.
    expect(weeks.at(-1)).toHaveLength(4)
    expect(weeks.at(-1)?.at(-1)).toEqual({ date: dayKey(now), count: 4, level: 2 })
    expect(new Date(`${weeks[0]![0]!.date}T12:00:00`).getDay()).toBe(0)
  })
})

describe("the profile", () => {
  const entries = [0, 1, 2, 4].map((back) => entry("learn", now - back * DAY, "skill:1"))

  it("adds up the graph and the streak, which an empty today does not break", () => {
    const profile = gitHugProfile({ entries, skills: { "1": 1 }, gigs: [], jobs: [], xpTotal: 0, now })
    expect(profile.total).toBe(4)
    expect(profile.streak).toBe(3)
    const tomorrow = gitHugProfile({ entries, skills: { "1": 1 }, gigs: [], jobs: [], xpTotal: 0, now: now + DAY })
    expect(tomorrow.streak).toBe(3)
    expect(gitHugProfile({ entries, skills: {}, gigs: [], jobs: [], xpTotal: 0, now: now + 2 * DAY }).streak).toBe(0)
  })

  it("pins the newest repos: cleared gigs first, then the ones skills start", () => {
    expect(gitHugRepos({ skills: { "1": 1 }, gigs: [] }).map((repo) => repo.name)).toEqual(["hello-world"])
    const repos = gitHugRepos({ skills: { "1": 1, "8": 1, "10": 1 }, gigs: [1, 2] }).map((repo) => repo.name)
    expect(repos).toEqual(["local-biz-landing-page", "fix-broken-login-blog-engine-bug", "til", "dotfiles", "hello-world"])
    const profile = gitHugProfile({ entries: [], skills: { "1": 1, "8": 1, "10": 1 }, gigs: [1, 2], jobs: [], xpTotal: 0, now })
    expect(profile.pinned).toHaveLength(4)
    expect(profile.repos).toBe(5)
    expect(profile.bio).toBe("Freelance, open to gigs")
  })

  it("names the top job in the bio, and grows followers with the career", () => {
    const early = gitHugProfile({ entries: [], skills: {}, gigs: [], jobs: [], xpTotal: 0, now })
    const later = gitHugProfile({ entries: [], skills: {}, gigs: [1], jobs: [1], xpTotal: 40_000, now })
    expect(early.bio).toBe("Learning to code")
    expect(later.bio).toBe("Internship offer")
    expect(later.followers).toBeGreaterThan(early.followers)
  })
})
