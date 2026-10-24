import { beforeEach, describe, expect, it } from "vitest"
import { CAREER_MARKS } from "../data/careerYears.ts"
import { ORIGINS } from "../data/origins.ts"
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
  it("has unique ids, and a few of its own for every origin", () => {
    expect(new Set(CAREER_MARKS.map((mark) => mark.id)).size).toBe(CAREER_MARKS.length)
    for (const origin of ORIGINS) expect(CAREER_MARKS.filter((mark) => mark.origin === origin.id).length, origin.id).toBeGreaterThanOrEqual(3)
  })

  it("gives a career its own origin's marks and the shared ones, in order of year", () => {
    const college = marksFor("college", null)
    expect(college.some((mark) => mark.id === "graduation")).toBe(true)
    expect(college.some((mark) => mark.id === "demo-day")).toBe(false)
    expect(college.some((mark) => mark.id === "first-job")).toBe(true)
    expect(college.some((mark) => mark.lead)).toBe(false)
    expect(marksFor(null, null).some((mark) => mark.origin)).toBe(false)
    expect(marksFor("dropout", "manager").some((mark) => mark.id === "first-report")).toBe(true)
    for (let index = 1; index < college.length; index++) expect(college[index]!.at).toBeGreaterThanOrEqual(college[index - 1]!.at)
  })

  it("reaches a mark when the year comes, and says what is ahead", () => {
    const jobXp = firstJobAtRank(1)!.xpReq
    expect(reachedMarks(0, "bootcamp", null)).toEqual([])
    expect(reachedMarks(jobXp, "bootcamp", null).map((mark) => mark.id)).toContain("first-job")
    expect(reachedMarks(jobXp, "bootcamp", null).map((mark) => mark.id)).not.toContain("senior")
    const ahead = upcomingMarks(0, "bootcamp", null, 3)
    expect(ahead).toHaveLength(3)
    expect(ahead[0]!.origin).toBe("bootcamp")
  })
})

describe("the marks in the career log", () => {
  beforeEach(() => useGame.getState().wipe())

  const logged = () => useGame.getState().journal.entries.filter((entry) => entry.type === "year").map((entry) => entry.ref)

  it("lands each mark once, with a toast, as the year passes it", () => {
    useGame.getState().keepProfile()
    useGame.getState().pickOrigin("college")
    expect(logged()).toEqual([])
    useGame.setState({ xpTotal: firstJobAtRank(1)!.xpReq })
    expect(logged()).toContain("year:first-job")
    expect(logged()).toContain("year:graduation")
    expect(logged()).not.toContain("year:demo-day")
    const entry = useGame.getState().journal.entries.find((row) => row.ref === "year:first-job")!
    expect(entry.data).toEqual({ year: 5 })
    expect(useGame.getState().toast?.text).toMatch(/^Year \d+: /)
    const count = logged().length
    useGame.setState({ xpTotal: firstJobAtRank(1)!.xpReq + 1 })
    expect(logged()).toHaveLength(count)
  })

  it("catches up on its origin's marks when the origin is picked after the year passed them", () => {
    useGame.getState().keepProfile()
    useGame.setState({ xpTotal: GIG_BOARD_UNLOCK.minXp })
    expect(logged()).not.toContain("year:orientation")
    useGame.getState().pickOrigin("college")
    expect(logged()).toContain("year:orientation")
    expect(logged()).toContain("year:intro-cs-final")
  })
})
