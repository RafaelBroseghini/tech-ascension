import { beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { CAPITAL_UNLOCK, EQUIPMENT, GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, MONEY_POP, SKILL_TIERS } from "../data/phases.ts"
import { clickFlat, clickPower, gigById, idlePerSec, jobById, nextCost, ownedCount } from "./economy.ts"
import {
  canBuyJob,
  capitalUnlocked,
  gigBoardUnlocked,
  gigState,
  jobBoardUnlocked,
  jobState,
  clickPaysMoney,
  moneyMode,
  phaseOf,
  stageOf,
} from "./phase.ts"
import { useGame } from "./store.ts"
import { interviewForJob, NO_RECORD } from "./studio/interviews.ts"
import type { InterviewLog } from "./studio/interviews.ts"

const EMPTY = { xpTotal: 0, peakMoney: 0, skills: {}, owned: {}, jobs: [] as number[], gigs: [] as number[], interviews: {} as InterviewLog }

/** A passed record for the interview that gates `jobId`. */
function passed(jobId: number): InterviewLog {
  const interview = interviewForJob(jobId)
  if (!interview) throw new Error(`job ${jobId} has no interview`)
  return { [interview.id]: { ...NO_RECORD, verdict: "hire", attempts: 1, design: interview.reference } }
}

describe("phase gates", () => {
  it("opens the Gig Board at 14K lifetime XP with Portfolio (#15) and React (#16) owned", () => {
    expect(GIG_BOARD_UNLOCK).toEqual({ minXp: 14000, requireOwnedSkills: [15, 16] })
    const skills = { "15": 1, "16": 1 }
    expect(gigBoardUnlocked(EMPTY)).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: 14_000 })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: 14_000, skills: { "15": 1 } })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: 14_000, skills: { "16": 1 } })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: 13_999, skills })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: 14_000, skills })).toBe(true)
  })

  it("opens the Job Board at 40K lifetime XP and 6 completed gigs", () => {
    expect(JOB_BOARD_UNLOCK).toEqual({ minXp: 40000, minGigsCompleted: 6 })
    expect(jobBoardUnlocked({ ...EMPTY, xpTotal: 40_000, gigs: [1, 2, 3, 4, 5] })).toBe(false)
    expect(jobBoardUnlocked({ ...EMPTY, xpTotal: 39_999, gigs: [1, 2, 3, 4, 5, 6] })).toBe(false)
    expect(jobBoardUnlocked({ ...EMPTY, xpTotal: 40_000, gigs: [1, 2, 3, 4, 5, 6] })).toBe(true)
  })

  it("opens capital on the Senior job (id >= 14) OR $500K held, and stays open once you own capital", () => {
    expect(CAPITAL_UNLOCK).toEqual({ minJobId: 14, minMoney: 500_000 })
    expect(capitalUnlocked(EMPTY)).toBe(false)
    expect(capitalUnlocked({ ...EMPTY, jobs: [1, 2, 3, 4, 5, 6, 13] })).toBe(false)
    expect(capitalUnlocked({ ...EMPTY, jobs: [14] })).toBe(true)
    expect(capitalUnlocked({ ...EMPTY, jobs: [31] })).toBe(true)
    expect(capitalUnlocked({ ...EMPTY, peakMoney: 499_999 })).toBe(false)
    expect(capitalUnlocked({ ...EMPTY, peakMoney: 500_000 })).toBe(true)
    expect(capitalUnlocked({ ...EMPTY, owned: { "1": 1 } })).toBe(true)
  })

  it("reports the furthest phase and never skips the gates", () => {
    expect(phaseOf(EMPTY)).toBe("A")
    expect(phaseOf({ ...EMPTY, xpTotal: 14_000, skills: { "15": 1, "16": 1 } })).toBe("B")
    expect(phaseOf({ ...EMPTY, xpTotal: 40_000, gigs: [1, 2, 3, 4, 5, 6] })).toBe("C")
    expect(phaseOf({ ...EMPTY, xpTotal: 40_000, gigs: [1, 2, 3, 4, 5, 6], jobs: [14] })).toBe("D")
    expect(phaseOf({ ...EMPTY, peakMoney: 600_000 })).toBe("D")
  })

  it("opens cash events once money exists, but click dollars wait for a job", () => {
    expect(moneyMode({ peakMoney: 0, gigs: [], jobs: [] })).toBe(false)
    expect(moneyMode({ peakMoney: 0, gigs: [1], jobs: [] })).toBe(true)
    expect(moneyMode({ peakMoney: 1, gigs: [], jobs: [] })).toBe(true)
    expect(clickPaysMoney({ jobs: [] })).toBe(false)
    expect(clickPaysMoney({ jobs: [1] })).toBe(true)
  })

  it("gates each gig on XP, earlier gigs, and a skill set that grows with the gig", () => {
    const gig = gigById(4)
    if (!gig) throw new Error("missing gig 4")
    const skills = { "15": 1, "16": 1, ...Object.fromEntries(gig.skillIds.map((id) => [String(id), 1])) }
    const open = { ...EMPTY, xpTotal: gig.xpReq, skills }
    const cleared = [1, 2, 3]
    expect(gigState(EMPTY, gig)).toBe("board-locked")
    expect(gigState(open, gig)).toBe("locked")
    expect(gigState({ ...open, gigs: [1, 2] }, gig)).toBe("locked")
    expect(gigState({ ...open, gigs: cleared }, gig)).toBe("ready")
    expect(gigState({ ...open, xpTotal: gig.xpReq - 1, gigs: cleared }, gig)).toBe("locked")
    expect(gigState({ ...open, skills: { "15": 1, "16": 1 }, gigs: cleared }, gig)).toBe("locked")
    expect(gigState({ ...open, gigs: [...cleared, 4] }, gig)).toBe("done")
  })

  it("makes each gig strictly harder than the one before it", () => {
    for (let index = 1; index < GIGS.length; index++) {
      const prev = GIGS[index - 1]
      const gig = GIGS[index]
      if (!prev || !gig) throw new Error("missing gig")
      expect(gig.xpReq).toBeGreaterThan(prev.xpReq)
      expect(gig.xpReq).toBeGreaterThan(0)
      expect(gig.priorGigs).toBe(gig.id - 1)
      expect(gig.skillIds.length).toBeGreaterThanOrEqual(prev.skillIds.length)
      for (const id of prev.skillIds) expect(gig.skillIds).toContain(id)
      if (prev.skillIds.length < SKILL_TIERS.length) expect(gig.skillIds.length).toBe(prev.skillIds.length + 1)
    }
    expect(GIGS[0]?.skillIds.length).toBeGreaterThanOrEqual(6)
  })

  it("gates jobs on the board, lifetime XP and the price", () => {
    const junior = jobById(2)
    if (!junior) throw new Error("missing job 2")
    const board = { ...EMPTY, xpTotal: 45_000, gigs: [1, 2, 3, 4, 5, 6], interviews: passed(2) }
    expect(jobState(EMPTY, junior)).toBe("board-locked")
    expect(jobState({ ...board, xpTotal: 44_999 }, junior)).toBe("locked")
    expect(jobState(board, junior)).toBe("ready")
    expect(canBuyJob({ ...board, xp: junior.xpCost - 1 }, junior)).toBe(false)
    expect(canBuyJob({ ...board, xp: junior.xpCost }, junior)).toBe(true)
    expect(jobState({ ...board, jobs: [2] }, junior)).toBe("owned")
  })

  it("a job with an interview is not ready until it is passed", () => {
    const junior = jobById(2)!
    const board = { ...EMPTY, xpTotal: 45_000, xp: 1e6, gigs: [1, 2, 3, 4, 5, 6] }
    expect(jobState({ ...board, xpTotal: 44_999 }, junior)).toBe("locked")
    expect(jobState(board, junior)).toBe("interview")
    expect(canBuyJob(board, junior)).toBe(false)
    const failed: InterviewLog = { "3-tier-app": { ...NO_RECORD, verdict: "noHire", attempts: 3 } }
    expect(jobState({ ...board, interviews: failed }, junior)).toBe("interview")
    expect(jobState({ ...board, interviews: passed(2) }, junior)).toBe("ready")
    expect(canBuyJob({ ...board, interviews: passed(2) }, junior)).toBe(true)
    // Job 3 has no interview, so lifetime XP is its only gate.
    expect(jobState({ ...board, xpTotal: 50_000 }, jobById(3)!)).toBe("ready")
  })

  it("a held job counts its interview as passed", () => {
    const senior = jobById(14)!
    const board = { ...EMPTY, xpTotal: 160_000, gigs: [1, 2, 3, 4, 5, 6] }
    expect(jobState(board, senior)).toBe("interview")
    expect(jobState({ ...board, jobs: [14] }, senior)).toBe("owned")
    // Holding a later job latches every interview at or below it, so forced progress never re-locks one.
    for (const id of [1, 2, 6, 7, 10, 12]) expect(jobState({ ...board, jobs: [14] }, jobById(id)!)).toBe("ready")
    expect(jobState({ ...board, xpTotal: 220_000, jobs: [14] }, jobById(16)!)).toBe("interview")
    // A job with no interview never latches one: holding job 15 leaves Senior SWE's whiteboard to pass.
    expect(jobState({ ...board, xpTotal: 200_000, jobs: [15] }, senior)).toBe("interview")
    expect(capitalUnlocked({ ...board, jobs: [14] })).toBe(true)
  })

  it("picks the stage art from the furthest thing held", () => {
    const none = { skills: {}, owned: {}, jobs: [] as number[], gigs: [] as number[] }
    expect(stageOf(none)).toBeNull()
    expect(stageOf({ ...none, skills: { "1": 1 } })).toMatchObject({ artId: 1, name: "Used laptop", era: "early" })
    expect(stageOf({ ...none, skills: { "1": 1 }, gigs: [2] })?.name).toBe("Freelancer")
    expect(stageOf({ ...none, gigs: [2], jobs: [7] })?.name).toBe("Mid-level SWE")
    expect(stageOf({ ...none, jobs: [7], owned: { "1": 1 } })).toMatchObject({ artId: 25, era: "mid" })
  })
})

