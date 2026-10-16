import { describe, expect, it } from "vitest"
import {
  agoLabel,
  appendNotes,
  CAREER_LOG_MAX,
  careerJson,
  CAREER_TYPES,
  describeEntry,
  emptyJournal,
  fromSavedEntries,
  journalFromSave,
  toSavedEntries,
} from "./careerLog.ts"
import type { CareerEntry } from "./careerLog.ts"
import { freshSave, hydrate, normalizeSavedCareer, parseSave, RETURN_BREAK_MS } from "./save.ts"

const at = Date.UTC(2026, 9, 6, 12, 0, 0)

describe("the career journal", () => {
  it("stamps notes with seq, time and the balances they leave", () => {
    const journal = appendNotes(emptyJournal(), [{ type: "start", ref: "" }, { type: "learn", ref: "skill:1" }], { money: 12.7, xpTotal: 240.9 }, at)
    expect(journal.seq).toBe(3)
    expect(journal.entries).toEqual([
      { seq: 1, at, type: "start", ref: "", money: 12, xpTotal: 240 },
      { seq: 2, at, type: "learn", ref: "skill:1", money: 12, xpTotal: 240 },
    ])
  })

  it("keeps the newest entries past the cap, and never reuses a seq", () => {
    let journal = emptyJournal()
    for (let index = 0; index < CAREER_LOG_MAX + 5; index++) journal = appendNotes(journal, [{ type: "learn", ref: "skill:1" }], { money: 0, xpTotal: 0 }, at)
    expect(journal.entries).toHaveLength(CAREER_LOG_MAX)
    expect(journal.entries[0]?.seq).toBe(6)
    expect(journal.seq).toBe(CAREER_LOG_MAX + 6)
  })

  it("round-trips through the save as compact tuples", () => {
    const journal = appendNotes(emptyJournal(), [{ type: "event", ref: "event:1", data: { accepted: true } }, { type: "hire", ref: "job:1" }], { money: 5, xpTotal: 9 }, at)
    const saved = toSavedEntries(journal.entries)
    expect(saved[0]).toEqual([1, at, "event", "event:1", 5, 9, { accepted: true }])
    expect(saved[1]).toEqual([2, at, "hire", "job:1", 5, 9])
    expect(fromSavedEntries(saved)).toEqual(journal.entries)
    expect(journalFromSave({ seq: 3, log: saved, unlocked: [], fresh: [], returns: 0 }).seq).toBe(3)
  })

  it("drops entries of a type this build does not know, or out of order", () => {
    const rows = fromSavedEntries([
      [1, at, "learn", "skill:1", 0, 0],
      [2, at, "teleport", "x", 0, 0],
      [2, at, "learn", "skill:2", 0, 0],
      [1, at, "learn", "skill:3", 0, 0],
    ])
    expect(rows.map((row) => row.ref)).toEqual(["skill:1", "skill:2"])
  })
})

describe("the JSON lines", () => {
  const entry: CareerEntry = { seq: 7, at, type: "unlock", ref: "linkedout", money: 0, xpTotal: 2215 }

  it("prints one flat object per entry, in a stable key order", () => {
    expect(Object.keys(careerJson(entry))).toEqual(["seq", "time", "type", "ref", "name", "size", "via", "money", "xpTotal"])
    expect(careerJson(entry)).toMatchObject({ time: "2026-10-06T12:00:00.000Z", name: "LinkedOut profile", size: "standard", via: "Portfolio site live" })
  })

  it("names every kind of step and merges its extras", () => {
    const back: CareerEntry = { seq: 9, at, type: "return", ref: "", money: 10, xpTotal: 20, data: { awayMs: 7_200_000, creditedMoney: 10, creditedXp: 20 } }
    expect(careerJson(back)).toMatchObject({ type: "return", awayMs: 7_200_000, creditedMoney: 10 })
    expect(careerJson(back)).not.toHaveProperty("ref")
    expect(careerJson({ ...entry, type: "hire", ref: "job:1" }).name).toBe("Internship offer")
    expect(careerJson({ ...entry, type: "phase", ref: "phase:B" }).name).toBe("Gig Board")
  })
})

