import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { HACK_COOLDOWN_MS } from "../data/hackathon.ts"
import { SKILL_TIERS } from "../data/phases.ts"
import { normalizeHackMeta, targetOf } from "./hackathon.ts"
import { readCareerText } from "./ledger.ts"
import { hydrate } from "./save.ts"
import { persistNow, useGame } from "./store.ts"

/** A freelancer: the Gig Board is open and twenty skills fill the deck. */
function freelancer(extra: Partial<ReturnType<typeof useGame.getState>> = {}) {
  const skills = Object.fromEntries(SKILL_TIERS.slice(0, 20).map((row) => [String(row.id), 3]))
  useGame.setState({ skills, xp: 30_000, xpTotal: 30_000, ...extra })
}

function play() {
  const game = useGame.getState()
  expect(game.startHackathon(1234)).toBe(true)
  expect(useGame.getState().hackPick(0)).toBe(true)
}

describe("hackathon in the store", () => {
  beforeEach(() => useGame.getState().wipe())
  afterEach(() => useGame.getState().wipe())

  it("stays shut until the Gig Board and a deck are there", () => {
    expect(useGame.getState().openHackathon()).toBe(false)
    expect(useGame.getState().startHackathon()).toBe(false)
    freelancer()
    expect(useGame.getState().openHackathon()).toBe(true)
    expect(useGame.getState().hackOpen).toBe(true)
    useGame.getState().closeHackathon()
    expect(useGame.getState().hackOpen).toBe(false)
  })

  it("registers once: a second run waits for this one", () => {
    freelancer()
    expect(useGame.getState().startHackathon(5)).toBe(true)
    expect(useGame.getState().hack.runs).toBe(1)
    expect(useGame.getState().hack.run?.stage).toBe("draft")
    expect(useGame.getState().startHackathon(6)).toBe(false)
    expect(useGame.getState().startHackathon(6, true)).toBe(false)
  })

  it("pays XP for Friday before money exists, and money for Saturday once it does", () => {
    freelancer({ gigs: [1, 2, 3], money: 1_000, peakMoney: 1_000 })
    play()
    const run = useGame.getState().hack.run
    if (!run) throw new Error("no run")
    useGame.setState({ hack: { ...useGame.getState().hack, run: { ...run, score: targetOf(run) - 1 } } })
    const before = useGame.getState()
    expect(before.hackShip([0])).toBe(true)
    const friday = useGame.getState()
    expect(friday.hack.run).toMatchObject({ stage: "draft", round: 1 })
    expect(friday.hack.run?.cleared?.round).toBe(0)
    expect(friday.xp).toBeGreaterThan(before.xp)
    expect(friday.xpTotal - before.xpTotal).toBe(friday.xp - before.xp)
    expect(friday.money).toBe(before.money)

    expect(friday.hackPick(0)).toBe(true)
    const saturday = useGame.getState().hack.run
    if (!saturday) throw new Error("no round")
    useGame.setState({ hack: { ...useGame.getState().hack, run: { ...saturday, score: targetOf(saturday) - 1 } } })
    const ready = useGame.getState()
    expect(ready.hackShip([0])).toBe(true)
    const paid = useGame.getState()
    expect(paid.money).toBeGreaterThan(ready.money)
    expect(paid.hack.run?.earned.money).toBe(paid.money - ready.money)
    expect(paid.stats.lifetimeEarned).toBeGreaterThan(ready.stats.lifetimeEarned)
  })

  it("settles a lost run: the league stays, the cooldown starts, and closing it frees the slot", () => {
    freelancer()
    play()
    const run = useGame.getState().hack.run
    if (!run) throw new Error("no run")
    useGame.setState({ hack: { ...useGame.getState().hack, run: { ...run, ships: 1 } } })
    const now = Date.now()
    expect(useGame.getState().hackShip([0])).toBe(true)
    const hack = useGame.getState().hack
    expect(hack.run?.stage).toBe("lost")
    expect(hack.league).toBe(0)
    expect(hack.nextAt).toBeGreaterThanOrEqual(now + HACK_COOLDOWN_MS)
    expect(useGame.getState().startHackathon()).toBe(false)
    expect(useGame.getState().finishHackathon()).toBe(true)
    expect(useGame.getState().hack.run).toBeNull()
    expect(useGame.getState().startHackathon()).toBe(false)
    expect(useGame.getState().startHackathon(9, true)).toBe(true)
  })

  it("wins a league on Sunday", () => {
    freelancer()
    play()
    const run = useGame.getState().hack.run
    if (!run) throw new Error("no run")
    const sunday = { ...run, round: 2, score: 1e9 }
    useGame.setState({ hack: { ...useGame.getState().hack, run: sunday } })
    expect(useGame.getState().hackShip([0])).toBe(true)
    expect(useGame.getState().hack).toMatchObject({ league: 1, wins: 1, topLeague: 0 })
    expect(useGame.getState().hack.run?.stage).toBe("won")
  })

  it("holds random events and 1:1s while the overlay is up", () => {
    freelancer({ jobs: [1], gigs: [1, 2, 3, 4, 5, 6], money: 500, peakMoney: 500 })
    useGame.getState().openHackathon()
    const now = useGame.getState().now
    useGame.setState({ nextEventAt: now - 1, nextReviewAt: now - 1 })
    useGame.getState().tick(now + 100)
    expect(useGame.getState().event).toBeNull()
    expect(useGame.getState().review).toBeNull()
    useGame.getState().closeHackathon()
    useGame.getState().tick(useGame.getState().nextEventAt ?? now + 10_000)
    expect(useGame.getState().event ?? useGame.getState().review).not.toBeNull()
  })

  it("saves the run card by card and loads it back", () => {
    freelancer()
    play()
    expect(useGame.getState().hackShip([0, 1])).toBe(true)
    persistNow()
    // The save keeps the numbers; the store checks the run against the tables on boot, as here.
    const loaded = normalizeHackMeta(hydrate(readCareerText(), Date.now()).save.hackathon)
    const live = useGame.getState().hack
    expect(loaded.runs).toBe(1)
    expect(loaded.run).toEqual({ ...live.run, shot: null })
  })

  it("nudges once that registration is open, and the toast opens the overlay", () => {
    freelancer()
    useGame.setState({ toast: null })
    useGame.getState().tick(useGame.getState().now + 100)
    const toast = useGame.getState().toast
    expect(toast).toMatchObject({ text: "Hackathon registration is open", action: "hackathon" })
    useGame.setState({ toast: null })
    useGame.getState().tick(useGame.getState().now + 100)
    expect(useGame.getState().toast).toBeNull()
  })
})
