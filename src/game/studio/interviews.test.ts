import { beforeEach, describe, expect, it } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { JOB_TIERS } from "../../data/phases.ts"
import { careerJson } from "../careerLog.ts"
import { jobState } from "../phase.ts"
import { useGame } from "../store.ts"
import { bandsByJob, betterBest, interviewById, interviewForJob, isPass, noHirePenalty, offerFor, parseInterviews, SIGNING_BONUS_MINUTES } from "./interviews.ts"

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

describe("practice", () => {
  const empty = { nodes: [], edges: [] }
  const snapshot = () => {
    const s = useGame.getState()
    return [s.xp, s.xpTotal, s.jobs, s.journal, s.lastInterview, s.money]
  }

  beforeEach(() => atJuniorInterview(10_000))

  it("is refused on an interview that is still open", () => {
    const before = snapshot()
    const interviews = useGame.getState().interviews
    expect(useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.reference)).toBeNull()
    expect(snapshot()).toEqual(before)
    expect(useGame.getState().interviews).toBe(interviews)
    expect(useGame.getState().practiceWhiteboard("no-such-interview", THREE_TIER.reference)).toBeNull()
    // Locked interviews are refused too: 3-tier with too little lifetime XP.
    useGame.setState({ xpTotal: 44_999 })
    expect(useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.reference)).toBeNull()
  })

  it("a miss on a passed interview takes no XP, adds no journal entry, and keeps the verdict, attempts and jobs", () => {
    useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.reference)
    useGame.setState({ jobs: [1, 2] })
    const record = useGame.getState().interviews[THREE_TIER.id]
    const before = snapshot()
    const run = useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)
    expect(run?.verdict.kind).toBe("noHire")
    expect(run?.newBest).toBe(false)
    expect(snapshot()).toEqual(before)
    expect(useGame.getState().interviews[THREE_TIER.id]).toBe(record)
    expect(record).toMatchObject({ verdict: "hire", attempts: 1 })
  })

  it("a pass adds no second interview note", () => {
    useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.reference)
    const notes = () => useGame.getState().journal.entries.filter((entry) => entry.type === "interview")
    expect(notes()).toHaveLength(1)
    useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.strongHire)
    expect(notes()).toHaveLength(1)
    expect(useGame.getState().interviews[THREE_TIER.id]).toMatchObject({ verdict: "hire", attempts: 1 })
  })

  it("keeps the cheaper passing run as the best and ignores a dearer one", () => {
    useGame.getState().submitWhiteboard(THREE_TIER.id, THREE_TIER.reference)
    const first = useGame.getState().interviews[THREE_TIER.id]?.best
    expect(first?.design.nodes.length).toBe(THREE_TIER.reference.nodes.length)
    const cheaper = useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.strongHire)
    expect(cheaper?.newBest).toBe(true)
    const best = useGame.getState().interviews[THREE_TIER.id]?.best
    expect(best?.costPerMonth).toBeLessThan(first?.costPerMonth ?? 0)
    expect(best?.design.nodes.length).toBe(THREE_TIER.strongHire.nodes.length)
    const dearer = useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.reference)
    expect(dearer?.newBest).toBe(false)
    expect(useGame.getState().interviews[THREE_TIER.id]?.best).toBe(best)
    // A miss never becomes the best, however cheap.
    const miss = useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)
    expect(miss?.newBest).toBe(false)
    expect(useGame.getState().interviews[THREE_TIER.id]?.best).toBe(best)
  })

  it("a job held from a save with no record can practice and gets a record with no verdict and no pass note", () => {
    useGame.setState({ jobs: [1, 2], interviews: {} })
    const notes = useGame.getState().journal.entries.length
    const run = useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.reference)
    expect(run?.newBest).toBe(true)
    const record = useGame.getState().interviews[THREE_TIER.id]
    expect(record).toMatchObject({ verdict: null, attempts: 0, design: empty })
    expect(record?.best?.costPerMonth).toBeGreaterThan(0)
    expect(useGame.getState().journal.entries).toHaveLength(notes)
    // The held job still counts as passed.
    expect(useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.naive[0].design)).not.toBeNull()
  })

  it("an interview that only has a best is not a pass", () => {
    expect(isPass(null)).toBe(false)
    useGame.setState({ jobs: [1, 2] })
    useGame.getState().practiceWhiteboard(THREE_TIER.id, THREE_TIER.reference)
    expect(useGame.getState().forceInterview(THREE_TIER.id)).toBe(true)
    expect(useGame.getState().interviews[THREE_TIER.id]).toMatchObject({ verdict: "hire", best: expect.anything() })
  })

  it("ranks by cost, then p95", () => {
    const a = { design: empty, costPerMonth: 100, p95Ms: 50 }
    expect(betterBest(undefined, a)).toBe(true)
    expect(betterBest(a, { ...a, costPerMonth: 99, p95Ms: 90 })).toBe(true)
    expect(betterBest(a, { ...a, costPerMonth: 101, p95Ms: 1 })).toBe(false)
    expect(betterBest(a, { ...a, p95Ms: 49 })).toBe(true)
    expect(betterBest(a, a)).toBe(false)
  })

  it("loads a null verdict and a best, and drops a verdict outside the set", () => {
    const best = { design: THREE_TIER.reference, costPerMonth: 700, p95Ms: 40 }
    const log = parseInterviews({
      [THREE_TIER.id]: { verdict: null, attempts: 0, design: empty, best },
      [HELLO.id]: { verdict: "maybe", attempts: 1, design: empty },
      "static-site": { verdict: "hire", attempts: 2, design: empty, best: { design: empty, costPerMonth: "x", p95Ms: 1 } },
    })
    expect(Object.keys(log).sort()).toEqual([THREE_TIER.id, "static-site"].sort())
    expect(log[THREE_TIER.id]).toMatchObject({ verdict: null, best: { costPerMonth: 700, p95Ms: 40 } })
    expect(log["static-site"]).toEqual({ verdict: "hire", attempts: 2, design: empty, asked: [], nudges: [], hints: [] })
  })
})

