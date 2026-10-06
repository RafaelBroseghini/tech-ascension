import { describe, expect, it } from "vitest"
import { featureById } from "./features.ts"
import type { FeatureRow } from "../data/features.ts"
import { bootCareer, getsMarker, multiplierNotes, planUnlocks, purchaseNotes, REVEAL_BATCH_LIMIT, seenFresh } from "./careerSync.ts"
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
      gold: [1],
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
      "perk:gold:1",
      "phase:phase:B",
      "phase:phase:C",
      "phase:phase:D",
    ])
    expect(purchaseNotes(next, { ...next, skills: { "1": 2 } })).toEqual([])
  })

  it("notes each output milestone a purchase crosses, after the first-copy lines", () => {
    const before = { ...base, equipment: { "2": 9 }, owned: { "1": 24 } }
    const after = { ...before, equipment: { "2": 10, "3": 1 }, owned: { "1": 25 } }
    expect(purchaseNotes(before, after).map((note) => `${note.type}:${note.ref}`)).toEqual(["gear:gear:3", "multiplier:gear:2", "multiplier:capital:1"])
    expect(multiplierNotes("capital", before.owned, after.owned)).toEqual([{ type: "multiplier", ref: "capital:1", data: { owned: 25, mult: 4 } }])
  })

  it("logs every milestone a max buy jumps over, and nothing for a buy between them", () => {
    expect(multiplierNotes("gear", { "2": 8 }, { "2": 55 }).map((note) => note.data)).toEqual([
      { owned: 10, mult: 2 },
      { owned: 25, mult: 4 },
      { owned: 50, mult: 8 },
    ])
    expect(multiplierNotes("gear", { "2": 11 }, { "2": 24 })).toEqual([])
    const same = { "2": 10 }
    expect(multiplierNotes("gear", same, same)).toEqual([])
  })
})

describe("planning unlocks", () => {
  it("logs and queues each row, and marks the ones with a place to go", () => {
    const plan = planUnlocks(rows("terminal", "money"), empty)
    expect(plan.unlocked).toEqual(["terminal", "money"])
    expect(plan.reveals).toEqual(["terminal", "money"])
    expect(plan.fresh).toEqual(["terminal"])
    expect(plan.notes.map((note) => note.ref)).toEqual(["terminal", "money"])
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
    const batch = rows("editor", "terminal", "careerLog", "linkedout", "rosters")
    expect(batch.length).toBeGreaterThanOrEqual(REVEAL_BATCH_LIMIT)
    expect(planUnlocks(batch, empty).reveals).toEqual(["editor"])
    expect(planUnlocks(rows("rosters", "cat"), empty, true).reveals).toEqual(["cat"])
  })

  it("clears a picker's NEW items when the picker opens", () => {
    expect(seenFresh(["themes", "theme:dracula", "terminal"], "themes")).toEqual(["terminal"])
    const same = ["terminal"] as const
    expect(seenFresh([...same], "rosters")).toEqual(["terminal"])
  })
})

describe("booting the timeline", () => {
  const now = Date.UTC(2026, 9, 6)

  it("continues a current save, and plays only the loudest of what opened while away", () => {
    const save = {
      ...freshSave(now),
      skills: { "1": 1, "8": 1 },
      career: { ...freshCareer(now), unlocked: ["editor"], returns: 1 },
    }
    const career = bootCareer(save, now)
    expect(career.unlocked).toEqual(["editor", "terminal", "cat"])
    expect(career.reveals).toEqual(["cat"])
    expect(career.awayUnlocks).toEqual(["Terminal", "Desk cat"])
    expect(career.whatsNew).toBe(false)
  })

  it("gives a save from before the timeline everything it earned, the cat, and the what's-new card", () => {
    const save = { ...freshSave(now), skills: { "1": 1 }, gigs: [1, 2], jobs: [1], xpTotal: 50_000 }
    delete (save as { career?: unknown }).career
    const career = bootCareer(save, now)
    expect(career.unlocked).toEqual(expect.arrayContaining(["editor", "money", "rosters", "metrics", "boardGigs", "boardJobs", "cat"]))
    expect(career.whatsNew).toBe(true)
    expect(career.reveals).toEqual([])
    const types = career.journal.entries.map((entry) => `${entry.type}:${entry.ref}`)
    expect(types[0]).toBe("start:")
    expect(types).toContain("phase:phase:C")
    expect(types).toContain("hire:job:1")
    expect(types).not.toContain("unlock:boardGigs")
  })
})
