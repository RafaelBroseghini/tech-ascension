import { beforeEach, describe, expect, it, vi } from "vitest"
import { EVENT_MEAN_WAIT_MS, EVENTS, eventsForEra } from "../data/events.ts"
import type { EventDef } from "./events.ts"
import { advanceEventClock, eligibleEvents, EVENT_AFTER_BLOCK_MS, EVENT_PILE_SHARE, eventById, eventRequiresMet, eventStake, pickEvent, previewOffer, resolveOffer } from "./events.ts"
import type { EarningRates } from "./events.ts"
import { BOOST_WAIT_MAX_FACTOR, BOOST_WAIT_MIN_FACTOR } from "../data/boosts.ts"
import type { Era } from "../data/capital.ts"
import { FOREVER_MULT_MAX, modFactors, pruneTemp } from "./mods.ts"
import { readCareerText } from "./ledger.ts"
import { persistNow, useGame } from "./store.ts"
import { hydrate } from "./save.ts"
import { clickPower, production } from "./economy.ts"

const ERAS: Era[] = ["early", "mid", "upper", "q3", "end"]
const RATES: EarningRates = { cps: 0, click: 1, xpPerSec: 0, xpPerClick: 1 }
const RICH: EarningRates = { cps: 1_000, click: 50, xpPerSec: 200, xpPerClick: 20 }

function def(partial: Partial<EventDef> = {}): EventDef {
  return { id: 999, name: "test", eras: ["any"], weight: 1, flavor: "", offer: { kind: "gift", resource: "xp", minutes: 5 }, ...partial }
}

describe("events table (v2)", () => {
  it("ships the researcher's 110 rows with unique ids and sane fields", () => {
    expect(EVENTS).toHaveLength(110)
    expect(new Set(EVENTS.map((event) => event.id)).size).toBe(110)
    expect(EVENT_MEAN_WAIT_MS).toBe(600_000)
    for (const event of EVENTS) {
      expect(event.weight).toBeGreaterThan(0)
      expect(event.eras.length).toBeGreaterThan(0)
      expect(event.offer.minutes).toBeGreaterThan(0)
      expect(event.name).not.toBe("")
      for (const era of event.eras) expect([...ERAS, "any"]).toContain(era)
      if (event.offer.kind === "gift") expect(["money", "xp"]).toContain(event.offer.resource)
      else expect(["money", "xp"]).toContain(event.offer.gain)
    }
  })

  it("rolls only events for the current era or `any`, and every era has a pool", () => {
    for (const era of ERAS) {
      const pool = eventsForEra(era)
      expect(pool.length).toBeGreaterThanOrEqual(30)
      for (const event of pool) expect(event.eras.includes("any") || event.eras.includes(era)).toBe(true)
    }
    expect(eventsForEra("early").every((event) => !event.eras.every((era) => era === "end"))).toBe(true)
    expect(eventsForEra("early").map((event) => event.name)).not.toContain("Mars dust storm")
    expect(eventsForEra("end").map((event) => event.name)).not.toContain("Broke laptop charger")
  })

  it("keeps cash events out of the pool until money exists", () => {
    const touchesMoney = (event: EventDef) => event.offer.kind === "trade" || (event.offer.kind === "gift" && event.offer.resource === "money")
    for (const era of ERAS) {
      const dry = eligibleEvents(era, false)
      expect(dry.length).toBeGreaterThan(0)
      expect(dry.some(touchesMoney)).toBe(false)
      const open = eventsForEra(era).filter((event) => eventRequiresMet(event))
      expect(eligibleEvents(era, true)).toHaveLength(open.length)
    }
  })

  it("picks by weight across the whole range", () => {
    const pool = eligibleEvents("mid", true)
    expect(pickEvent(pool, 0)).toBe(pool[0])
    expect(pickEvent(pool, 1)).toBe(pool[pool.length - 1])
    expect(pickEvent([], 0.5)).toBeNull()
    const counts = new Map<number, number>()
    for (let i = 0; i < 4_000; i++) {
      const hit = pickEvent(pool, (i + 0.5) / 4_000)
      if (hit) counts.set(hit.id, (counts.get(hit.id) ?? 0) + 1)
    }
    const total = pool.reduce((sum, event) => sum + event.weight, 0)
    for (const event of pool) expect(Math.abs((counts.get(event.id) ?? 0) / 4_000 - event.weight / total)).toBeLessThan(0.01)
  })
})

