import { beforeEach, describe, expect, it, vi } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { openingGigXp, openingJobXp } from "../data/costs.ts"
import { CAPITAL_UNLOCK, EQUIPMENT, GEAR_TAB_UNLOCK, GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, MONEY_POP, SKILL_TIERS } from "../data/phases.ts"
import { comboFactors, foundCombos } from "./combos.ts"
import { clickFlat, clickPower, gigById, idlePerSec, jobById, nextCost, ownedCount } from "./economy.ts"
import {
  canBuyJob,
  capitalUnlocked,
  gigBoard,
  gigBoardUnlocked,
  gigShortfall,
  gigSkillGaps,
  gigState,
  LOCKED_GIGS_SHOWN,
  jobBoardUnlocked,
  jobState,
  clickPaysMoney,
  moneyMode,
  phaseOf,
  stageOf,
} from "./phase.ts"
import { useGame } from "./store.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts } from "./globe/growth.ts"

/** What the company's served users pay less what its drops cost over a span. */
function productNet(gigs: readonly number[], from: number, to: number): number {
  const grown = advanceCompany(FRESH_COMPANY, growthFacts(gigs, {}), from, to, () => 0.999)
  return grown.earned - grown.lost
}

/** Owned skills (by id) that cover what a gig asks by tag: the first skills of each tag, as many as it needs. */
function skillsFor(gig: (typeof GIGS)[number]): Record<string, number> {
  const owned: Record<string, number> = {}
  for (const need of gig.needs) {
    for (const skill of SKILL_TIERS.filter((row) => row.tags.includes(need.tag)).slice(0, need.min)) owned[String(skill.id)] = 1
  }
  return owned
}

const EMPTY = { xpTotal: 0, peakMoney: 0, skills: {}, owned: {}, jobs: [] as number[], gigs: [] as number[] }

