import { beforeEach, describe, expect, it } from "vitest"
import { CAREER_MARKS } from "../data/careerYears.ts"
import { firstJobAtRank, GIG_BOARD_UNLOCK, JOB_TIERS } from "../data/phases.ts"
import { careerYear, marksFor, reachedMarks, upcomingMarks, yearNumber } from "./careerYear.ts"
import { useGame } from "./store.ts"

describe("the career's year", () => {
  it("starts at zero, rises with lifetime XP and never falls", () => {
    expect(careerYear(0)).toBe(0)
    expect(yearNumber(0)).toBe(1)
    let last = 0
    for (let xp = 0; xp <= 1e8; xp = xp === 0 ? 1 : Math.ceil(xp * 1.3)) {
      const year = careerYear(xp)
      expect(year, `at ${xp} XP`).toBeGreaterThanOrEqual(last)
      last = year
    }
  })

  it("puts the first job in Year 5, the Gig Board in Year 3 and the top of the ladder past thirty", () => {
    expect(careerYear(GIG_BOARD_UNLOCK.minXp)).toBeCloseTo(2, 5)
    expect(yearNumber(GIG_BOARD_UNLOCK.minXp)).toBe(3)
    expect(careerYear(firstJobAtRank(1)!.xpReq)).toBeCloseTo(4, 5)
    expect(yearNumber(firstJobAtRank(1)!.xpReq)).toBe(5)
    const top = Math.max(...JOB_TIERS.map((job) => job.xpReq))
    expect(careerYear(top)).toBeGreaterThan(30)
    expect(careerYear(top * 100)).toBe(careerYear(top))
  })
})

describe("the marks on it", () => {
  it("has unique ids", () => {
    expect(new Set(CAREER_MARKS.map((mark) => mark.id)).size).toBe(CAREER_MARKS.length)
  })

  it("gives a career the shared marks and its own line's, in order of year", () => {
    const plain = marksFor(null)
    expect(plain.some((mark) => mark.id === "first-job")).toBe(true)
    expect(plain.some((mark) => mark.lead)).toBe(false)
    const manager = marksFor("manager")
    expect(manager.some((mark) => mark.id === "first-report")).toBe(true)
    expect(manager.some((mark) => mark.id === "design-doc")).toBe(false)
    for (let index = 1; index < manager.length; index++) expect(manager[index]!.at).toBeGreaterThanOrEqual(manager[index - 1]!.at)
  })

  it("reaches a mark when the year comes, and says what is ahead", () => {
    const jobXp = firstJobAtRank(1)!.xpReq
    expect(reachedMarks(0, null)).toEqual([])
    expect(reachedMarks(jobXp, null).map((mark) => mark.id)).toContain("first-job")
    expect(reachedMarks(jobXp, null).map((mark) => mark.id)).not.toContain("senior")
    const ahead = upcomingMarks(0, null, 3)
    expect(ahead).toHaveLength(3)
    expect(ahead[0]!.id).toBe("first-client")
  })
})

describe("the marks in the career log", () => {
  beforeEach(() => useGame.getState().wipe())

  const logged = () => useGame.getState().journal.entries.filter((entry) => entry.type === "year").map((entry) => entry.ref)

  it("lands each mark once, with a toast, as the year passes it", () => {
    useGame.getState().keepProfile()
    expect(logged()).toEqual([])
    useGame.setState({ xpTotal: firstJobAtRank(1)!.xpReq })
    expect(logged()).toContain("year:first-job")
    expect(logged()).toContain("year:first-client")
    expect(logged()).not.toContain("year:senior")
    const entry = useGame.getState().journal.entries.find((row) => row.ref === "year:first-job")!
    expect(entry.data).toEqual({ year: 5 })
    expect(useGame.getState().toast?.text).toMatch(/^Year \d+: /)
    const count = logged().length
    useGame.setState({ xpTotal: firstJobAtRank(1)!.xpReq + 1 })
    expect(logged()).toHaveLength(count)
  })
})