describe("event requires", () => {
  it("treats a missing or empty gate as eligible, and ANDs filled fields", () => {
    expect(eventRequiresMet(def())).toBe(true)
    expect(eventRequiresMet(def({ requires: { minGigs: 0, minGearOwned: 0 } }))).toBe(true)
    expect(eventRequiresMet(def({ requires: { minJobId: 2 } }))).toBe(false)
    expect(eventRequiresMet(def({ requires: { minJobId: 2 } }), { jobs: [2] })).toBe(true)
    expect(eventRequiresMet(def({ requires: { minJobId: 7 } }), { jobs: [2, 6] })).toBe(false)
    expect(eventRequiresMet(def({ requires: { jobIds: [6, 8] } }), { jobs: [8] })).toBe(true)
    expect(eventRequiresMet(def({ requires: { gigIds: [8, 22] } }), { gigs: [22] })).toBe(true)
    expect(eventRequiresMet(def({ requires: { gigIds: [8, 22] } }), { gigs: [1] })).toBe(false)
    expect(eventRequiresMet(def({ requires: { minGearOwned: 1, gearIds: [7] } }), { equipment: { "4": 1 } })).toBe(false)
    expect(eventRequiresMet(def({ requires: { minGearOwned: 1, gearIds: [7] } }), { equipment: { "7": 2 } })).toBe(true)
    expect(eventRequiresMet(def({ requires: { minJobId: 2, gigIds: [1] } }), { jobs: [2] })).toBe(false)
    expect(eventRequiresMet(def({ requires: { minJobId: 2, gigIds: [1] } }), { jobs: [2], gigs: [1] })).toBe(true)
  })

  it("keeps required rows out of an empty career and lets them in once the gate is met", () => {
    expect(eligibleEvents("mid", true).some((event) => event.id === 26)).toBe(false)
    expect(eligibleEvents("mid", true, { jobs: [2] }).some((event) => event.id === 26)).toBe(true)
    expect(eligibleEvents("early", true).some((event) => event.requires?.minJobId || event.requires?.gigIds || event.requires?.gearIds)).toBe(false)
  })
})

describe("resolveOffer", () => {
  it("prices a stake from minutes of income, and at least 1% of a fat pile", () => {
    expect(eventStake("money", 10, RATES, 0)).toBe(10 * 60 * 0.5)
    expect(eventStake("xp", 4, RATES, 1_000_000)).toBe(Math.floor(1_000_000 * EVENT_PILE_SHARE))
    expect(eventStake("money", 15, { ...RICH, cps: 1e9 }, 0)).toBe(15 * 60 * 1e9)
  })

  it("a gift only adds, a trade swaps, and neither can be a pure loss", () => {
    const gift = resolveOffer(1_000, 400, 900, { kind: "gift", resource: "xp", minutes: 10 }, RATES)
    expect(gift.applied).toBe(true)
    expect(gift.xp).toBeGreaterThan(400)
    expect(gift.xpTotal).toBe(900 + (gift.xp - 400))
    expect(gift.money).toBe(1_000)
    expect(gift.lines.every((line) => line.tone === "good")).toBe(true)

    const deal = resolveOffer(1_000_000, 1_000_000, 1_000_000, { kind: "trade", gain: "money", minutes: 10 }, RATES)
    expect(deal.applied).toBe(true)
    expect(deal.money).toBeGreaterThan(1_000_000)
    expect(deal.xp).toBeLessThan(1_000_000)
    expect(deal.xpTotal).toBe(1_000_000)
    expect(deal.lines.map((line) => line.tone)).toEqual(["good", "bad"])

    const broke = resolveOffer(0, 500, 500, { kind: "trade", gain: "xp", minutes: 6 }, RATES)
    expect(broke.applied).toBe(false)
    expect(broke).toMatchObject({ money: 0, xp: 500, xpTotal: 500 })
  })

  it("never lowers lifetime XP or pushes a balance below zero", () => {
    const brokeXp = resolveOffer(50, 3, 900, { kind: "trade", gain: "money", minutes: 30 }, RICH)
    expect(brokeXp.xp).toBeGreaterThanOrEqual(0)
    expect(brokeXp.xpTotal).toBe(900)
    expect(brokeXp.money).toBeGreaterThan(50)
  })

  it("every table row is a gift or a fair trade, and a million XP is not a 30 XP nick", () => {
    for (const event of EVENTS) {
      const out = resolveOffer(1_000_000, 1_000_000, 1_000_000, event.offer, RICH)
      expect(out.applied).toBe(true)
      expect(out.money).toBeGreaterThanOrEqual(0)
      expect(out.xp).toBeGreaterThanOrEqual(0)
      expect(out.xpTotal).toBeGreaterThanOrEqual(1_000_000)
      if (event.offer.kind === "gift") {
        const gained = event.offer.resource === "money" ? out.money - 1_000_000 : out.xp - 1_000_000
        expect(gained).toBeGreaterThanOrEqual(Math.floor(1_000_000 * EVENT_PILE_SHARE))
        if (event.offer.resource === "money") expect(out.xp).toBe(1_000_000)
        else expect(out.money).toBe(1_000_000)
      } else {
        expect(out.money).not.toBe(1_000_000)
        expect(out.xp).not.toBe(1_000_000)
        const xpMoved = Math.abs(out.xp - 1_000_000)
        expect(xpMoved).toBeGreaterThanOrEqual(Math.floor(1_000_000 * EVENT_PILE_SHARE))
      }
      const refused = resolveOffer(0, 0, 0, event.offer, { cps: 0, click: 0, xpPerSec: 0, xpPerClick: 0 })
      expect(refused.applied).toBe(false)
      expect(refused).toMatchObject({ money: 0, xp: 0, xpTotal: 0 })
    }
    const preview = previewOffer({ kind: "trade", gain: "xp", minutes: 6 }, RATES, 1_000_000, 1_000_000)
    expect(preview.loss).toBeGreaterThanOrEqual(10_000)
    expect(preview.gain).toBeGreaterThanOrEqual(10_000)
  })
})