describe("questions, nudges, hints and offers", () => {
  const intern = JOB_TIERS.find((job) => job.id === 1)!
  const state = () => useGame.getState()
  const records = () => state().interviews
  /** A career at the Job Board with the internship's interview open. */
  const atHelloServer = () => {
    state().wipe()
    useGame.setState({ xp: 10_000, xpTotal: 40_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [] })
  }
  const kindOf = (design: typeof HELLO.reference) => state().submitWhiteboard(HELLO.id, design)?.kind

  beforeEach(atHelloServer)

  it("offerFor: a Strong hire with no hints tops the band and signs 30 minutes of salary, a Hire lands mid, any hint drops to the bottom", () => {
    expect(offerFor("strongHire", 0, 8)).toEqual({ band: "top", bonus: SIGNING_BONUS_MINUTES * 60 * 8 })
    expect(offerFor("hire", 0, 8)).toEqual({ band: "mid", bonus: 0 })
    expect(offerFor("strongHire", 1, 8)).toEqual({ band: "bottom", bonus: 0 })
    expect(offerFor("hire", 3, 8)).toEqual({ band: "bottom", bonus: 0 })
  })

  it("a Strong hire with no hints pays the signing bonus once, as money, and logs the band", () => {
    const money = state().money
    const kind = kindOf(HELLO.strongHire)
    expect(kind).toBe("strongHire")
    expect(records()[HELLO.id]?.offer).toEqual({ band: "top", bonus: 1800 * intern.cps })
    expect(state().money).toBe(money + 1800 * intern.cps)
    expect(state().stats.lifetimeEarned).toBeGreaterThanOrEqual(1800 * intern.cps)
    expect(lastLog()).toMatchObject({ type: "interview", ref: "interview:hello-server", verdict: "strongHire", band: "top" })
    expect(bandsByJob(records())).toEqual({ 1: "top" })
  })

  it("a Hire with no hints lands mid and pays no bonus", () => {
    atJuniorInterview(10_000)
    const money = state().money
    expect(state().submitWhiteboard(THREE_TIER.id, THREE_TIER.reference)?.kind).toBe("hire")
    expect(records()[THREE_TIER.id]?.offer).toEqual({ band: "mid", bonus: 0 })
    expect(state().money).toBe(money)
  })

  it("a pass after a paid hint is down-leveled with no bonus, even a Strong hire", () => {
    expect(state().takeHint(HELLO.id, { nodes: [{ id: "users", kind: "users", replicas: 1 }], edges: [] })).toBe("Add an API server (Hamster Wheel API).")
    const money = state().money
    expect(kindOf(HELLO.strongHire)).toBe("strongHire")
    expect(records()[HELLO.id]?.offer).toEqual({ band: "bottom", bonus: 0 })
    expect(state().money).toBe(money)
    expect(lastLog()).toMatchObject({ band: "bottom" })
  })

  it("questions and nudges are free, idempotent, and never touch the offer, the journal or the XP", () => {
    const before = [state().xp, state().money, state().journal]
    expect(state().askInterviewer(HELLO.id, "budget")).toBe(true)
    expect(state().askInterviewer(HELLO.id, "budget")).toBe(true)
    expect(state().askInterviewer(HELLO.id, "traffic")).toBe(true)
    expect(state().takeNudge(HELLO.id, "success")).toBe(true)
    expect(state().takeNudge(HELLO.id, "success")).toBe(true)
    expect(records()[HELLO.id]).toMatchObject({ verdict: null, attempts: 0, asked: ["budget", "traffic"], nudges: ["success"], hints: [] })
    expect([state().xp, state().money, state().journal]).toEqual(before)
    kindOf(HELLO.strongHire)
    expect(records()[HELLO.id]?.offer?.band).toBe("top")
  })

  it("refuses a question the interview does not ask, a nudge it has none for, and an interview not reached", () => {
    expect(state().askInterviewer(HELLO.id, "lag")).toBe(false)
    expect(state().takeNudge(HELLO.id, "lag")).toBe(false)
    expect(state().askInterviewer("no-such-interview", "budget")).toBe(false)
    expect(state().askInterviewer(THREE_TIER.id, "budget")).toBe(false)
    expect(state().takeNudge(THREE_TIER.id, "faults")).toBe(false)
    expect(state().takeHint(THREE_TIER.id, THREE_TIER.reference)).toBeNull()
    expect(records()).toEqual({})
  })

  it("a passed interview can still be asked and nudged, but hints are only for an open one", () => {
    kindOf(HELLO.reference)
    useGame.setState({ jobs: [1] })
    expect(state().askInterviewer(HELLO.id, "speed")).toBe(true)
    expect(state().takeNudge(HELLO.id, "budget")).toBe(true)
    expect(state().takeHint(HELLO.id, { nodes: [], edges: [] })).toBeNull()
    expect(records()[HELLO.id]).toMatchObject({ asked: ["speed"], nudges: ["budget"], hints: [] })
  })

  it("a hint is stored once, as the line shown, and is null when the board covers the reference", () => {
    const alone = { nodes: [{ id: "users", kind: "users" as const, replicas: 1 }], edges: [] }
    const line = state().takeHint(HELLO.id, alone)
    expect(state().takeHint(HELLO.id, alone)).toBe(line)
    expect(records()[HELLO.id]?.hints).toEqual([line])
    expect(state().takeHint(HELLO.id, HELLO.reference)).toBeNull()
    expect(records()[HELLO.id]?.hints).toEqual([line])
  })

  it("a No hire tells the missed requirement for free and a retry keeps every answer, nudge and hint", () => {
    state().askInterviewer(HELLO.id, "traffic")
    state().takeNudge(HELLO.id, "budget")
    const hint = state().takeHint(HELLO.id, HELLO.naive[0].design)
    expect(hint).not.toBeNull()
    const [noDb, enterprise] = HELLO.naive
    expect(kindOf(noDb.design)).toBe("noHire")
    expect(records()[HELLO.id]).toMatchObject({ attempts: 1, asked: ["traffic", "speed", "uptime"], nudges: ["budget"], hints: [hint] })
    expect(kindOf(enterprise.design)).toBe("noHire")
    expect(records()[HELLO.id]).toMatchObject({ attempts: 2, asked: ["traffic", "speed", "uptime", "budget"], nudges: ["budget"], hints: [hint] })
    expect(kindOf(HELLO.strongHire)).toBe("strongHire")
    expect(records()[HELLO.id]?.offer).toEqual({ band: "bottom", bonus: 0 })
  })

  it("practice after the pass never changes the offer, and neither does forceInterview", () => {
    kindOf(HELLO.strongHire)
    useGame.setState({ jobs: [1] })
    const offer = records()[HELLO.id]?.offer
    const money = state().money
    state().practiceWhiteboard(HELLO.id, HELLO.reference)
    state().practiceWhiteboard(HELLO.id, HELLO.naive[0].design)
    state().askInterviewer(HELLO.id, "budget")
    expect(records()[HELLO.id]?.offer).toBe(offer)
    expect(state().money).toBe(money)
    expect(state().forceInterview(HELLO.id)).toBe(false)
  })

  it("forceInterview keeps what was asked, nudged and hinted, and never invents an offer", () => {
    state().askInterviewer(HELLO.id, "uptime")
    state().takeNudge(HELLO.id, "success")
    const hint = state().takeHint(HELLO.id, { nodes: [], edges: [] })
    expect(state().forceInterview(HELLO.id)).toBe(true)
    expect(records()[HELLO.id]).toMatchObject({ verdict: "hire", asked: ["uptime"], nudges: ["success"], hints: [hint] })
    expect(records()[HELLO.id]?.offer).toBeUndefined()
    expect(lastLog()).toMatchObject({ type: "interview", verdict: "hire" })
    expect(lastLog()).not.toHaveProperty("band")
  })

  it("loads asked, nudges, hints and offer, drops unknown ones and a broken offer", () => {
    const log = parseInterviews({
      [HELLO.id]: {
        verdict: "hire",
        attempts: 1,
        design: { nodes: [], edges: [] },
        asked: ["budget", "nope", "budget", 7, "traffic"],
        nudges: ["p95", "bogus"],
        hints: ["Add an API server.", "", 4],
        offer: { band: "top", bonus: 14_400 },
      },
      [THREE_TIER.id]: { verdict: null, attempts: 0, design: { nodes: [], edges: [] }, offer: { band: "huge", bonus: 5 } },
    })
    expect(log[HELLO.id]).toEqual({
      verdict: "hire",
      attempts: 1,
      design: { nodes: [], edges: [] },
      asked: ["budget", "traffic"],
      nudges: ["p95"],
      hints: ["Add an API server."],
      offer: { band: "top", bonus: 14_400 },
    })
    expect(log[THREE_TIER.id]).toEqual({ verdict: null, attempts: 0, design: { nodes: [], edges: [] }, asked: [], nudges: [], hints: [] })
  })
})