describe("phase tables", () => {
  it("ships 104 skills, 65 gigs and 31 jobs with contiguous ids", () => {
    expect(SKILL_TIERS).toHaveLength(104)
    expect(GIGS).toHaveLength(65)
    expect(JOB_TIERS).toHaveLength(31)
    SKILL_TIERS.forEach((row, index) => {
      expect(row.id).toBe(index + 1)
      if (index > 11 && index < 50) expect(row.baseXpCost).toBeGreaterThan(SKILL_TIERS[index - 1]?.baseXpCost ?? 0)
    })
    JOB_TIERS.forEach((row, index) => expect(row.id).toBe(index + 1))
  })

  it("has exactly one first idle source among the gigs, and it is a retainer", () => {
    const retainers = GIGS.filter((gig) => gig.retainerCps > 0)
    expect(retainers[0]?.id).toBe(8)
    expect(GIGS.filter((gig) => gig.priorGigs < 3).every((gig) => gig.retainerCps === 0)).toBe(true)
  })

  it("makes large pops for gig clear and unlock, and a medium pop for a click", () => {
    expect(MONEY_POP).toEqual({ click: "medium", gigClear: "large", unlock: "large" })
  })
})

describe("phase A: XP only", () => {
  beforeEach(() => useGame.getState().wipe())

  it("pays clicks in XP only and has no $/s yet", () => {
    const game = useGame.getState()
    const gain = game.click()
    expect(gain).toEqual({ money: 0, xp: 1 })
    for (let i = 0; i < 9; i++) useGame.getState().click()
    const state = useGame.getState()
    expect(state.xp).toBe(10)
    expect(state.xpTotal).toBe(10)
    expect(state.money).toBe(0)
    expect(state.pop).toBeNull()
    expect(idlePerSec(state)).toBe(0)
  })

  it("buys skills with XP only and keeps lifetime XP when spending", () => {
    const skillCost = SKILL_TIERS[0]?.firstXpCost ?? 0
    useGame.setState({ money: 0, xp: skillCost, xpTotal: skillCost })
    useGame.getState().buySkill(1)
    let state = useGame.getState()
    expect(ownedCount(state.skills, 1)).toBe(1)
    expect(state.xp).toBe(0)
    expect(state.xpTotal).toBe(skillCost)
    expect(state.money).toBe(0)

    const paid = useGame.getState().click()
    expect(paid.xp).toBe(2)
    expect(paid.money).toBe(0)
    useGame.getState().buySkill(1)
    state = useGame.getState()
    expect(ownedCount(state.skills, 1)).toBe(1)

    // Max is a gold skill; without it a "max" request still buys one copy.
    useGame.setState({ xp: 10_000 })
    useGame.getState().buySkill(1, "max")
    expect(ownedCount(useGame.getState().skills, 1)).toBe(2)
    useGame.setState({ gold: [1, 3, 6] })
    useGame.getState().buySkill(1, "max")
    expect(ownedCount(useGame.getState().skills, 1)).toBeGreaterThan(5)
    expect(nextCost(10, 2)).toBe(13)
  })

  it("never lets money pay for a skill", () => {
    useGame.setState({ money: 1e9, xp: 0 })
    useGame.getState().buySkill(1)
    expect(ownedCount(useGame.getState().skills, 1)).toBe(0)
  })

  it("studies while idle: skills add XP/s and idle time still adds no money", () => {
    useGame.setState({ skills: { "2": 5 } })
    const before = useGame.getState()
    useGame.getState().tick(before.now + 10_000)
    const after = useGame.getState()
    const studied = 5 * (SKILL_TIERS[1]?.xpPerSec ?? 0) * 10
    expect(after.xp - before.xp).toBeCloseTo(studied)
    expect(after.xpTotal - before.xpTotal).toBeCloseTo(studied)
    expect(after.money).toBe(0)
  })

  it("a boost multiplies both the XP and the money a click pays once a job is held", () => {
    useGame.setState({ jobs: [1], activeBoost: { mult: 5, endsAt: Date.now() + 10_000 } })
    const gain = useGame.getState().click()
    expect(gain.xp).toBe(5)
    expect(gain.money).toBeCloseTo(clickPower(useGame.getState()) * 5)
  })

  it("will not sell the next skill until lifetime XP reaches it", () => {
    const second = SKILL_TIERS[1]
    if (!second) throw new Error("missing skill 2")
    useGame.setState({ xp: second.baseXpCost, xpTotal: Math.max(0, second.unlockAtXp - 1) })
    useGame.getState().buySkill(second.id)
    expect(ownedCount(useGame.getState().skills, second.id)).toBe(0)
    useGame.setState({ xpTotal: second.unlockAtXp })
    useGame.getState().buySkill(second.id)
    expect(ownedCount(useGame.getState().skills, second.id)).toBe(1)
  })

  it("opens the Gig Board with a large unlock pop exactly once", () => {
    useGame.setState({ xp: 20_000, xpTotal: 20_000, skills: { "15": 1 } })
    expect(useGame.getState().phase).toBe("A")
    useGame.setState({ skills: { "15": 1, "16": 1 } })
    const state = useGame.getState()
    expect(state.phase).toBe("B")
    expect(state.pop).toMatchObject({ kind: "unlock", size: "large", amount: 0 })
    expect(state.toast?.text).toBe("Gig Board unlocked")
    const id = state.pop?.id
    useGame.getState().tick(state.now + 1_000)
    expect(useGame.getState().pop?.id).toBe(id)
    expect(useGame.getState().phase).toBe("B")
  })
})