describe("modFactors", () => {
  it("folds the forever and timed multipliers into each rate", () => {
    const mods = { foreverMult: 2, temp: { click: { mult: 1.5, endsAt: 100 }, cps: { mult: 0.5, endsAt: 100 } } }
    expect(modFactors(mods, 50, 50)).toEqual({ click: 3, cps: 1, xpIdle: 2 })
    expect(modFactors(mods, 100, 100)).toEqual({ click: 2, cps: 2, xpIdle: 2 })
  })

  it("averages a timed multiplier over the part of the interval it was running", () => {
    const mods = { foreverMult: 1, temp: { cps: { mult: 2, endsAt: 150 } } }
    expect(modFactors(mods, 100, 200).cps).toBeCloseTo(1.5)
    expect(modFactors(mods, 200, 300).cps).toBe(1)
    expect(modFactors(mods, 0, 100).cps).toBe(2)
  })

  it("prunes ended entries and keeps the same object when nothing ended", () => {
    const temp = { click: { mult: 2, endsAt: 10 }, cps: { mult: 2, endsAt: 100 } }
    expect(pruneTemp(temp, 50)).toEqual({ cps: temp.cps })
    expect(pruneTemp(temp, 5)).toBe(temp)
  })

  it("scales production without touching the click boost", () => {
    const empty = { skills: {}, equipment: {}, owned: { "26": 1 }, jobs: [], gigs: [] }
    const base = production(empty, null, 0)
    const boosted = production(empty, { mult: 5, endsAt: 10 }, 0, { foreverMult: 2, temp: { click: { mult: 3, endsAt: 10 } } })
    expect(boosted.mult).toBe(5)
    expect(boosted.click).toBe(base.click * 5 * 6)
    expect(boosted.idle).toBe(base.idle * 2)
  })
})

