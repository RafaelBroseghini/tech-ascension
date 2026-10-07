import { beforeEach, describe, expect, it } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { JOB_TIERS } from "../../data/phases.ts"
import { careerJson } from "../careerLog.ts"
import { jobState } from "../phase.ts"
import { useGame } from "../store.ts"
import { interviewById, interviewForJob, noHirePenalty } from "./interviews.ts"

const HELLO = interviewById("hello-server")!
const THREE_TIER = interviewById("3-tier-app")!
const junior = JOB_TIERS.find((job) => job.id === 2)!

/** A career with the Job Board open and enough lifetime XP for the Junior SWE interview. */
function atJuniorInterview(xp: number) {
  useGame.getState().wipe()
  useGame.setState({ xp, xpTotal: 45_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [1] })
}

const lastLog = () => careerJson(useGame.getState().journal.entries.at(-1)!)

describe("whiteboard interviews", () => {
  beforeEach(() => atJuniorInterview(10_000))

  it("maps the twelve interviews to the jobs in Appendix F", () => {
    expect(INTERVIEWS.map((row) => row.jobId)).toEqual([1, 2, 6, 7, 10, 12, 14, 16, 19, 20, 22, 24])
    expect(INTERVIEWS.map(noHirePenalty)).toEqual([1_750, 2_250, 3_500, 4_500, 6_000, 6_500, 8_000, 11_000, 15_000, 17_500, 25_000, 37_500])
    expect(interviewForJob(3)).toBeUndefined()
  })

  it("a No hire costs 5% of the job's lifetime XP requirement", () => {
    const verdict = useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)
    expect(verdict?.kind).toBe("noHire")
    expect(useGame.getState().xp).toBe(10_000 - junior.xpReq * 0.05)
    expect(useGame.getState().interviews[THREE_TIER.id]).toMatchObject({ verdict: "noHire", attempts: 1 })
    expect(lastLog()).toMatchObject({ type: "interview", ref: "interview:3-tier-app", verdict: "noHire", penalty: 2_250 })
    expect(String(lastLog().missed)).toContain(THREE_TIER.naive[0].fails)
    expect(jobState(useGame.getState(), junior)).toBe("interview")
  })

  it("the penalty never pushes spendable XP below 0", () => {
    atJuniorInterview(500)
    useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)
    expect(useGame.getState().xp).toBe(0)
    expect(useGame.getState().lastInterview?.penalty).toBe(500)
    useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)
    expect(useGame.getState().xp).toBe(0)
    expect(useGame.getState().interviews[THREE_TIER.id]?.attempts).toBe(2)
  })

  it("a No hire never lowers lifetime XP", () => {
    useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.naive[1].design)
    expect(useGame.getState().xpTotal).toBe(45_000)
  })

  it("keeps the failed design for the next try", () => {
    const design = THREE_TIER.naive[1].design
    useGame.getState().submitWhiteboard(THREE_TIER.id, design)
    expect(useGame.getState().interviews[THREE_TIER.id]?.design).toEqual(design)
  })

  it("a pass latches", () => {
    useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)
    const verdict = useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.reference)
    expect(verdict?.kind).toBe("hire")
    expect(useGame.getState().xp).toBe(10_000 - 2_250)
    expect(lastLog()).toMatchObject({ type: "interview", ref: "interview:3-tier-app", verdict: verdict?.kind, attempts: 2 })
    expect(jobState(useGame.getState(), junior)).toBe("ready")
    // Past its interview the job refuses another submission, so a later bad design cannot undo the pass.
    expect(useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)).toBeNull()
    expect(useGame.getState().xp).toBe(10_000 - 2_250)
    useGame.setState({ xp: junior.xpCost })
    expect(useGame.getState().buyJob(junior.id)).toBe(true)
  })

  it("an interview whose job is still locked refuses a submission", () => {
    useGame.setState({ xpTotal: 44_999 })
    const before = useGame.getState()
    expect(useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)).toBeNull()
    const after = useGame.getState()
    expect([after.xp, after.xpTotal, after.interviews, after.journal]).toEqual([before.xp, before.xpTotal, before.interviews, before.journal])
    expect(useGame.getState().submitWhiteboard("no-such-interview", THREE_TIER.reference)).toBeNull()
  })

  it("refuses an interview whose job is already held", () => {
    expect(useGame.getState().submitWhiteboard(HELLO.id, HELLO.naive[0].design)).toBeNull()
    expect(useGame.getState().xp).toBe(10_000)
  })

  it("forceInterview records a pass once and opens the job", () => {
    expect(useGame.getState().forceInterview(THREE_TIER.id)).toBe(true)
    expect(useGame.getState().forceInterview(THREE_TIER.id)).toBe(false)
    expect(useGame.getState().forceInterview("nope")).toBe(false)
    expect(jobState(useGame.getState(), junior)).toBe("ready")
    expect(lastLog()).toMatchObject({ type: "interview", ref: "interview:3-tier-app", verdict: "hire" })
  })
})