describe("phase B: gigs", () => {
  beforeEach(() => {
    useGame.getState().wipe()
    useGame.setState({
      xp: 14_000,
      xpTotal: 14_000,
      skills: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 1])),
    })
  })

  it("pays the lump on clear with a large pop; clicks stay XP-only until a job", () => {
    expect(useGame.getState().phase).toBe("B")
    const primed = useGame.getState().click()
    expect(primed.money).toBe(0)
    expect(primed.xp).toBeGreaterThan(0)
    expect(useGame.getState().clearGig(1)).toBe(true)
    const state = useGame.getState()
    expect(state.money).toBe(40)
    expect(state.gigs).toEqual([1])
    expect(state.pop).toMatchObject({ kind: "gigClear", size: "large", amount: 40, label: "Fix broken login / blog-engine bug" })
    expect(idlePerSec(state)).toBe(0)

    const gain = useGame.getState().click()
    expect(gain.money).toBe(0)
    expect(gain.xp).toBeGreaterThan(0)
    expect(useGame.getState().money).toBe(40)
    expect(useGame.getState().pop?.kind).toBe("gigClear")
  })

  it("clears each gig once, and only when XP and prior gigs allow", () => {
    expect(useGame.getState().clearGig(1)).toBe(true)
    expect(useGame.getState().clearGig(1)).toBe(false)
    expect(useGame.getState().clearGig(3)).toBe(false)
    expect(useGame.getState().clearGig(2)).toBe(true)
    expect(useGame.getState().clearGig(3)).toBe(false)
    useGame.setState({ xpTotal: 14_500 })
    expect(useGame.getState().clearGig(3)).toBe(true)
    expect(useGame.getState().money).toBe(40 + 120 + 90)
    expect(useGame.getState().clearGig(9999)).toBe(false)
  })

  it("forceGig skips the requirements but not the one-clear rule", () => {
    expect(useGame.getState().clearGig(17, true)).toBe(true)
    expect(useGame.getState().money).toBe(1200)
    expect(useGame.getState().clearGig(17, true)).toBe(false)
  })

  it("a retainer is the first idle money, paid per second", () => {
    useGame.setState({ xpTotal: 25_000 })
    for (let id = 1; id < 8; id++) expect(useGame.getState().clearGig(id, true)).toBe(true)
    expect(idlePerSec(useGame.getState())).toBe(0)
    expect(useGame.getState().clearGig(8)).toBe(true)
    const before = useGame.getState()
    expect(idlePerSec(before)).toBe(2)
    expect(before.money).toBe(GIGS.filter((gig) => gig.id <= 8).reduce((sum, gig) => sum + gig.lump, 0))
    useGame.getState().tick(before.now + 10_000)
    expect(useGame.getState().money - before.money).toBeCloseTo(20)
  })
})

