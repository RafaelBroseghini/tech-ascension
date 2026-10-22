import { beforeEach, describe, expect, it } from "vitest"
import { careerJson } from "./careerLog.ts"
import { bootCareer } from "./careerSync.ts"
import { readCareerText } from "./ledger.ts"
import { freshSave, hydrate, parseSave } from "./save.ts"
import { productsOf } from "./identity.ts"
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

  it("the first skill opens nothing: the company waits for the first job", () => {
    learn(1)
    const state = useGame.getState()
    expect(types()).toEqual(["start:", "learn:skill:1"])
    expect(state.unlocked).toEqual([])
    expect(state.reveals).toEqual([])
  })

  it("the first job opens the studio, logged and revealed, with no NEW marker", () => {
    useGame.setState({ xp: 1e6, xpTotal: 1e6, gigs: [1, 2, 3, 4, 5, 6] })
    expect(useGame.getState().unlocked).not.toContain("studio")
    expect(useGame.getState().buyJob(1)).toBe(true)
    const state = useGame.getState()
    expect(types()).toContain("unlock:studio")
    expect(state.unlocked).toContain("studio")
    expect(state.reveals).toContain("studio")
    expect(state.fresh).not.toContain("studio")
  })

  it("the skills before Git + GitHug hygiene open nothing, and it opens the career log with a NEW marker that using it clears", () => {
    learn(1, 4)
    expect(useGame.getState().unlocked).toEqual([])
    learn(5)
    const state = useGame.getState()
    expect(state.unlocked).toContain("careerLog")
    expect(state.fresh).toContain("careerLog")
    expect(state.reveals).toEqual(["careerLog", "githug"])
    expect(useGame.getState().takeReveal()).toBe("careerLog")
    expect(useGame.getState().reveals).toEqual(["githug"])
    useGame.getState().seeFeature("careerLog")
    expect(useGame.getState().fresh).not.toContain("careerLog")
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

  it("a break logs the return but does not bring the cat", () => {
    learn(1)
    useGame.getState().clearReveals()
    useGame.getState().noteReturn(5 * 60 * 1000)
    expect(useGame.getState().returns).toBe(0)
    useGame.getState().noteReturn(30 * 60 * 1000)
    const state = useGame.getState()
    expect(state.returns).toBe(1)
    expect(state.unlocked).not.toContain("cat")
    expect(state.reveals).toEqual([])
    const back = state.journal.entries.find((entry) => entry.type === "return")
    expect(back?.data?.awayMs).toBe(30 * 60 * 1000)
  })

  it("time at the desk alone does not bring the cat", () => {
    learn(1)
    useGame.getState().clearReveals()
    const start = useGame.getState().now
    useGame.getState().tick(start + 60 * 60 * 1000)
    expect(useGame.getState().unlocked).not.toContain("cat")
  })

  it("draws a handle for each new career, rerolls it until kept, and saves it", () => {
    const first = useGame.getState().profile
    expect(first.chosen).toBe(false)
    expect(useGame.getState().rerollProfile()).toBe(true)
    expect(useGame.getState().profile.chosen).toBe(false)
    expect(useGame.getState().profile.handle).not.toBe(first.handle)
    expect(productsOf(useGame.getState().profile.handle)).toContain(useGame.getState().profile.product)
    const before = useGame.getState().profile
    expect(useGame.getState().rerollProduct()).toBe(true)
    expect(useGame.getState().profile.handle).toBe(before.handle)
    expect(useGame.getState().profile.product).not.toBe(before.product)
    const kept = useGame.getState().profile
    useGame.getState().keepProfile()
    expect(useGame.getState().profile).toEqual({ ...kept, chosen: true })
    expect(useGame.getState().rerollProfile()).toBe(false)
    expect(useGame.getState().rerollProduct()).toBe(false)
    expect(useGame.getState().profile.handle).toBe(kept.handle)
    expect(useGame.getState().profile.product).toBe(kept.product)
    persistNow()
    const saved = parseSave(JSON.parse(readCareerText() ?? "null"))
    expect(saved?.profile).toEqual({ ...kept, chosen: true })
    useGame.getState().wipe()
    expect(useGame.getState().profile.chosen).toBe(false)
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
    const old = { ...freshSave(Date.now()), skills: { "1": 1, "8": 1, "5": 1 }, xpTotal: 3_000, xp: 10 }
    delete (old as { career?: unknown }).career
    const career = bootCareer(old, Date.now())
    expect(career.unlocked).toEqual(expect.arrayContaining(["careerLog", "cat"]))
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
