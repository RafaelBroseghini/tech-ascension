import { beforeEach, describe, expect, it } from "vitest"
import { ORIGINS, THEORY_TAGS, WEB_TAGS, isOriginId, originById } from "../data/origins.ts"
import type { OriginId } from "../data/origins.ts"
import { GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { canPickOrigin, normalizeBuild, originPickOpen } from "./build.ts"
import { installGameHarness } from "./harness.ts"
import { gigBoardXp, gigLump, gigTagMin, gigXpReq, jobBoardGigs, jobXpReq, originSeedMult, originXpPerSec, skillPriceMult } from "./origin.ts"
import { skillCost, xpPerSec } from "./economy.ts"
import { gigBoardUnlocked, gigState, jobBoardUnlocked, jobState } from "./phase.ts"
import { productFactsOf } from "./globe/product.ts"
import { NO_BUILD } from "./globe/product.ts"
import { useGame } from "./store.ts"
import { simulatePace, STACKER_PAYBACK_SECONDS } from "./pace.ts"

const game = installGameHarness()

describe("the origins", () => {
  it("are College, Bootcamp and Dropout, each with a card's worth of words", () => {
    expect(ORIGINS.map((row) => row.id)).toEqual(["college", "bootcamp", "dropout"])
    for (const row of ORIGINS) {
      for (const text of [row.name, row.blurb, row.upside, row.cost, row.leans]) expect(text.length).toBeGreaterThan(3)
      expect(isOriginId(row.id)).toBe(true)
      expect(originById(row.id)).toBe(row)
    }
    expect(isOriginId("wizard")).toBe(false)
  })

  it("change nothing for no origin", () => {
    const skill = SKILL_TIERS.find((row) => row.tags.includes("data"))!
    expect(skillPriceMult(null, skill)).toBe(1)
    expect(originXpPerSec(null)).toBe(0)
    expect(gigXpReq(null, GIGS[0]!)).toBe(GIGS[0]!.xpReq)
    expect(gigBoardXp(null)).toBe(GIG_BOARD_UNLOCK.minXp)
    expect(jobBoardGigs(null)).toBe(JOB_BOARD_UNLOCK.minGigsCompleted)
    expect(gigLump(null, GIGS[0]!)).toBe(GIGS[0]!.lump)
    expect(originSeedMult(null)).toBe(1)
    expect(jobXpReq(null, JOB_TIERS[10]!)).toBe(JOB_TIERS[10]!.xpReq)
  })
})

describe("what each origin does", () => {
  const theory = SKILL_TIERS.find((row) => row.tags.some((tag) => THEORY_TAGS.includes(tag)) && !row.tags.some((tag) => WEB_TAGS.includes(tag)))!
  const web = SKILL_TIERS.find((row) => row.tags.some((tag) => WEB_TAGS.includes(tag)) && !row.tags.some((tag) => THEORY_TAGS.includes(tag)))!
  const plain = SKILL_TIERS.find((row) => row.tags.every((tag) => tag === "product" || tag === "hardware"))!

  it("College: theory a fifth cheaper, lectures give XP, gigs ask 30% more", () => {
    expect(skillPriceMult("college", theory)).toBe(0.8)
    expect(skillPriceMult("college", web)).toBe(1)
    expect(skillPriceMult("college", plain)).toBe(1)
    expect(skillCost(theory, 3, "college")).toBeLessThan(skillCost(theory, 3))
    expect(originXpPerSec("college")).toBe(0.5)
    expect(xpPerSec({ skills: {}, jobs: [], build: { spec: null, switched: false, origin: "college" } })).toBe(0.5)
    expect(gigXpReq("college", GIGS[0]!)).toBe(Math.round(GIGS[0]!.xpReq * 1.3))
  })

  it("Bootcamp: web a fifth cheaper and theory a quarter dearer, the Gig Board sooner, four gigs for the Job Board", () => {
    expect(skillPriceMult("bootcamp", web)).toBe(0.8)
    expect(skillPriceMult("bootcamp", theory)).toBe(1.25)
    expect(gigBoardXp("bootcamp")).toBe(Math.round(GIG_BOARD_UNLOCK.minXp * 0.7))
    expect(jobBoardGigs("bootcamp")).toBe(4)
    const base = { skills: { "15": 1, "16": 1 }, owned: {}, jobs: [], gigs: [], peakMoney: 0 }
    const xp = gigBoardXp("bootcamp")
    expect(gigBoardUnlocked({ ...base, xpTotal: xp, build: { spec: null, switched: false, origin: "bootcamp" } })).toBe(true)
    expect(gigBoardUnlocked({ ...base, xpTotal: xp, build: undefined })).toBe(false)
    expect(jobBoardUnlocked({ ...base, xpTotal: JOB_BOARD_UNLOCK.minXp, gigs: [1, 2, 3, 4], build: { spec: null, switched: false, origin: "bootcamp" } })).toBe(true)
    expect(jobBoardUnlocked({ ...base, xpTotal: JOB_BOARD_UNLOCK.minXp, gigs: [1, 2, 3, 4], build: undefined })).toBe(false)
  })

  it("Dropout: gigs pay 30% more, each brings half as many users again, Mid-level and up ask 25% more XP", () => {
    expect(gigLump("dropout", GIGS[0]!)).toBeCloseTo(GIGS[0]!.lump * 1.3, 9)
    expect(originSeedMult("dropout")).toBe(1.5)
    expect(productFactsOf({}, undefined, { ...NO_BUILD, origin: "dropout" }).seedMult).toBe(1.5)
    const mid = JOB_TIERS.find((job) => job.rank === 7)!
    const junior = JOB_TIERS.find((job) => job.rank === 2)!
    expect(jobXpReq("dropout", mid)).toBe(Math.round(mid.xpReq * 1.25))
    expect(jobXpReq("dropout", junior)).toBe(junior.xpReq)
    const base = { skills: {}, owned: {}, jobs: [1, 2, 3, 4, 5, 6], gigs: [1, 2, 3, 4, 5, 6], peakMoney: 0, xpTotal: mid.xpReq }
    expect(jobState({ ...base, build: undefined }, mid)).toBe("ready")
    expect(jobState({ ...base, build: { spec: null, switched: false, origin: "dropout" } }, mid)).toBe("locked")
  })

  it("lowers the skills a gig asks for by tag: the specialization halves its own tag, an origin takes one off its tags, never below one", () => {
    expect(gigTagMin(null, null, "backend", 8)).toBe(8)
    expect(gigTagMin(null, "backend", "backend", 8)).toBe(4)
    expect(gigTagMin(null, "backend", "backend", 5)).toBe(3)
    expect(gigTagMin(null, "backend", "frontend", 8)).toBe(8)
    expect(gigTagMin(null, "fde", "product", 6)).toBe(3)
    expect(gigTagMin("college", null, "data", 4)).toBe(3)
    expect(gigTagMin("college", null, "backend", 4)).toBe(4)
    expect(gigTagMin("bootcamp", null, "frontend", 4)).toBe(3)
    expect(gigTagMin("bootcamp", null, "ai", 4)).toBe(4)
    expect(gigTagMin("bootcamp", "backend", "backend", 1)).toBe(1)
    expect(gigTagMin("bootcamp", "backend", "backend", 8)).toBe(3)
  })

  it("College's gigs open later in the gig state too", () => {
    // A gig that asks for more than the board does, so the board is not what holds it.
    const gig = GIGS[5]!
    // Past the plain requirement and the board's, but short of College's 30% more.
    const xpTotal = Math.max(GIG_BOARD_UNLOCK.minXp, gig.xpReq) + 1
    expect(xpTotal).toBeLessThan(gigXpReq("college", gig))
    const p = { skills: Object.fromEntries([...gig.needs.flatMap((need) => SKILL_TIERS.filter((row) => row.tags.includes(need.tag)).slice(0, need.min).map((row) => row.id)), ...GIG_BOARD_UNLOCK.requireOwnedSkills].map((id) => [String(id), 1])), owned: {}, jobs: [], gigs: [], peakMoney: 0, xpTotal }
    expect(gigState({ ...p, build: undefined }, gig)).toBe("ready")
    expect(gigState({ ...p, build: { spec: null, switched: false, origin: "college" } }, gig)).toBe("locked")
  })
})

describe("picking an origin", () => {
  beforeEach(() => {
    game.reset()
  })

  it("is open until the first gig or job, and can be changed until then", () => {
    expect(originPickOpen(useGame.getState())).toBe(true)
    expect(game.pickOrigin("wizard")).toBe(false)
    expect(game.pickOrigin("bootcamp")).toBe(true)
    expect(game.getState().build.origin).toBe("bootcamp")
    expect(game.pickOrigin("dropout")).toBe(true)
    expect(game.getState().build.origin).toBe("dropout")
    game.setXp(10)
    expect(canPickOrigin(useGame.getState(), "college")).toBe(true)
    game.forceGig(1)
    expect(canPickOrigin(useGame.getState(), "college")).toBe(false)
    expect(game.pickOrigin("college")).toBe(false)
    expect(game.getState().build.origin).toBe("dropout")
  })

  it("is journaled and survives the save, and a reset or an Exit drops it", () => {
    game.pickOrigin("college")
    expect(game.careerLog().some((line) => line.type === "pick" && line.ref === "origin:college")).toBe(true)
    expect(normalizeBuild({ spec: null, switched: false, origin: "college" }, []).build?.origin).toBe("college")
    expect(normalizeBuild({ spec: null, switched: false, origin: "wizard" }, []).build).toBeUndefined()
    game.reset()
    expect(game.getState().build.origin).toBeNull()
  })

  it("keeps the plain ladder for no origin (keepProfile alone)", () => {
    game.keepProfile()
    expect(game.getState().build.origin).toBeNull()
  })

  it("keeps the origin through a pick, a switch and the leadership pick", () => {
    game.keepProfile()
    game.pickOrigin("bootcamp")
    game.setUsers("americas-east", 10_000)
    game.setXp(1e9)
    for (let id = 1; id <= 6; id++) game.forceGig(id)
    for (let id = 1; id <= 7; id++) game.buyJob(id)
    expect(game.pickSpecialization("frontend")).toBe(true)
    expect(game.getState().build.origin).toBe("bootcamp")
  })
})

describe("the origins in the pace model", () => {
  it("finish within a visit of each other for a player who leaves it open", () => {
    const profile = { visitsPerDay: 24, minutesPerVisit: 15, clicksPerSec: 2 }
    const days = (origin: OriginId | undefined) => simulatePace(profile, { maxDays: 30, paybackSeconds: STACKER_PAYBACK_SECONDS, origin }).days
    const plain = days(undefined)
    for (const row of ORIGINS) expect(Math.abs(days(row.id) / plain - 1), row.id).toBeLessThan(0.35)
  }, 60_000)
})