describe("phase gates", () => {
  it("opens the Gig Board at its lifetime XP with Portfolio (#15) and React (#16) owned", () => {
    const minXp = GIG_BOARD_UNLOCK.minXp
    expect(GIG_BOARD_UNLOCK).toEqual({ minXp: openingGigXp(14000), requireOwnedSkills: [15, 16] })
    const skills = { "15": 1, "16": 1 }
    expect(gigBoardUnlocked(EMPTY)).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: minXp })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: minXp, skills: { "15": 1 } })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: minXp, skills: { "16": 1 } })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: minXp - 1, skills })).toBe(false)
    expect(gigBoardUnlocked({ ...EMPTY, xpTotal: minXp, skills })).toBe(true)
  })

  it("opens the Job Board at its lifetime XP and 6 completed gigs", () => {
    const minXp = JOB_BOARD_UNLOCK.minXp
    expect(JOB_BOARD_UNLOCK).toEqual({ minXp: openingJobXp(40000), minGigsCompleted: 6 })
    expect(jobBoardUnlocked({ ...EMPTY, xpTotal: minXp, gigs: [1, 2, 3, 4, 5] })).toBe(false)
    expect(jobBoardUnlocked({ ...EMPTY, xpTotal: minXp - 1, gigs: [1, 2, 3, 4, 5, 6] })).toBe(false)
    expect(jobBoardUnlocked({ ...EMPTY, xpTotal: minXp, gigs: [1, 2, 3, 4, 5, 6] })).toBe(true)
  })

  it("opens capital on the Senior job (id >= 14) OR $500K held, and stays open once you own capital", () => {
    expect(CAPITAL_UNLOCK).toEqual({ minJobRank: 14, minMoney: 500_000 })
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
    expect(phaseOf({ ...EMPTY, xpTotal: GIG_BOARD_UNLOCK.minXp, skills: { "15": 1, "16": 1 } })).toBe("B")
    expect(phaseOf({ ...EMPTY, xpTotal: JOB_BOARD_UNLOCK.minXp, gigs: [1, 2, 3, 4, 5, 6] })).toBe("C")
    expect(phaseOf({ ...EMPTY, xpTotal: JOB_BOARD_UNLOCK.minXp, gigs: [1, 2, 3, 4, 5, 6], jobs: [14] })).toBe("D")
    expect(phaseOf({ ...EMPTY, peakMoney: 600_000 })).toBe("D")
  })

  it("opens cash events once money exists, but click dollars wait for a job", () => {
    expect(moneyMode({ peakMoney: 0, gigs: [], jobs: [] })).toBe(false)
    expect(moneyMode({ peakMoney: 0, gigs: [1], jobs: [] })).toBe(true)
    expect(moneyMode({ peakMoney: 1, gigs: [], jobs: [] })).toBe(true)
    expect(clickPaysMoney({ jobs: [] })).toBe(false)
    expect(clickPaysMoney({ jobs: [1] })).toBe(true)
  })

  it("gates each gig on XP and on the owned skills of each tag it asks for, not on other gigs", () => {
    const gig = gigById(4)
    if (!gig) throw new Error("missing gig 4")
    const board = { "15": 1, "16": 1 }
    const open = { ...EMPTY, xpTotal: gig.xpReq, skills: { ...board, ...skillsFor(gig) } }
    expect(gigState(EMPTY, gig)).toBe("board-locked")
    expect(gigState(open, gig)).toBe("ready")
    expect(gigState({ ...open, gigs: [9] }, gig)).toBe("ready")
    expect(gigState({ ...open, xpTotal: gig.xpReq - 1 }, gig)).toBe("locked")
    expect(gigState({ ...open, skills: board }, gig)).toBe("locked")
    expect(gigState({ ...open, gigs: [4] }, gig)).toBe("done")
  })

  it("names what a gig still wants by tag, and shows the open gigs before the next two locked ones", () => {
    const first = GIGS[0]!
    const p = { ...EMPTY, xpTotal: GIGS[3]!.xpReq, skills: { "15": 1, "16": 1 } }
    expect(gigSkillGaps(p, first)).toEqual(["1 more Backend skill"])
    const board = gigBoard({ ...p, gigs: [1] })
    expect(board.cleared.map((gig) => gig.id)).toEqual([1])
    expect(board.locked).toHaveLength(LOCKED_GIGS_SHOWN)
    // Locked gigs rank by skills short, then XP, then id.
    const shorts = board.locked.map((gig) => gigShortfall(p, gig))
    expect(shorts).toEqual([...shorts].sort((a, b) => a - b))
    const all = new Set([...board.cleared, ...board.open, ...board.locked].map((gig) => gig.id))
    expect(all.size).toBe(board.cleared.length + board.open.length + board.locked.length)
  })

  it("asks less of a career that specialized or came from an origin that fits the gig", () => {
    const gig = gigById(36)
    if (!gig) throw new Error("missing gig 36")
    const backend = gig.needs.find((need) => need.tag === "backend")!
    const none = { ...EMPTY, xpTotal: gig.xpReq }
    expect(gigShortfall(none, gig)).toBe(gig.needs.reduce((sum, need) => sum + need.min, 0))
    const spec = { ...none, build: { spec: "backend" as const, switched: false } }
    expect(gigShortfall(spec, gig)).toBe(gigShortfall(none, gig) - (backend.min - Math.ceil(backend.min / 2)))
    const bootcamp = { ...none, build: { spec: null, switched: false, origin: "bootcamp" as const } }
    expect(gigShortfall(bootcamp, gig)).toBe(gigShortfall(none, gig) - gig.needs.length)
  })

  it("keeps the gig table in order of XP, with tag counts the catalog can meet", () => {
    for (let index = 0; index < GIGS.length; index++) {
      const gig = GIGS[index]!
      if (index > 0) expect(gig.xpReq).toBeGreaterThan(GIGS[index - 1]!.xpReq)
      expect(gig.needs.map((need) => need.tag), `gig ${gig.id}`).toEqual(gig.tags)
      for (const need of gig.needs) {
        const catalog = SKILL_TIERS.filter((skill) => skill.tags.includes(need.tag)).length
        expect(need.min, `gig ${gig.id} ${need.tag}`).toBeGreaterThanOrEqual(1)
        expect(need.min, `gig ${gig.id} ${need.tag}`).toBeLessThanOrEqual(catalog)
      }
    }
  })

  it("gates jobs on the board, lifetime XP and the price", () => {
    const junior = jobById(2)
    if (!junior) throw new Error("missing job 2")
    const board = { ...EMPTY, xpTotal: junior.xpReq, gigs: [1, 2, 3, 4, 5, 6] }
    expect(jobState(EMPTY, junior)).toBe("board-locked")
    expect(jobState({ ...board, xpTotal: junior.xpReq - 1 }, junior)).toBe("locked")
    expect(jobState(board, junior)).toBe("ready")
    expect(canBuyJob({ ...board, xp: junior.xpCost - 1 }, junior)).toBe(false)
    expect(canBuyJob({ ...board, xp: junior.xpCost }, junior)).toBe(true)
    expect(jobState({ ...board, jobs: [2] }, junior)).toBe("owned")
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
  it("ships 104 skills, 65 gigs and 71 jobs (31 on the backend ladder, 5 other tracks of 8) with contiguous ids", () => {
    expect(SKILL_TIERS).toHaveLength(104)
    expect(GIGS).toHaveLength(65)
    expect(JOB_TIERS).toHaveLength(31 + 5 * 8)
    SKILL_TIERS.forEach((row, index) => {
      expect(row.id).toBe(index + 1)
      if (index > 11 && index < 50) expect(row.baseXpCost).toBeGreaterThan(SKILL_TIERS[index - 1]?.baseXpCost ?? 0)
    })
    JOB_TIERS.slice(0, 31).forEach((row, index) => expect(row.id).toBe(index + 1))
  })

  it("has exactly one first idle source among the gigs, and it is a retainer", () => {
    const retainers = GIGS.filter((gig) => gig.retainerCps > 0)
    expect(retainers[0]?.id).toBe(8)
    expect(GIGS.slice(0, 3).every((gig) => gig.retainerCps === 0)).toBe(true)
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

    // Every buy is one copy.
    useGame.setState({ xp: 10_000 })
    useGame.getState().buySkill(1)
    expect(ownedCount(useGame.getState().skills, 1)).toBe(2)
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
    expect(state.toast?.text ?? "").not.toMatch(/board/i)
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
      xp: GIG_BOARD_UNLOCK.minXp,
      xpTotal: GIG_BOARD_UNLOCK.minXp,
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
    useGame.setState({ xpTotal: GIGS[2]!.xpReq })
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
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.999)
    useGame.setState({ xpTotal: GIGS[7]!.xpReq })
    for (let id = 1; id < 8; id++) expect(useGame.getState().clearGig(id, true)).toBe(true)
    expect(idlePerSec(useGame.getState())).toBe(0)
    expect(useGame.getState().clearGig(8)).toBe(true)
    const before = useGame.getState()
    expect(idlePerSec(before)).toBe(2)
    expect(before.money).toBe(GIGS.filter((gig) => gig.id <= 8).reduce((sum, gig) => sum + gig.lump, 0))
    useGame.getState().tick(before.now + 10_000)
    // The eight clients have only the laptop to serve them: the users it serves pay and the drops cost, on top of the 20.
    const net = productNet([1, 2, 3, 4, 5, 6, 7, 8], before.now, before.now + 10_000)
    // The skills held make Friday deploy (+1% idle), which is part of the 20.
    expect(foundCombos(before).map((row) => row.id)).toContain("friday-deploy")
    expect(comboFactors(before).cps).toBeCloseTo(1.01, 12)
    expect(useGame.getState().money - before.money).toBeCloseTo(20 * comboFactors(before).cps + net, 3)
    spy.mockRestore()
  })
})

