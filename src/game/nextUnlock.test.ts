import { describe, expect, it } from "vitest"
import { artFor, EQUIP_ART, GIG_ART, JOB_ART, SKILL_ART } from "../data/art.ts"
import { CAPITAL } from "../data/capital.ts"
import { GEAR, GEAR_KINDS, gearSections } from "../data/gear.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { formatNumber, HERO_RAW_DIGITS_BELOW } from "./format.ts"
import { visibleShopRows } from "./economy.ts"
import { nextUnlock, ownsEverything, shopFocus } from "./nextUnlock.ts"
import { equipmentOpen, SHOP_TABS } from "./phase.ts"
import { parseSave, SAVE_VERSION } from "./save.ts"

const EMPTY = { xpTotal: 0, peakMoney: 0, skills: {}, owned: {}, equipment: {}, jobs: [] as number[], gigs: [] as number[], interviews: {} }
const ALL_GIGS = GIGS.map((gig) => gig.id)
const ALL_SKILLS = Object.fromEntries(SKILL_TIERS.map((row) => [String(row.id), 1]))
const ALL_JOBS = JOB_TIERS.map((job) => job.id)

describe("next unlock teaser", () => {
  it("names the first unbought skill, not a tab that is thousands of XP away", () => {
    const first = SKILL_TIERS[0]
    const second = SKILL_TIERS[1]
    if (!first || !second) throw new Error("missing skills")
    expect(nextUnlock(EMPTY)).toEqual({
      key: `skill:${first.id}`,
      name: first.name,
      tab: "A",
      needs: ["more XP"],
      either: false,
    })
    const grinding = nextUnlock({ ...EMPTY, xpTotal: first.baseXpCost, xp: 0, skills: { "1": 1 } })
    expect(grinding).toMatchObject({ key: `skill:${second.id}`, name: second.name, tab: "A" })
    expect(grinding?.name).not.toBe("Gear")
    expect(grinding?.key).not.toMatch(/^board:/)

    const partial = nextUnlock({ ...EMPTY, xpTotal: 14_000, skills: { "15": 1 } })
    expect(partial).toMatchObject({ key: "skill:1", name: first.name, tab: "A" })
  })

  it("names a closed board only after every skill is owned", () => {
    expect(nextUnlock({ ...EMPTY, skills: ALL_SKILLS })).toEqual({
      key: "board:gear",
      name: "Gear",
      tab: "G",
      needs: ["more XP"],
      either: false,
    })
    const gigBoard = nextUnlock({ ...EMPTY, xpTotal: 12_000, skills: ALL_SKILLS })
    expect(gigBoard).toMatchObject({ key: "board:gig", name: "Gig Board", tab: "B" })
  })

  it("moves to the Job Board with the XP and gig gaps, then to Capital", () => {
    const gigs = { ...EMPTY, xpTotal: 20_000, skills: ALL_SKILLS, gigs: [1, 2, 3] }
    expect(nextUnlock(gigs)).toMatchObject({ key: "board:job", name: "Job Board", tab: "C", needs: ["more XP", "more gigs"] })
    expect(nextUnlock({ ...gigs, xpTotal: 40_000, gigs: [1, 2, 3, 4, 5] })?.needs).toEqual(["more gigs"])

    const capital = nextUnlock({ ...EMPTY, xpTotal: 100_000, skills: ALL_SKILLS, gigs: [1, 2, 3, 4, 5, 6], peakMoney: 120_000 })
    expect(capital).toMatchObject({ key: "board:capital", tab: "D", either: true })
    expect(capital?.needs).toEqual(["Senior SWE (more XP)", "a bigger balance"])
  })

  it("with every board open, walks catalog order and stops at the first unbought row", () => {
    expect(nextUnlock({ ...EMPTY, xpTotal: 40_000, skills: ALL_SKILLS, gigs: ALL_GIGS, jobs: [1], peakMoney: 600_000 })).toMatchObject({
      key: "job:2",
      name: "Junior SWE",
      tab: "C",
      needs: ["more XP"],
    })
    const open = { ...EMPTY, xpTotal: 40_000, skills: { "15": 1, "16": 1 }, gigs: ALL_GIGS, jobs: [14], peakMoney: 600_000 }
    expect(nextUnlock(open)).toMatchObject({
      key: "skill:1",
      name: "Used laptop",
      tab: "A",
      needs: ["more XP"],
    })
    expect(nextUnlock({ ...open, xp: SKILL_TIERS[0]?.firstXpCost ?? 0 })).toMatchObject({
      key: "skill:1",
      needs: ["to buy it"],
    })
  })

  it("does not skip an earlier gig that is ready but uncleared", () => {
    const next = nextUnlock({ ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, jobs: ALL_JOBS, gigs: [1], peakMoney: 1e9 })
    expect(next).toMatchObject({ key: "gig:2", name: GIGS[1]?.name, tab: "B", needs: ["to clear it"] })
    expect(next?.key).not.toBe("gig:4")
  })

  it("stops on the first unbought gear row, then the first unbought capital row", () => {
    const done = { ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, jobs: ALL_JOBS, gigs: ALL_GIGS }
    expect(nextUnlock(done)).toMatchObject({
      key: "gear:1",
      name: "Thocky keyboard",
      tab: "G",
      needs: ["more money"],
    })
    expect(nextUnlock({ ...done, money: GEAR[0]?.baseCost ?? 0 })).toMatchObject({ key: "gear:1", needs: ["to buy it"] })

    const ownedGear = Object.fromEntries(GEAR.map((row) => [String(row.id), 1]))
    const tier = nextUnlock({ ...done, equipment: ownedGear, peakMoney: 250_000_000 })
    expect(tier).toMatchObject({ key: "capital:1", name: CAPITAL[0]?.name, tab: "D", needs: ["more money"] })

    const ownedCapital = Object.fromEntries(CAPITAL.map((row) => [String(row.id), 1]))
    const complete = { ...done, equipment: ownedGear, owned: ownedCapital, peakMoney: 1e30 }
    expect(nextUnlock(complete)).toBeNull()
    expect(ownsEverything(complete)).toBe(true)
    const lastCapital = String(CAPITAL.at(-1)?.id)
    const missingCapital = { ...ownedCapital }
    delete missingCapital[lastCapital]
    expect(ownsEverything({ ...complete, owned: missingCapital })).toBe(false)
    expect(ownsEverything(EMPTY)).toBe(false)
  })

  it("keeps a later gear row behind one that is revealed and still unbought", () => {
    const done = { ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, jobs: ALL_JOBS, gigs: ALL_GIGS, peakMoney: 1e9, money: 1e9 }
    expect(nextUnlock(done)?.key).toBe("gear:1")
    expect(nextUnlock({ ...done, equipment: { "1": 1 } })).toMatchObject({ key: "gear:2", name: GEAR[1]?.name, needs: ["to buy it"] })
  })
})

