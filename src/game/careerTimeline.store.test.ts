import { beforeEach, describe, expect, it } from "vitest"
import { careerJson } from "./careerLog.ts"
import { bootCareer } from "./careerSync.ts"
import { readCareerText } from "./ledger.ts"
import { freshSave, hydrate, parseSave } from "./save.ts"
import { persistNow, useGame } from "./store.ts"

const types = () => useGame.getState().journal.entries.map((entry) => `${entry.type}:${entry.ref}`)

/** Enough XP to buy skills 1..n without tripping the 8,000 XP gates (10x dev, Gear). */
function learn(...ids: number[]) {
  for (const id of ids) {
    useGame.setState((state) => ({ xp: state.xp + 5_000, xpTotal: Math.max(state.xpTotal, 2_300) }))
    useGame.getState().buySkill(id)
  }
}

describe("career timeline", () => {
  beforeEach(() => {
    useGame.getState().wipe()
  })

  it("starts a career with one journal line and nothing unlocked", () => {
    const state = useGame.getState()
    expect(types()).toEqual(["start:"])
    expect(state.unlocked).toEqual([])
    expect(state.reveals).toEqual([])
  })

  it("the first skill boots the editor: logged, revealed, no NEW marker", () => {
    learn(1)
    const state = useGame.getState()
    expect(types()).toEqual(["start:", "learn:skill:1", "unlock:editor"])
    expect(state.unlocked).toEqual(["editor"])
    expect(state.reveals).toEqual(["editor"])
    expect(state.fresh).toEqual([])
  })

  it("Linux CLI basics opens the terminal with a NEW marker that using it clears", () => {
    learn(1, 8)
    const state = useGame.getState()
    expect(state.unlocked).toContain("terminal")
    expect(state.fresh).toContain("terminal")
    expect(state.reveals).toEqual(["editor", "terminal"])
    expect(useGame.getState().takeReveal()).toBe("editor")
    expect(useGame.getState().reveals).toEqual(["terminal"])
    useGame.getState().seeFeature("terminal")
    expect(useGame.getState().fresh).not.toContain("terminal")
  })

  it("the first gig logs the clear, the board and the dollars, and queues rosters", () => {
    learn(1)
    useGame.getState().clearGig(1, true)
    const log = types()
    expect(log).toContain("gig:gig:1")
    expect(log).toContain("phase:phase:B")
    expect(log).toContain("unlock:money")
    expect(log).toContain("unlock:rosters")
    expect(log.indexOf("gig:gig:1")).toBeLessThan(log.indexOf("phase:phase:B"))
    const { reveals, fresh } = useGame.getState()
    expect(reveals).toContain("rosters")
    expect(reveals).toContain("money")
    expect(reveals).not.toContain("boardGigs")
    expect(fresh).toContain("rosters")
    expect(fresh).not.toContain("money")
  })

  it("a large jump unlocks everything at once but plays a single reveal", () => {
    const skills = Object.fromEntries(Array.from({ length: 16 }, (_, index) => [String(index + 1), 1]))
    useGame.setState({ xp: 1e9, xpTotal: 1e9, skills })
    const state = useGame.getState()
    expect(state.unlocked.length).toBeGreaterThanOrEqual(5)
    expect(state.reveals.length).toBe(1)
  })

  it("a cosmetic waits on its picker, then gets its own small reveal", () => {
    useGame.setState({ money: 1e6, peakMoney: 1e6, xpTotal: 12_000 })
    useGame.getState().clearReveals()
    useGame.getState().buyEquipment(11)
    let state = useGame.getState()
    expect(state.unlocked).toEqual(expect.arrayContaining(["themes", "theme:dracula"]))
    expect(state.reveals).toContain("themes")
    expect(state.reveals).not.toContain("theme:dracula")
    expect(state.fresh).toEqual(expect.arrayContaining(["themes", "theme:dracula"]))
    useGame.getState().seeFeature("themes")
    expect(useGame.getState().fresh.filter((id) => id.startsWith("theme"))).toEqual([])

    // The click picker is open, so the next kit announces itself.
    useGame.getState().buyEquipment(1)
    useGame.getState().clearReveals()
    useGame.getState().buyEquipment(4)
    state = useGame.getState()
    expect(state.reveals).toEqual(["kit:felt"])
  })

  it("coming back after a break brings the cat and logs the return", () => {
    learn(1)
    useGame.getState().clearReveals()
    useGame.getState().noteReturn(5 * 60 * 1000)
    expect(useGame.getState().returns).toBe(0)
    useGame.getState().noteReturn(30 * 60 * 1000)
    const state = useGame.getState()
    expect(state.returns).toBe(1)
    expect(state.unlocked).toContain("cat")
    expect(state.reveals).toEqual(["cat"])
    const back = state.journal.entries.find((entry) => entry.type === "return")
    expect(back?.data?.awayMs).toBe(30 * 60 * 1000)
  })

  it("logs events and 1:1s with the choice made", () => {
    useGame.getState().fireEvent(1)
    useGame.getState().dismissEvent()
    const entry = useGame.getState().journal.entries.at(-1)
    expect(entry?.type).toBe("event")
    expect(entry?.data?.accepted).toBe(false)
    expect(careerJson(entry!)).toMatchObject({ type: "event", ref: "event:1", accepted: false })
  })

  it("saves the journal and adds a return line when loaded after a break", () => {
    learn(1, 8)
    useGame.getState().fireEvent(1)
    useGame.getState().dismissEvent()
    persistNow()
    const text = readCareerText()
    const parsed = parseSave(JSON.parse(text ?? "null"))
    const state = useGame.getState()
    expect(parsed?.career?.log).toHaveLength(state.journal.entries.length)
    expect(parsed?.career?.unlocked).toEqual(state.unlocked)
    expect(parsed?.career?.fresh).toEqual(state.fresh)

    const later = hydrate(JSON.stringify({ ...parsed, savedAt: Date.now() - 2 * 60 * 60 * 1000 }), Date.now())
    const log = later.save.career?.log ?? []
    expect(log.at(-1)?.[2]).toBe("return")
    expect(later.save.career?.returns).toBe(1)
  })

  it("a save from before the timeline keeps what it earned, quietly, with a one-time card", () => {
    const old = { ...freshSave(Date.now()), skills: { "1": 1, "8": 1, "10": 1 }, xpTotal: 3_000, xp: 10 }
    delete (old as { career?: unknown }).career
    const career = bootCareer(old, Date.now())
    expect(career.unlocked).toEqual(expect.arrayContaining(["editor", "terminal", "careerLog", "cat"]))
    expect(career.reveals).toEqual([])
    expect(career.fresh).toEqual([])
    expect(career.whatsNew).toBe(true)
    expect(career.journal.entries.every((entry) => entry.data?.backfill === true)).toBe(true)
  })

  it("an untouched save without the block starts like a new career", () => {
    const blank = { ...freshSave(Date.now()) }
    delete (blank as { career?: unknown }).career
    const career = bootCareer(blank, Date.now())
    expect(career.whatsNew).toBe(false)
    expect(career.journal.entries.map((entry) => entry.type)).toEqual(["start"])
  })

  it("a wipe starts the journal over", () => {
    learn(1, 8)
    useGame.getState().wipe()
    expect(types()).toEqual(["start:"])
    expect(useGame.getState().unlocked).toEqual([])
    expect(useGame.getState().fresh).toEqual([])
  })
})