describe("the career log rows", () => {
  it("has a title and a tone for every type", () => {
    const refs: Record<string, string> = {
      unlock: "linkedout",
      learn: "skill:1",
      gig: "gig:8",
      hire: "job:1",
      gear: "gear:1",
      invest: "capital:1",
      phase: "phase:C",
      era: "era:mid",
      perk: "gold:1",
      interview: "interview:hello-server",
      lead: "lead:tokyo",
      incident: "incident:ddos",
      world: "world:1m",
      buzz: "viral",
      event: "event:1",
      review: "review:1",
      milestone: "milestone:money-1337",
    }
    for (const type of CAREER_TYPES) {
      const row = describeEntry({ seq: 1, at, type, ref: refs[type] ?? "", money: 0, xpTotal: 0 })
      expect(row.title, type).not.toBe("")
      expect(row.tone, type).toBeTruthy()
    }
    expect(describeEntry({ seq: 1, at, type: "gig", ref: "gig:8", money: 0, xpTotal: 0 }).detail).toContain("retainer")
    expect(describeEntry({ seq: 1, at, type: "return", ref: "", money: 0, xpTotal: 0, data: { awayMs: 2 * 3_600_000, creditedMoney: 500 } })).toMatchObject({
      title: "Back after 2h 0m",
      detail: "+$500",
    })
  })

  it("says how long ago, coarsely", () => {
    expect(agoLabel(at, at + 10_000)).toBe("now")
    expect(agoLabel(at, at + 4 * 60_000)).toBe("4m")
    expect(agoLabel(at, at + 3 * 3_600_000)).toBe("3h")
    expect(agoLabel(at, at + 3 * 86_400_000)).toBe("3d")
  })
})

describe("the career block in the save", () => {
  it("starts a new save with one line and nothing unlocked", () => {
    expect(freshSave(at).career).toEqual({ seq: 2, log: [[1, at, "start", "", 0, 0]], unlocked: [], fresh: [], returns: 0 })
  })

  it("keeps the block with a shallow check at load; the journal drops what does not fit at boot", () => {
    const raw = {
      seq: 1,
      log: [[1, at, "start", "", 0, 0], ["x"], [3, at, "learn", "skill:1", -5, 10, { ok: true, bad: { deep: 1 } }], [4, at, "teleport", "x", 1, 1], [5, at, "learn", "skill:2", 1, 1, { awayMs: 5 }]],
      unlocked: ["editor", 7, "terminal"],
      fresh: "terminal",
      returns: 2.7,
    }
    const career = normalizeSavedCareer(raw)
    expect(career).toMatchObject({ seq: 1, unlocked: ["editor", "terminal"], fresh: [], returns: 2 })
    expect(career?.log).toHaveLength(5)
    const journal = journalFromSave(career)
    expect(journal.entries.map((entry) => [entry.seq, entry.ref, entry.money, entry.data ?? null])).toEqual([
      [1, "", 0, null],
      [3, "skill:1", 0, null],
      [5, "skill:2", 1, { awayMs: 5 }],
    ])
    expect(journal.seq).toBe(6)
    expect(normalizeSavedCareer("nope")).toBeUndefined()
    expect(normalizeSavedCareer({ log: "nope" })).toBeUndefined()
  })

  it("keeps the block through a save, and logs a return only after a real break", () => {
    const save = freshSave(at)
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.career).toEqual(save.career)
    const short = hydrate(JSON.stringify(save), at + RETURN_BREAK_MS - 1)
    expect(short.save.career?.returns).toBe(0)
    const long = hydrate(JSON.stringify(save), at + RETURN_BREAK_MS)
    expect(long.save.career?.returns).toBe(1)
    expect(long.save.career?.log.at(-1)).toEqual([2, at + RETURN_BREAK_MS, "return", "", 0, 0, { awayMs: RETURN_BREAK_MS, creditedMoney: 0, creditedXp: 0 }])
  })
})
