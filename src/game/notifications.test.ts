import { describe, expect, it } from "vitest"
import { FEATURES } from "../data/features.ts"
import { appendNotes, emptyJournal } from "./careerLog.ts"
import type { CareerNote } from "./careerLog.ts"
import { notificationsOf, surfaceOf, unreadCount } from "./notifications.ts"

const journal = (notes: CareerNote[]) => appendNotes(emptyJournal(), notes, { money: 0, xpTotal: 0 }, 1_000).entries

describe("the notification history", () => {
  it("lists unlocks newest first and skips everything else", () => {
    const entries = journal([
      { type: "unlock", ref: "careerLog" },
      { type: "learn", ref: "skill:1" },
      { type: "unlock", ref: "githug" },
    ])
    expect(notificationsOf(entries, false).map((n) => n.id)).toEqual(["githug", "careerLog"])
  })

  it("lists the boards, which the journal writes as phase entries", () => {
    const entries = journal([{ type: "phase", ref: "phase:B" }, { type: "phase", ref: "phase:C" }, { type: "phase", ref: "phase:D" }, { type: "phase", ref: "phase:A" }])
    expect(notificationsOf(entries, false).map((n) => n.id)).toEqual(["boardCapital", "boardJobs", "boardGigs"])
  })

  it("leaves out rows from before the log", () => {
    const entries = journal([{ type: "unlock", ref: "careerLog", data: { backfill: true } }])
    expect(notificationsOf(entries, false)).toEqual([])
  })

  it("hides admin rows unless admin mode shows the whole desk", () => {
    const row = FEATURES.find((item) => item.admin)
    if (!row) return
    const entries = journal([{ type: "unlock", ref: row.id }])
    expect(notificationsOf(entries, false)).toEqual([])
    expect(notificationsOf(entries, true)).toHaveLength(1)
  })

  it("counts only the rows still marked NEW", () => {
    const list = notificationsOf(journal([{ type: "unlock", ref: "careerLog" }, { type: "unlock", ref: "githug" }]), false)
    expect(unreadCount(list, ["githug"])).toBe(1)
    expect(unreadCount(list, [])).toBe(0)
  })

  it("sends a cosmetic to its picker", () => {
    const kit = FEATURES.find((row) => row.parent === "clickKits")
    expect(kit && surfaceOf(kit.id)).toBe("clickKits")
    expect(surfaceOf("boardGigs")).toBeNull()
  })
})