describe("phase C: jobs and equipment", () => {
  beforeEach(() => {
    useGame.getState().wipe()
    useGame.setState({ xp: 40_000, xpTotal: 40_000, skills: { "15": 1, "16": 1 } })
    for (let id = 1; id <= 6; id++) useGame.getState().clearGig(id, true)
    useGame.setState({ money: 0 })
  })

  it("opens the Job Board and unlocks with a large pop", () => {
    const state = useGame.getState()
    expect(state.phase).toBe("C")
    expect(state.pop).toMatchObject({ kind: "unlock", size: "large" })
    expect(state.toast?.text).toBe("Job Board unlocked")
  })

  it("takes the free internship, then salaried roles that add $/s", () => {
    expect(useGame.getState().buyJob(1)).toBe(false)
    expect(useGame.getState().forceInterview("hello-server")).toBe(true)
    expect(useGame.getState().buyJob(1)).toBe(true)
    expect(useGame.getState().jobs).toEqual([1])
    expect(idlePerSec(useGame.getState())).toBe(8)
    expect(useGame.getState().buyJob(1)).toBe(false)

    expect(useGame.getState().buyJob(2)).toBe(false)
    const juniorCost = JOB_TIERS[1]?.xpCost ?? 0
    useGame.setState({ xpTotal: 45_000, xp: juniorCost - 1 })
    useGame.getState().forceInterview("3-tier-app")
    expect(useGame.getState().buyJob(2)).toBe(false)
    useGame.setState({ xp: juniorCost })
    expect(useGame.getState().buyJob(2)).toBe(true)
    expect(useGame.getState().money).toBe(0)
    expect(idlePerSec(useGame.getState())).toBe(8 + 25)
  })

  it("pays a teaching job's lump of XP once, on hire, and lifetime XP rises with it", () => {
    const internship = jobById(1)!
    expect(internship.xpLump).toBeGreaterThan(0)
    useGame.getState().forceInterview("hello-server")
    const before = useGame.getState()
    expect(useGame.getState().buyJob(1)).toBe(true)
    const hired = useGame.getState()
    expect(hired.xp - before.xp).toBe(internship.xpLump)
    expect(hired.xpTotal - before.xpTotal).toBe(internship.xpLump)
    expect(useGame.getState().buyJob(1)).toBe(false)
    expect(useGame.getState().xp).toBe(hired.xp)
  })

  it("leaves XP alone for a job with no lump, and lets a lump carry lifetime XP past the next gate", () => {
    const junior = jobById(2)!
    expect(junior.xpLump).toBe(0)
    useGame.setState({ xp: junior.xpCost + 5, xpTotal: 45_000 })
    useGame.getState().forceInterview("3-tier-app")
    expect(useGame.getState().buyJob(2)).toBe(true)
    expect(useGame.getState().xp).toBe(5)
    expect(useGame.getState().xpTotal).toBe(45_000)

    // The mentor-buddy job asks for 50,000 lifetime XP; the internship's lump closes the last 1,400.
    useGame.getState().wipe()
    useGame.setState({ xp: 48_600, xpTotal: 48_600, money: 1e6, gigs: [1, 2, 3, 4, 5, 6] })
    expect(useGame.getState().buyJob(3)).toBe(false)
    useGame.getState().forceInterview("hello-server")
    expect(useGame.getState().buyJob(1)).toBe(true)
    expect(useGame.getState().buyJob(3)).toBe(true)
  })

  it("won't sell a job below its XP requirement even when the money is there", () => {
    useGame.setState({ money: 1e6 })
    expect(useGame.getState().buyJob(5)).toBe(false)
    expect(useGame.getState().buyJob(8)).toBe(false)
  })

  it("jobs keep a click worth a slice of $/s on top of the flat part", () => {
    const jobs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    const p = { equipment: {}, owned: { "5": 10 }, jobs, gigs: [] as number[] }
    const pct = jobs.reduce((sum, id) => sum + jobById(id)!.clickPct, 0)
    const flat = 1 + jobs.reduce((sum, id) => sum + jobById(id)!.clickBonus, 0)
    expect(clickFlat(p)).toBe(flat)
    expect(clickPower(p)).toBeCloseTo(flat + (pct / 100) * idlePerSec(p))
    // By Senior SWE a click is worth over a fifth of a second of the whole empire's income.
    expect(clickPower(p) / idlePerSec(p)).toBeGreaterThan(0.2)
    expect(clickPower({ ...p, jobs: [] })).toBe(1)
  })

  it("equipment is repeatable at 1.15 growth and adds click power and idle", () => {
    useGame.getState().forceInterview("hello-server")
    useGame.getState().buyJob(1)
    useGame.setState({ money: 1_000_000 })
    useGame.getState().buyEquipment(1)
    useGame.getState().buyEquipment(1)
    const keyboard = EQUIPMENT[0]?.baseCost ?? 0
    expect(useGame.getState().money).toBe(1_000_000 - keyboard - nextCost(keyboard, 1))
    // Base $1, two keyboards at +$2, the intern's +$2, and 1% of the $/s.
    const intern = jobById(1)!
    expect(clickFlat(useGame.getState())).toBe(1 + 2 * 2 + intern.clickBonus)
    expect(useGame.getState().click().money).toBeCloseTo(1 + 2 * 2 + intern.clickBonus + (intern.clickPct / 100) * idlePerSec(useGame.getState()))
    useGame.getState().buyEquipment(17)
    expect(idlePerSec(useGame.getState())).toBe(8 + 2)
  })

  it("keeps gear shut until 10,000 lifetime XP", () => {
    useGame.getState().wipe()
    useGame.setState({ money: 1e6, xpTotal: 9_999 })
    useGame.getState().buyEquipment(1)
    expect(ownedCount(useGame.getState().equipment, 1)).toBe(0)
    useGame.setState({ xpTotal: 10_000 })
    useGame.getState().buyEquipment(1)
    expect(ownedCount(useGame.getState().equipment, 1)).toBe(1)
  })
})

