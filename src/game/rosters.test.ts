import { describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { openRosters, rosterEntries, type RosterProgress } from "./rosters.ts"

function progress(over: Partial<RosterProgress> = {}): RosterProgress {
  return { skills: {}, equipment: {}, owned: {}, jobs: [], gigs: [], xpTotal: 0, peakMoney: 0, ...over }
}

describe("rosters", () => {
  it("opens a roster with its shop panel, skills from the start", () => {
    expect(openRosters(progress())).toEqual(["skills"])
    expect(openRosters(progress({ xpTotal: 10_000 }))).toEqual(["skills", "gear"])
    expect(openRosters(progress({ gigs: [1] }))).toEqual(["skills", "gigs"])
    expect(openRosters(progress({ gigs: [1], jobs: [1], xpTotal: 40_000 }))).toEqual(["skills", "gigs", "jobs", "gear"])
    expect(openRosters(progress({ gigs: [1], jobs: [14], xpTotal: 200_000 }))).toEqual(["skills", "gigs", "jobs", "gear", "capital"])
  })

  it("lists only what is held, in catalog order, numbered by catalog slot", () => {
    const third = SKILL_TIERS[2]!
    const first = SKILL_TIERS[0]!
    const rows = rosterEntries("skills", progress({ skills: { [third.id]: 2, [first.id]: 1 }, xpTotal: 1e9 }))
    expect(rows.map((row) => [row.no, row.name, row.count])).toEqual([
      [1, first.name, 1],
      [3, third.name, 2],
    ])
    expect(rows[1]!.art).toEqual({ kind: "skill", id: third.id })
  })

  it("never shows an unbought row, however far the gates are open", () => {
    const rich = progress({ xpTotal: 1e12, peakMoney: 1e18 })
    for (const kind of ["skills", "gigs", "jobs", "gear", "capital"] as const) expect(rosterEntries(kind, rich)).toEqual([])
  })

  it("says what each held row gives", () => {
    const gig = GIGS.find((row) => row.retainerCps > 0)!
    expect(rosterEntries("gigs", progress({ gigs: [gig.id] }))[0]!.lines).toEqual([`$${gig.lump.toLocaleString("en-US")} paid`, expect.stringMatching(/\/s retainer$/)])
    const job = JOB_TIERS.find((row) => row.cps > 0)!
    expect(rosterEntries("jobs", progress({ jobs: [job.id] }))[0]!.lines[0]).toMatch(/\/s salary$/)
    const gear = EQUIPMENT[0]!
    const gearRow = rosterEntries("gear", progress({ equipment: { [gear.id]: 3 } }))[0]!
    expect(gearRow.count).toBe(3)
    expect(gearRow.group).toBe("Desk")
    const tier = CAPITAL[0]!
    expect(rosterEntries("capital", progress({ owned: { [tier.id]: 1 } }))[0]!.group).toBe("Mid era")
  })
})