describe("phase C: jobs and equipment", () => {
  beforeEach(() => {
    useGame.getState().wipe()
    useGame.setState({ xp: JOB_BOARD_UNLOCK.minXp, xpTotal: JOB_BOARD_UNLOCK.minXp, skills: { "15": 1, "16": 1 } })
    for (let id = 1; id <= 6; id++) useGame.getState().clearGig(id, true)
    useGame.setState({ money: 0 })
  })

  it("opens the Job Board and unlocks with a large pop", () => {
    const state = useGame.getState()
    expect(state.phase).toBe("C")
    expect(state.pop).toMatchObject({ kind: "unlock", size: "large" })
    expect(state.toast?.text ?? "").not.toMatch(/board/i)
  })

  it("takes the free internship, then salaried roles that add $/s", () => {
    expect(useGame.getState().buyJob(1)).toBe(true)
    expect(useGame.getState().jobs).toEqual([1])
    expect(idlePerSec(useGame.getState())).toBe(8)
    expect(useGame.getState().buyJob(1)).toBe(false)

    expect(useGame.getState().buyJob(2)).toBe(false)
    const juniorCost = JOB_TIERS[1]?.xpCost ?? 0
    useGame.setState({ xpTotal: JOB_TIERS[1]!.xpReq, xp: juniorCost - 1 })
    expect(useGame.getState().buyJob(2)).toBe(false)
    useGame.setState({ xp: juniorCost })
    expect(useGame.getState().buyJob(2)).toBe(true)
    expect(useGame.getState().money).toBe(0)
    expect(idlePerSec(useGame.getState())).toBe(8 + 25)
  })

  it("pays a teaching job's lump of XP once, on hire, and lifetime XP rises with it", () => {
    const internship = jobById(1)!
    expect(internship.xpLump).toBeGreaterThan(0)
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
    useGame.setState({ xp: junior.xpCost + 5, xpTotal: junior.xpReq })
    expect(useGame.getState().buyJob(2)).toBe(true)
    expect(useGame.getState().xp).toBe(5)
    expect(useGame.getState().xpTotal).toBe(JOB_TIERS[1]!.xpReq)

    // The mentor-buddy job asks for more lifetime XP than the career has; the internship's lump closes the last bit.
    useGame.getState().wipe()
    const mentorXp = JOB_TIERS[2]!.xpReq - Math.floor(JOB_TIERS[0]!.xpLump / 2)
    useGame.setState({ xp: mentorXp, xpTotal: mentorXp, money: 1e6, gigs: [1, 2, 3, 4, 5, 6] })
    expect(useGame.getState().buyJob(3)).toBe(false)
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
    useGame.getState().buyJob(1)
    useGame.setState({ money: 1_000_000, xpTotal: GEAR_TAB_UNLOCK.minXp })
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

  it("keeps gear shut until its lifetime XP", () => {
    useGame.getState().wipe()
    useGame.setState({ money: 1e6, xpTotal: GEAR_TAB_UNLOCK.minXp - 1 })
    useGame.getState().buyEquipment(1)
    expect(ownedCount(useGame.getState().equipment, 1)).toBe(0)
    useGame.setState({ xpTotal: GEAR_TAB_UNLOCK.minXp })
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
