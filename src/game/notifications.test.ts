import { describe, expect, it } from "vitest"
import { FEATURES } from "../data/features.ts"
import { appendNotes, emptyJournal } from "./careerLog.ts"
import type { CareerNote } from "./careerLog.ts"
import { notificationsOf, settingsTargetsOf, surfaceOf, unreadCount } from "./notifications.ts"

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

  it("lists balance milestones and the win, which chime too, but not other world steps", () => {
    const entries = journal([
      { type: "milestone", ref: "milestone:money-1337" },
      { type: "world", ref: "world:won" },
      { type: "world", ref: "world:users-1000000" },
    ])
    expect(notificationsOf(entries, false).map((n) => n.id)).toEqual(["world:won", "milestone:money-1337"])
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

  it("sends a cosmetic to its own option in settings, then its section, then the switch that shows it", () => {
    const kit = FEATURES.find((row) => row.parent === "clickKits")
    const theme = FEATURES.find((row) => row.parent === "themes")
    const style = FEATURES.find((row) => row.parent === "music")
    if (!kit || !theme || !style) throw new Error("expected a kit, a theme and a music style row")
    expect(settingsTargetsOf(kit.id)).toEqual([kit.id, "kit", "clicks"])
    expect(settingsTargetsOf(theme.id)).toEqual([theme.id, "theme"])
    expect(settingsTargetsOf(style.id)).toEqual([style.id, "music-style", "music"])
  })

  it("sends settings rows to settings and the rest to their own surface", () => {
    expect(settingsTargetsOf("rosters")).toEqual(["rosters"])
    expect(settingsTargetsOf("themes")).toEqual(["theme"])
    expect(settingsTargetsOf("linkedout")).toBeNull()
    expect(settingsTargetsOf("githug")).toBeNull()
    const entries = journal([{ type: "unlock", ref: "linkedout" }])
    expect(notificationsOf(entries, false)[0]).toMatchObject({ surface: "linkedout", settings: null })
  })
})