describe("phase D: capital", () => {
  beforeEach(() => useGame.getState().wipe())

  it("refuses capital until a senior job or $500K, then sells it with 1.15 growth", () => {
    useGame.setState({ money: 499_999, peakMoney: 499_999 })
    useGame.getState().buy(1)
    expect(ownedCount(useGame.getState().owned, 1)).toBe(0)
    expect(useGame.getState().phase).toBe("A")

    useGame.setState({ money: 500_000 })
    expect(useGame.getState().phase).toBe("D")
    expect(useGame.getState().pop).toMatchObject({ kind: "unlock", size: "large" })
    useGame.getState().buy(1)
    useGame.getState().buy(1)
    const state = useGame.getState()
    expect(ownedCount(state.owned, 1)).toBe(2)
    const seat = CAPITAL[0]?.baseCost ?? 0
    expect(state.money).toBe(500_000 - seat - nextCost(seat, 1))
    expect(idlePerSec(state)).toBe(100)
  })

  it("a senior job opens capital without the cash", () => {
    useGame.setState({ money: 0 })
    useGame.setState({ jobs: [14] })
    expect(useGame.getState().phase).toBe("D")
    useGame.setState({ money: CAPITAL[0]?.baseCost ?? 0 })
    useGame.getState().buy(1)
    expect(ownedCount(useGame.getState().owned, 1)).toBe(1)
  })

  it("the era (boosts, accent) stays early until capital is bought", () => {
    useGame.setState({ money: 600_000 })
    expect(stageOf(useGame.getState())).toBeNull()
    useGame.getState().buy(1)
    expect(stageOf(useGame.getState())).toMatchObject({ era: "mid", artId: 25 })
  })
})
