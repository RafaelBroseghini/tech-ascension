import { beforeEach, describe, expect, it } from "vitest"
import { JOB_TIERS } from "../data/phases.ts"
import { REVIEWS, promptsForJob } from "../data/reviews.ts"
import { BOOST_WAIT_MIN_FACTOR } from "../data/boosts.ts"
import { useGame } from "./store.ts"
import {
  REVIEW_AFTER_BLOCK_MS,
  REVIEW_MEAN_WAIT_MS,
  advanceReviewClock,
  previewReviewChoice,
  resolveReviewChoice,
} from "./reviews.ts"

describe("review prompts", () => {
  it("covers every job with three replies", () => {
    expect(new Set(REVIEWS.map((prompt) => prompt.id)).size).toBe(REVIEWS.length)
    for (const job of JOB_TIERS) {
      const pool = promptsForJob(job.id)
      expect(pool.length).toBeGreaterThan(0)
      for (const prompt of pool) {
        expect(prompt.question).not.toBe("")
        expect(prompt.replies.map((reply) => reply.choice)).toEqual(["exceeds", "meets", "pip"])
        for (const reply of prompt.replies) {
          expect(reply.label).not.toBe("")
          expect(reply.rating).not.toBe("")
        }
      }
    }
    expect(promptsForJob(0)).toEqual([])
    expect(promptsForJob(32)).toEqual([])
  })
})

describe("review clock", () => {
  it("does not schedule or roll without a job", () => {
    const advance = advanceReviewClock(5_000, { jobId: null, blocked: false }, 9_000, () => {
      throw new Error("rng")
    })
    expect(advance).toEqual({ nextReviewAt: null, fire: null })
  })

  it("schedules a wait, then fires the first prompt for that job", () => {
    const now = 1_000
    const scheduled = advanceReviewClock(null, { jobId: 1, blocked: false }, now, () => 0)
    expect(scheduled.fire).toBeNull()
    expect(scheduled.nextReviewAt).toBe(now + Math.round(REVIEW_MEAN_WAIT_MS * BOOST_WAIT_MIN_FACTOR))

    const due = advanceReviewClock(scheduled.nextReviewAt, { jobId: 7, blocked: false }, scheduled.nextReviewAt ?? 0, () => 0)
    expect(due.fire?.id).toBe(promptsForJob(7)[0]?.id)
    expect(due.nextReviewAt).toBeNull()
  })

  it("slips a due meeting while something else is on screen", () => {
    const slipped = advanceReviewClock(100, { jobId: 1, blocked: true }, 100, () => {
      throw new Error("rng")
    })
    expect(slipped).toEqual({ nextReviewAt: 100 + REVIEW_AFTER_BLOCK_MS, fire: null })
    expect(advanceReviewClock(null, { jobId: 1, blocked: true }, 50, () => {
      throw new Error("rng")
    })).toEqual({ nextReviewAt: null, fire: null })
  })
})

describe("review stakes", () => {
  const rates = { cps: 10, click: 0, xpPerSec: 4, xpPerClick: 1 }

  it("pays a raise, sits still, or trades money for XP", () => {
    const exceeds = resolveReviewChoice("exceeds", 1_000, 500, 500, rates)
    expect(exceeds.applied).toBe(true)
    expect(exceeds.money).toBeGreaterThan(1_000)
    expect(exceeds.xp).toBe(500)

    const meets = resolveReviewChoice("meets", 1_000, 500, 500, rates)
    expect(meets).toMatchObject({ money: 1_000, xp: 500, xpTotal: 500, applied: true, lines: [] })

    const pip = resolveReviewChoice("pip", 1_000_000, 1_000_000, 1_000_000, rates)
    expect(pip.applied).toBe(true)
    expect(pip.money).toBeLessThan(1_000_000)
    expect(pip.xp).toBeGreaterThan(1_000_000)
    expect(pip.xpTotal).toBeGreaterThan(1_000_000)

    expect(previewReviewChoice("pip", rates, 0, 0).canAccept).toBe(false)
    expect(resolveReviewChoice("pip", 0, 0, 0, rates).applied).toBe(false)
  })
})