describe("advanceEventClock", () => {
  const ctx = { era: "early" as Era, paying: true, blocked: false }

  it("schedules a clamped exponential wait around the configured mean, then fires", () => {
    const first = advanceEventClock(null, ctx, 1_000, () => 0.5)
    expect(first.fire).toBeNull()
    const wait = (first.nextEventAt ?? 0) - 1_000
    expect(wait).toBeGreaterThanOrEqual(EVENT_MEAN_WAIT_MS * BOOST_WAIT_MIN_FACTOR)
    expect(wait).toBeLessThanOrEqual(EVENT_MEAN_WAIT_MS * BOOST_WAIT_MAX_FACTOR)
    expect(Math.round(wait)).toBe(Math.round(EVENT_MEAN_WAIT_MS * -Math.log(0.5)))

    const fired = advanceEventClock(first.nextEventAt, ctx, first.nextEventAt ?? 0, () => 0)
    expect(fired.fire).not.toBeNull()
    expect(fired.nextEventAt).toBeNull()
    expect(eventsForEra("early")).toContain(fired.fire)
  })

  it("averages out near the configured mean over many rolls", () => {
    let sum = 0
    const n = 2_000
    for (let i = 0; i < n; i++) sum += (advanceEventClock(null, ctx, 0, () => (i + 0.5) / n).nextEventAt ?? 0)
    expect(sum / n).toBeGreaterThan(EVENT_MEAN_WAIT_MS * 0.85)
    expect(sum / n).toBeLessThan(EVENT_MEAN_WAIT_MS * 1.15)
  })

  it("does not fire behind an open modal, and slips past the block", () => {
    const blocked = { ...ctx, blocked: true }
    const held = advanceEventClock(10_000, blocked, 20_000, () => 0)
    expect(held.fire).toBeNull()
    expect(held.nextEventAt).toBe(20_000 + EVENT_AFTER_BLOCK_MS)
    expect(advanceEventClock(null, blocked, 20_000, () => 0)).toEqual({ nextEventAt: null, fire: null })
    expect(advanceEventClock(500_000, blocked, 20_000, () => 0).nextEventAt).toBe(500_000)
    expect(advanceEventClock(held.nextEventAt, ctx, 20_000 + EVENT_AFTER_BLOCK_MS, () => 0).fire).not.toBeNull()
  })

  it("rolls only cash-free events until money exists", () => {
    for (let i = 0; i < 200; i++) {
      const out = advanceEventClock(0, { era: "mid", paying: false, blocked: false }, 1, () => i / 200)
      expect(out.fire?.offer.kind === "trade" || (out.fire?.offer.kind === "gift" && out.fire.offer.resource === "money")).toBe(false)
    }
  })
})

