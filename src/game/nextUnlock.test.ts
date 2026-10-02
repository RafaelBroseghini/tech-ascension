import { describe, expect, it } from "vitest"
import { artFor, EQUIP_ART, GIG_ART, JOB_ART, SKILL_ART } from "../data/art.ts"
import { CAPITAL } from "../data/capital.ts"
import { GEAR, GEAR_KINDS } from "../data/gear.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { formatNumber, HERO_RAW_DIGITS_BELOW } from "./format.ts"
import { nextUnlock } from "./nextUnlock.ts"
import { equipmentOpen, SHOP_TABS } from "./phase.ts"
import { parseSave, SAVE_VERSION } from "./save.ts"

const EMPTY = { xpTotal: 0, peakMoney: 0, skills: {}, owned: {}, equipment: {}, jobs: [] as number[], gigs: [] as number[] }
const ALL_GIGS = GIGS.map((gig) => gig.id)
const ALL_SKILLS = Object.fromEntries(SKILL_TIERS.map((row) => [String(row.id), 1]))
const ALL_JOBS = JOB_TIERS.map((job) => job.id)

describe("next unlock teaser", () => {
  it("starts on Gear, then names the Gig Board and every missing requirement", () => {
    expect(nextUnlock(EMPTY)).toEqual({
      key: "board:gear",
      name: "Gear",
      tab: "G",
      needs: ["8,000 more XP"],
      either: false,
    })
    const partial = nextUnlock({ ...EMPTY, xpTotal: 12_000, skills: { "15": 1 } })
    expect(partial).toMatchObject({ key: "board:gig", name: "Gig Board", tab: "B", needs: ["Own React / one framework"] })
  })

  it("moves to the Job Board with the XP and gig gaps, then to Capital", () => {
    const gigs = { ...EMPTY, xpTotal: 20_000, skills: { "15": 1, "16": 1 }, gigs: [1, 2, 3] }
    expect(nextUnlock(gigs)).toMatchObject({ key: "board:job", name: "Job Board", tab: "C", needs: ["15,000 more XP", "2 more gigs"] })
    expect(nextUnlock({ ...gigs, xpTotal: 35_000, gigs: [1, 2, 3, 4] })?.needs).toEqual(["1 more gig"])

    const capital = nextUnlock({ ...EMPTY, xpTotal: 100_000, skills: { "15": 1, "16": 1 }, gigs: [1, 2, 3, 4, 5], peakMoney: 120_000 })
    expect(capital).toMatchObject({ key: "board:capital", tab: "D", either: true })
    expect(capital?.needs).toEqual(["Senior SWE (60,000 more XP)", "$380,000 more held"])
  })

  it("with every board open, points at the locked row that needs the least XP", () => {
    expect(nextUnlock({ ...EMPTY, xpTotal: 40_000, skills: ALL_SKILLS, gigs: ALL_GIGS, jobs: [1], peakMoney: 600_000 })).toMatchObject({
      key: "job:2",
      tab: "C",
      needs: ["5,000 more XP"],
    })
    expect(nextUnlock({ ...EMPTY, xpTotal: 36_000, skills: { "15": 1, "16": 1 }, gigs: ALL_GIGS, jobs: [14], peakMoney: 600_000 })).toMatchObject({
      key: "skill:37",
      tab: "A",
      needs: ["1,200 more XP"],
    })
  })

  it("reports a gig that only waits on earlier gigs", () => {
    const next = nextUnlock({ ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, jobs: ALL_JOBS, gigs: [1], peakMoney: 1e9 })
    expect(next).toMatchObject({ key: "gig:4", name: GIGS[3]?.name, tab: "B", needs: ["1 more gig"] })
  })

  it("falls back to hidden gear, then the cheapest hidden capital row, then nothing", () => {
    const done = { ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, jobs: ALL_JOBS, gigs: ALL_GIGS }
    expect(nextUnlock(done)).toMatchObject({ key: "gear:2", tab: "G", needs: ["$50 more held"] })
    const tier = nextUnlock({ ...done, peakMoney: 250_000_000 })
    expect(tier).toMatchObject({ key: "capital:7", name: CAPITAL[6]?.name, tab: "D" })
    expect(nextUnlock({ ...done, peakMoney: 1e30 })).toBeNull()
  })
})

describe("gear tab", () => {
  it("sits between Jobs and Capital and opens at 8,000 lifetime XP", () => {
    expect(SHOP_TABS).toEqual(["A", "B", "C", "G", "D"])
    expect(equipmentOpen({ xpTotal: 7_999, equipment: {} })).toBe(false)
    expect(equipmentOpen({ xpTotal: 8_000, equipment: {} })).toBe(true)
    expect(equipmentOpen({ xpTotal: 0, equipment: { "1": 1 } })).toBe(true)
  })

  it("keeps the gear table as repeatable rows with a known kind", () => {
    expect(EQUIPMENT).toBe(GEAR)
    expect(GEAR).toHaveLength(30)
    expect(GEAR[0]?.name).toBe("Thocky keyboard")
    expect(GEAR.map((row) => row.name)).toContain("Raspberry Pie lab")
    const kinds = new Set(GEAR_KINDS.map((kind) => kind.id))
    for (const row of GEAR) expect(kinds.has(row.kind)).toBe(true)
  })
})

describe("catalog capacity", () => {
  it("reuses drawings in order for ids past the end of a table", () => {
    for (const table of [SKILL_ART, GIG_ART, JOB_ART, EQUIP_ART]) {
      expect(artFor(table, 1)).toBe(table[0])
      expect(artFor(table, table.length)).toBe(table[table.length - 1])
      expect(artFor(table, table.length + 1)).toBe(table[0])
      expect(artFor(table, 50)).toBeGreaterThan(0)
    }
    expect(artFor(GIG_ART, 0)).toBe(1)
    expect(artFor([], 3)).toBe(1)
  })

  it("keeps saved counts for ids this build does not sell yet", () => {
    const save = parseSave({
      version: SAVE_VERSION,
      money: 5,
      xp: 5,
      xpTotal: 5,
      skills: { "90": 2 },
      equipment: { "90": 3 },
      owned: {},
      jobs: [1],
      gigs: [1],
      savedAt: 1,
    })
    expect(save?.skills).toEqual({ "90": 2 })
    expect(save?.equipment).toEqual({ "90": 3 })
    expect(save?.version).toBe(SAVE_VERSION)
  })
})

describe("hero digits", () => {
  it("stays fully comma-separated far past the shop's abbreviation point", () => {
    expect(formatNumber(793_023_800, HERO_RAW_DIGITS_BELOW)).toBe("793,023,800")
    expect(formatNumber(793_023_800)).toBe("793M")
    expect(formatNumber(999_999_999_999, HERO_RAW_DIGITS_BELOW)).toBe("999,999,999,999")
    expect(formatNumber(1e12, HERO_RAW_DIGITS_BELOW)).toBe("1T")
  })
})