describe("reviews in the store", () => {
  beforeEach(() => {
    useGame.getState().wipe()
  })

  it("stays quiet until a job is held", () => {
    const game = () => useGame.getState()
    expect(game().fireReview()).toBe(false)
    game().tick(game().now + 1_000)
    expect(game().nextReviewAt).toBeNull()
    expect(game().review).toBeNull()
  })

  it("opens a meeting, and the three replies do what they say", () => {
    useGame.setState({ jobs: [1], money: 50_000, xp: 50_000, xpTotal: 50_000, peakMoney: 50_000 })
    expect(useGame.getState().fireReview(1)).toBe(true)
    expect(useGame.getState().review).toMatchObject({ promptId: 1, jobId: 1, choice: null })
    expect(useGame.getState().fireReview(99)).toBe(false)
    expect(useGame.getState().review?.promptId).toBe(1)

    const before = useGame.getState()
    expect(useGame.getState().answerReview("meets")).toBe(true)
    expect(useGame.getState().money).toBe(before.money)
    expect(useGame.getState().xp).toBe(before.xp)
    expect(useGame.getState().review).toBeNull()
    expect(useGame.getState().lastReview?.choice).toBe("meets")

    expect(useGame.getState().fireReview(1)).toBe(true)
    const raised = useGame.getState().money
    expect(useGame.getState().answerReview("exceeds")).toBe(true)
    expect(useGame.getState().money).toBeGreaterThan(raised)

    useGame.setState({ money: 80_000, xp: 10_000, xpTotal: 10_000 })
    expect(useGame.getState().fireReview(1)).toBe(true)
    const pipFrom = useGame.getState()
    expect(useGame.getState().answerReview("pip")).toBe(true)
    const pip = useGame.getState()
    expect(pip.money).toBeLessThan(pipFrom.money)
    expect(pip.xp).toBeGreaterThan(pipFrom.xp)
    expect(pip.xpTotal).toBeGreaterThan(pipFrom.xpTotal)
    expect(pip.lastReview?.choice).toBe("pip")
    expect(pip.lastReview?.lines.length).toBe(2)
  })

  it("refuses a plan you cannot pay and leaves the meeting up", () => {
    useGame.setState({ jobs: [1], money: 0, xp: 0, xpTotal: 0 })
    expect(useGame.getState().fireReview(1)).toBe(true)
    expect(useGame.getState().answerReview("pip")).toBe(false)
    expect(useGame.getState().review).not.toBeNull()
    expect(useGame.getState().money).toBe(0)
    useGame.getState().dismissReview()
    expect(useGame.getState().review).toBeNull()
    expect(useGame.getState().lastReview?.choice).toBeNull()
  })

  it("waits out an open event, and an event closes the meeting", () => {
    useGame.setState({ jobs: [1], money: 1_000, xp: 1_000, xpTotal: 1_000, peakMoney: 1_000 })
    expect(useGame.getState().fireReview(1)).toBe(true)
    useGame.getState().fireEvent(2)
    expect(useGame.getState().review).toBeNull()
    expect(useGame.getState().event).not.toBeNull()

    expect(useGame.getState().fireReview(1)).toBe(true)
    expect(useGame.getState().event).toBeNull()
    expect(useGame.getState().review).not.toBeNull()

    const game = () => useGame.getState()
    game().dismissReview()
    game().tick(game().now + 1_000)
    const due = game().nextReviewAt ?? 0
    game().fireEvent(2)
    game().tick(due + 1)
    expect(game().review).toBeNull()
    expect(game().event).not.toBeNull()
    expect(game().nextReviewAt).toBeGreaterThan(game().now)
  })

  it("asks a build its own questions, and only that build", () => {
    // Rank 14 is a Senior SWE on any track; rank 18 a Manager's Engineering manager.
    const asked = (jobId: number, build: Parameters<typeof promptsForJob>[1]) => promptsForJob(jobId, build).map((prompt) => prompt.id)
    expect(asked(14, { spec: "frontend" })).toContain(14)
    expect(asked(14, { spec: "backend" })).not.toContain(14)
    expect(asked(14, { spec: "backend" })).toContain(15)
    expect(asked(14, {})).not.toEqual(expect.arrayContaining([14]))
    expect(asked(14, { spec: "frontend", lead: "ic" })).not.toContain(20)
    expect(asked(18, { spec: "frontend", lead: "manager" })).toEqual(expect.arrayContaining([14, 21]))
    expect(asked(18, { spec: "frontend", lead: "manager" })).not.toContain(20)
    expect(asked(16, { spec: "security", lead: "ic" })).toEqual(expect.arrayContaining([19, 20]))
  })

  it("keeps the questions for everyone when no build is passed", () => {
    expect(promptsForJob(14).every((prompt) => !prompt.specs && !prompt.leads)).toBe(true)
    for (const prompt of REVIEWS.filter((row) => row.specs || row.leads)) {
      expect(prompt.replies.map((reply) => reply.choice)).toEqual(["exceeds", "meets", "pip"])
      expect(prompt.question).not.toBe("")
    }
  })
})