describe("events in the store", () => {
  beforeEach(() => useGame.getState().wipe())

  it("schedules on tick, fires one event, then stays quiet until it is dismissed", () => {
    const game = () => useGame.getState()
    game().tick(game().now + 1_000)
    const due = game().nextEventAt ?? 0
    expect(due - game().now).toBeGreaterThanOrEqual(EVENT_MEAN_WAIT_MS * BOOST_WAIT_MIN_FACTOR)
    expect(game().event).toBeNull()

    game().tick(due + 1)
    const first = game().event
    expect(first).not.toBeNull()
    expect(eventsForEra("early").map((row) => row.id)).toContain(first?.eventId)
    expect(game().nextEventAt).toBeNull()

    game().tick(due + 8 * 3_600_000)
    expect(game().event?.id).toBe(first?.id)
    expect(game().eventSeq).toBe(1)

    game().dismissEvent()
    game().tick(game().now + 1_000)
    expect(game().event).toBeNull()
    expect(game().nextEventAt).not.toBeNull()
    game().tick((game().nextEventAt ?? 0) + 1)
    expect(game().event?.id).toBe(2)
  })

  it("holds a due event behind an open 1:1 and fires it a few seconds after", () => {
    const game = () => useGame.getState()
    useGame.setState({ peakMoney: 1, gigs: [1], jobs: [1] })
    game().tick(game().now + 1_000)
    const due = game().nextEventAt ?? 0
    expect(game().fireReview(1)).toBe(true)
    game().tick(due + 1)
    expect(game().event).toBeNull()
    expect(game().review).not.toBeNull()
    expect(game().nextEventAt).toBe(due + 1 + EVENT_AFTER_BLOCK_MS)
    game().dismissReview()
    game().tick(due + 1 + EVENT_AFTER_BLOCK_MS)
    expect(game().event).not.toBeNull()
  })

  it("opens an event without applying it, and Yes applies it once", () => {
    useGame.setState({ money: 1_000, peakMoney: 1_000, xp: 1_000, xpTotal: 1_000 })
    const before = useGame.getState().money
    expect(useGame.getState().fireEvent(21)).toBe(true)
    expect(useGame.getState().money).toBe(before)
    expect(useGame.getState().event).toMatchObject({ eventId: 21 })
    expect(useGame.getState().acceptEvent()).toBe(true)
    const paid = useGame.getState().money
    expect(paid).toBeGreaterThan(before)
    expect(useGame.getState().event).toBeNull()
    expect(useGame.getState().acceptEvent()).toBe(false)
    expect(useGame.getState().money).toBe(paid)

    expect(useGame.getState().fireEvent(2)).toBe(true)
    expect(useGame.getState().event?.eventId).toBe(2)
    expect(useGame.getState().eventSeq).toBe(2)
    expect(useGame.getState().money).toBe(paid)
  })

  it("No declines the deal and schedules the next wait fresh", () => {
    useGame.setState({ money: 1_000, peakMoney: 1_000, xp: 1_000, xpTotal: 1_000 })
    useGame.getState().fireEvent(21)
    const before = useGame.getState().money
    useGame.getState().dismissEvent()
    expect(useGame.getState().event).toBeNull()
    expect(useGame.getState().lastEvent?.eventId).toBe(21)
    expect(useGame.getState().money).toBe(before)
    expect(useGame.getState().nextEventAt).toBeNull()
  })

  it("refuses an unknown id", () => {
    expect(useGame.getState().fireEvent(99_999)).toBe(false)
    expect(useGame.getState().event).toBeNull()
  })

  it("the permanent multiplier scales clicks and idle income, and persists", () => {
    useGame.setState({ money: 0, peakMoney: 1, gigs: [1, 5], jobs: [1], xp: 0 })
    const base = useGame.getState().click().money
    useGame.setState({ foreverMult: 1.03 })
    expect(useGame.getState().click().money).toBeCloseTo(base * 1.03)
    persistNow()
    const saved = JSON.parse(readCareerText() ?? "{}")
    expect(saved.foreverMult).toBe(1.03)
  })

  it("the timed multiplier applies for its window and then stops", () => {
    useGame.setState({ money: 0, peakMoney: 1, gigs: [1, 5], jobs: [1], xp: 0 })
    const start = useGame.getState().now
    const base = clickPower(useGame.getState())
    useGame.setState({ tempMults: { click: { mult: 1.2, endsAt: start + 180_000 } } })
    expect(useGame.getState().click().money).toBeCloseTo(base * 1.2)
    useGame.getState().tick(start + 181_000)
    expect(useGame.getState().tempMults.click).toBeUndefined()
    useGame.setState({ activeBoost: null })
    expect(useGame.getState().click().money).toBeCloseTo(clickPower(useGame.getState()))
  })

  it("idle income credits a timed multiplier only for the seconds it ran", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.999)
    // A salary and no gigs: no clients means no users, so the product pays and costs nothing.
    useGame.setState({ money: 0, peakMoney: 1, jobs: [1], xp: 0 })
    const cps = 8
    const start = useGame.getState().now
    const ran = 300_000
    useGame.setState({ tempMults: { cps: { mult: 1.15, endsAt: start + ran } } })
    const total = 600_000
    const before = useGame.getState().money
    useGame.getState().tick(start + total)
    const gained = useGame.getState().money - before
    const expected = cps * ((ran * 1.15 + (total - ran)) / 1000)
    expect(Math.abs(gained - expected)).toBeLessThan(cps * 5)
    spy.mockRestore()
  })

  it("a trade you cannot afford does nothing and never softlocks", () => {
    expect(useGame.getState().fireEvent(3)).toBe(true)
    expect(useGame.getState().acceptEvent()).toBe(false)
    expect(useGame.getState().money).toBe(0)
    expect(useGame.getState().event).not.toBeNull()
    useGame.getState().dismissEvent()
    expect(useGame.getState().click().xp).toBeGreaterThan(0)
  })

  it("a fat XP pile moves at least 1% when the deal is about XP", () => {
    useGame.setState({ money: 1_000_000, peakMoney: 1_000_000, xp: 1_000_000, xpTotal: 1_000_000 })
    useGame.getState().fireEvent(3)
    const before = useGame.getState()
    expect(useGame.getState().acceptEvent()).toBe(true)
    const after = useGame.getState()
    expect(after.xp - before.xp).toBeGreaterThanOrEqual(10_000)
    expect(before.money - after.money).toBeGreaterThanOrEqual(10_000)
    expect(after.xpTotal).toBeGreaterThan(before.xpTotal)
  })

  it("event multipliers survive a reload and credit offline income", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.999)
    useGame.setState({ money: 0, peakMoney: 1, jobs: [1], xp: 0, foreverMult: 1.03 })
    persistNow()
    const text = readCareerText()
    const savedAt = JSON.parse(text ?? "{}").savedAt as number
    const hour = 3_600_000
    const loaded = hydrate(text, savedAt + hour)
    expect(loaded.save.foreverMult).toBe(1.03)
    expect(loaded.save.money).toBeCloseTo(8 * 1.03 * 3600, 3)
    spy.mockRestore()
    expect(hydrate(text?.replace('"foreverMult":1.03', '"foreverMult":9999') ?? null, savedAt).save.foreverMult).toBe(FOREVER_MULT_MAX)
    expect(eventById(41)?.name).toBe("Angel intro coffee")
  })
})
