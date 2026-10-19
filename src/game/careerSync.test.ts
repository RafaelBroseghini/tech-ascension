import { describe, expect, it } from "vitest"
import { featureById } from "./features.ts"
import type { FeatureRow } from "../data/features.ts"
import { bootCareer, getsMarker, planUnlocks, purchaseNotes, REVEAL_BATCH_LIMIT, seenFresh } from "./careerSync.ts"
import { freshCareer, freshSave } from "./save.ts"

const rows = (...ids: string[]) => ids.map((id) => featureById(id) as FeatureRow)
const empty = { unlocked: [], fresh: [], reveals: [] }
const base = { skills: {}, equipment: {}, owned: {}, jobs: [] as number[], gigs: [] as number[], gold: [] as number[], xpTotal: 0, peakMoney: 0 }

describe("purchase notes", () => {
  it("notes first copies, clears, hires, perks, eras and phases, and nothing for a repeat", () => {
    const next = {
      ...base,
      skills: { "1": 1 },
      equipment: { "2": 1 },
      owned: { "1": 1 },
      jobs: [1],
      gigs: [3],
      gold: [2],
      xpTotal: 50_000,
      peakMoney: 600_000,
    }
    const notes = purchaseNotes(base, next).map((note) => `${note.type}:${note.ref}`)
    expect(notes).toEqual([
      "learn:skill:1",
      "gig:gig:3",
      "hire:job:1",
      "gear:gear:2",
      "invest:capital:1",
      "era:era:mid",
      "perk:gold:2",
      "phase:phase:B",
      "phase:phase:C",
      "phase:phase:D",
    ])
    expect(purchaseNotes(next, { ...next, skills: { "1": 2 } })).toEqual([])
  })
})

describe("planning unlocks", () => {
  it("logs and queues each row, and marks the ones with a place to go", () => {
    const plan = planUnlocks(rows("linkedout", "money"), empty)
    expect(plan.unlocked).toEqual(["linkedout", "money"])
    expect(plan.reveals).toEqual(["linkedout", "money"])
    expect(plan.fresh).toEqual(["linkedout"])
    expect(plan.notes.map((note) => note.ref)).toEqual(["linkedout", "money"])
  })

  it("leaves boards to their own phase pop and line", () => {
    const plan = planUnlocks(rows("boardGigs"), empty)
    expect(plan.unlocked).toEqual(["boardGigs"])
    expect(plan.reveals).toEqual([])
    expect(plan.notes).toEqual([])
    expect(getsMarker(featureById("boardGigs")!)).toBe(false)
  })

  it("lets a cosmetic arrive quietly with its picker, and announce itself once the picker is open", () => {
    expect(planUnlocks(rows("themes", "theme:dracula"), empty).reveals).toEqual(["themes"])
    expect(planUnlocks(rows("theme:monokai"), { unlocked: ["themes"], fresh: [], reveals: [] }).reveals).toEqual(["theme:monokai"])
  })

  it("plays only the loudest reveal of a big batch or a return", () => {
    const batch = rows("studio", "careerLog", "githug", "linkedout", "rosters")
    expect(batch.length).toBeGreaterThanOrEqual(REVEAL_BATCH_LIMIT)
    expect(planUnlocks(batch, empty).reveals).toEqual(["studio"])
    expect(planUnlocks(rows("rosters", "cat"), empty, true).reveals).toEqual(["cat"])
  })

  it("clears a picker's NEW items when the picker opens", () => {
    expect(seenFresh(["themes", "theme:dracula", "linkedout"], "themes")).toEqual(["linkedout"])
    const same = ["linkedout"] as const
    expect(seenFresh([...same], "rosters")).toEqual(["linkedout"])
  })
})

describe("booting the timeline", () => {
  const now = Date.UTC(2026, 9, 6)

  it("continues a current save, and plays only the loudest of what opened while away", () => {
    const save = {
      ...freshSave(now),
      skills: { "1": 1, "15": 1 },
      jobs: [1],
      career: { ...freshCareer(now), unlocked: ["studio"], returns: 1 },
    }
    const career = bootCareer(save, now)
    expect(career.unlocked).toEqual(["studio", "linkedout", "money", "boardJobs", "metrics", "cat"])
    expect(career.reveals).toEqual(["cat"])
    expect(career.awayUnlocks).toEqual(["LinkedOut profile", "Dollars", "Metrics", "Desk cat"])
    expect(career.whatsNew).toBe(false)
  })

  it("a save that unlocked terminal boots without it", () => {
    const save = {
      ...freshSave(now),
      skills: { "1": 1, "8": 1 },
      career: { ...freshCareer(now), unlocked: ["editor", "terminal", "cat"], fresh: ["terminal"], returns: 1 },
    }
    const career = bootCareer(save, now)
    expect(career.unlocked).toEqual(["cat", "studio"])
    expect(career.fresh).toEqual([])
    expect(career.unlocked).not.toContain("terminal")
    expect(career.unlocked).not.toContain("editor")
    expect(career.journal.entries.length).toBeGreaterThan(0)
  })

  it("gives a save from before the timeline everything it earned, the cat, and the what's-new card", () => {
    const save = { ...freshSave(now), skills: { "1": 1 }, gigs: [1, 2], jobs: [1], xpTotal: 50_000 }
    delete (save as { career?: unknown }).career
    const career = bootCareer(save, now)
    expect(career.unlocked).toEqual(expect.arrayContaining(["studio", "money", "rosters", "metrics", "boardGigs", "boardJobs", "cat"]))
    expect(career.whatsNew).toBe(true)
    expect(career.reveals).toEqual([])
    const types = career.journal.entries.map((entry) => `${entry.type}:${entry.ref}`)
    expect(types[0]).toBe("start:")
    expect(types).toContain("phase:phase:C")
    expect(types).toContain("hire:job:1")
    expect(types).not.toContain("unlock:boardGigs")
  })
})