describe("next unlock per panel", () => {
  it("speaks for the panel it is asked about, not for the whole game", () => {
    // Fresh career: the skill grind is the global answer, but each other panel names its own closed board.
    expect(nextUnlock(EMPTY)?.tab).toBe("A")
    expect(nextUnlock(EMPTY, "A")).toMatchObject({ key: "skill:1", tab: "A" })
    expect(nextUnlock(EMPTY, "G")).toMatchObject({ key: "board:gear", tab: "G", needs: ["more XP"] })
    expect(nextUnlock(EMPTY, "B")).toMatchObject({ key: "board:gig", tab: "B" })
    expect(nextUnlock(EMPTY, "B")?.needs).toEqual(["more XP", "Own Portfolio site live", "Own React / one framework"])
    expect(nextUnlock(EMPTY, "C")).toMatchObject({ key: "board:job", tab: "C", needs: ["more XP", "more gigs"] })
    expect(nextUnlock(EMPTY, "D")).toMatchObject({ key: "board:capital", tab: "D", either: true })
  })

  it("moves from a board to that panel's first unbought row once the board opens", () => {
    const open = { ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, gigs: [1, 2], jobs: [1], peakMoney: 1e9, money: 1e9 }
    expect(nextUnlock(open, "A")).toBeNull()
    expect(nextUnlock(open, "B")).toMatchObject({ key: "gig:3", tab: "B" })
    expect(nextUnlock(open, "C")).toMatchObject({ key: "job:2", tab: "C" })
    expect(nextUnlock(open, "G")).toMatchObject({ key: "gear:1", tab: "G", needs: ["to buy it"] })
    expect(nextUnlock(open, "D")).toMatchObject({ key: "capital:1", tab: "D", needs: ["to buy it"] })
  })

  it("is null for a panel with every row bought, whatever the others still hold", () => {
    const base = { ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, peakMoney: 1e9 }
    expect(nextUnlock({ ...base, gigs: ALL_GIGS }, "B")).toBeNull()
    expect(nextUnlock({ ...base, gigs: ALL_GIGS, jobs: ALL_JOBS }, "C")).toBeNull()
    expect(nextUnlock({ ...base, gigs: ALL_GIGS }, "C")).not.toBeNull()
    expect(nextUnlock({ ...base, equipment: Object.fromEntries(GEAR.map((row) => [String(row.id), 1])) }, "G")).toBeNull()
    expect(nextUnlock({ ...base, owned: Object.fromEntries(CAPITAL.map((row) => [String(row.id), 1])) }, "D")).toBeNull()
  })
})

describe("next click focus", () => {
  it("lands on the catalog row the suggestion names", () => {
    const open = { ...EMPTY, xpTotal: 1e7, skills: ALL_SKILLS, gigs: ALL_GIGS, jobs: ALL_JOBS, peakMoney: 1e9 }
    const gear = nextUnlock(open)
    expect(gear && shopFocus(open, gear)).toEqual({ tab: "G", row: "gear:1" })

    const ownedGear = Object.fromEntries(GEAR.map((row) => [String(row.id), 1]))
    const capital = nextUnlock({ ...open, equipment: ownedGear })
    expect(capital && shopFocus({ ...open, equipment: ownedGear }, capital)).toEqual({ tab: "D", row: "capital:1", era: "mid" })
  })

  it("opens the skill, gig, or job you still have to clear for a locked board", () => {
    const missingReact = {
      ...EMPTY,
      xpTotal: 14_000,
      skills: Object.fromEntries(SKILL_TIERS.filter((row) => row.id !== 16).map((row) => [String(row.id), 1])),
    }
    const gigNext = nextUnlock(missingReact)
    expect(gigNext).toMatchObject({ key: "skill:16", tab: "A" })
    expect(gigNext && shopFocus(missingReact, gigNext)).toEqual({ tab: "A", row: "skill:16" })

    const jobBoard = { ...EMPTY, xpTotal: 40_000, skills: ALL_SKILLS, gigs: [1, 2, 3, 4, 5] }
    const jobNext = nextUnlock(jobBoard)
    expect(jobNext && shopFocus(jobBoard, jobNext)).toEqual({ tab: "B", row: "gig:6" })

    const capital = { ...EMPTY, xpTotal: 100_000, skills: ALL_SKILLS, gigs: [1, 2, 3, 4, 5, 6], peakMoney: 120_000 }
    const capitalNext = nextUnlock(capital)
    expect(capitalNext && shopFocus(capital, capitalNext)).toEqual({ tab: "C", row: "job:14" })
  })

  it("stays on the lock panel when the only gap is XP", () => {
    const gearProgress = { ...EMPTY, skills: ALL_SKILLS }
    const gear = nextUnlock(gearProgress)
    expect(gear?.key).toBe("board:gear")
    expect(gear && shopFocus(gearProgress, gear)).toBeNull()
    const jobs = { ...EMPTY, xpTotal: 20_000, skills: ALL_SKILLS, gigs: [1, 2, 3, 4, 5, 6] }
    const jobNext = nextUnlock(jobs)
    expect(jobNext?.key).toBe("board:job")
    expect(jobNext && shopFocus(jobs, jobNext)).toBeNull()
  })
})

describe("gear tab", () => {
  it("sits between Jobs and Capital and opens at 10,000 lifetime XP", () => {
    expect(SHOP_TABS).toEqual(["A", "B", "C", "G", "D"])
    expect(equipmentOpen({ xpTotal: 9_999, equipment: {} })).toBe(false)
    expect(equipmentOpen({ xpTotal: 10_000, equipment: {} })).toBe(true)
    expect(equipmentOpen({ xpTotal: 0, equipment: { "1": 1 } })).toBe(true)
  })

  it("keeps the gear table as repeatable rows with a known kind", () => {
    expect(EQUIPMENT).toBe(GEAR)
    expect(GEAR).toHaveLength(110)
    expect(GEAR[0]?.name).toBe("Thocky keyboard")
    expect(GEAR.map((row) => row.name)).toContain("Raspberry Pie lab")
    const kinds = new Set(GEAR_KINDS.map((kind) => kind.id))
    for (const row of GEAR) expect(kinds.has(row.kind)).toBe(true)
  })

  it("appends the next gear row in catalog order instead of sorting it in by price", () => {
    const visible = visibleShopRows(GEAR, (row) => row.id === 1)
    const desk = gearSections(visible).find((group) => group.id === "desk")
    expect(desk?.rows.map((row) => row.name)).toEqual(["Thocky keyboard", "Cable management kit"])
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
