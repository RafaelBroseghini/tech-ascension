import { beforeEach, describe, expect, it, vi } from "vitest"
import { EVENT_MEAN_WAIT_MS, EVENTS, eventsForEra } from "../data/events.ts"
import type { EventDef } from "./events.ts"
import { advanceEventClock, applyEvent, eligibleEvents, EVENT_AFTER_BLOCK_MS, eventById, pickEvent } from "./events.ts"
import { BOOST_WAIT_MAX_FACTOR, BOOST_WAIT_MIN_FACTOR } from "../data/boosts.ts"
import type { Era } from "../data/tiers.ts"
import { FOREVER_MULT_MAX, FOREVER_MULT_MIN, modFactors, pruneTemp } from "./mods.ts"
import { useGame } from "./store.ts"
import { hydrate } from "./save.ts"
import { production } from "./economy.ts"

vi.hoisted(() => {
  const store = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  })
})

const ERAS: Era[] = ["early", "mid", "upper", "q3", "end"]
const BASE = { money: 1_000, xp: 500, xpTotal: 900, foreverMult: 1, temp: {} }

function def(partial: Partial<EventDef> & Pick<EventDef, "effects">): EventDef {
  return { id: 999, name: "test", eras: ["any"], weight: 1, flavor: "", ...partial }
}

describe("events table (v2)", () => {
  it("ships the researcher's 110 rows with unique ids and sane fields", () => {
    expect(EVENTS).toHaveLength(110)
    expect(new Set(EVENTS.map((event) => event.id)).size).toBe(110)
    expect(EVENT_MEAN_WAIT_MS).toBe(150_000)
    for (const event of EVENTS) {
      expect(event.weight).toBeGreaterThan(0)
      expect(event.eras.length).toBeGreaterThan(0)
      expect(event.effects.length).toBeGreaterThan(0)
      expect(event.name).not.toBe("")
      for (const era of event.eras) expect([...ERAS, "any"]).toContain(era)
      for (const effect of event.effects) {
        expect(["money", "moneyPct", "xp", "foreverMult", "tempMult"]).toContain(effect.kind)
        if (effect.kind === "tempMult") {
          expect(effect.ms).toBeGreaterThan(0)
          expect(effect.mult).toBeGreaterThan(0)
        }
        if (effect.kind === "foreverMult") expect(effect.mult).toBeGreaterThan(0)
      }
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
    const touchesMoney = (event: EventDef) => event.effects.some((effect) => effect.kind === "money" || effect.kind === "moneyPct")
    for (const era of ERAS) {
      const dry = eligibleEvents(era, false)
      expect(dry.length).toBeGreaterThan(0)
      expect(dry.some(touchesMoney)).toBe(false)
      expect(eligibleEvents(era, true)).toHaveLength(eventsForEra(era).length)
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

describe("applyEvent", () => {
  it("adds and removes money and XP, reporting what changed", () => {
    const out = applyEvent(BASE, def({ effects: [{ kind: "money", delta: 400 }, { kind: "xp", delta: 300 }] }), 0)
    expect(out.patch).toMatchObject({ money: 1_400, xp: 800, xpTotal: 1_200 })
    expect(out.lines.map((line) => line.text)).toEqual(["+$400", "+300 XP"])
    expect(out.lines.every((line) => line.tone === "good")).toBe(true)
  })

  it("never lets a penalty go below zero, and reports only what was actually lost", () => {
    const out = applyEvent({ ...BASE, money: 30, xp: 20 }, def({ effects: [{ kind: "money", delta: -100_000 }, { kind: "xp", delta: -150 }] }), 0)
    expect(out.patch).toMatchObject({ money: 0, xp: 0 })
    expect(out.lines.map((line) => line.text)).toEqual(["-$30", "-20 XP"])
    const broke = applyEvent({ ...BASE, money: 0, xp: 0 }, def({ effects: [{ kind: "money", delta: -50 }, { kind: "xp", delta: -50 }] }), 0)
    expect(broke.patch).toMatchObject({ money: 0, xp: 0, xpTotal: 900 })
    expect(broke.lines).toEqual([])
  })

  it("never lowers lifetime XP, so phase gates cannot close", () => {
    const out = applyEvent(BASE, def({ effects: [{ kind: "xp", delta: -400 }] }), 0)
    expect(out.patch.xp).toBe(100)
    expect(out.patch.xpTotal).toBe(900)
  })

  it("takes a percentage of cash", () => {
    const tax = applyEvent(BASE, def({ effects: [{ kind: "moneyPct", pct: -0.05 }] }), 0)
    expect(tax.patch.money).toBeCloseTo(950)
    expect(tax.lines[0]?.text).toBe("-$50 (-5% of your cash)")
    expect(applyEvent({ ...BASE, money: 0 }, def({ effects: [{ kind: "moneyPct", pct: -0.05 }] }), 0).lines).toEqual([])
  })

  it("stacks permanent multipliers inside a clamp", () => {
    let state = { ...BASE }
    const up = def({ effects: [{ kind: "foreverMult", mult: 1.5 }] })
    for (let i = 0; i < 40; i++) state = { ...state, ...applyEvent(state, up, 0).patch }
    expect(state.foreverMult).toBe(FOREVER_MULT_MAX)
    const down = def({ effects: [{ kind: "foreverMult", mult: 0.5 }] })
    for (let i = 0; i < 40; i++) state = { ...state, ...applyEvent(state, down, 0).patch }
    expect(state.foreverMult).toBe(FOREVER_MULT_MIN)
    expect(applyEvent(state, down, 0).lines).toEqual([])
  })

  it("replaces a timed multiplier on the same target instead of stacking it", () => {
    const first = applyEvent(BASE, def({ effects: [{ kind: "tempMult", mult: 1.2, ms: 180_000, target: "click" }] }), 1_000)
    expect(first.patch.temp.click).toEqual({ mult: 1.2, endsAt: 181_000 })
    const second = applyEvent({ ...BASE, temp: first.patch.temp }, def({ effects: [{ kind: "tempMult", mult: 0.9, ms: 120_000, target: "click" }, { kind: "tempMult", mult: 1.1, ms: 600_000, target: "xpPerSec" }] }), 5_000)
    expect(second.patch.temp.click).toEqual({ mult: 0.9, endsAt: 125_000 })
    expect(second.patch.temp.xpPerSec).toEqual({ mult: 1.1, endsAt: 605_000 })
    expect(second.lines.map((line) => line.text)).toEqual(["Click income x0.9 for 2 min", "Idle XP/s x1.1 for 10 min"])
  })

  it("every table row applies cleanly to an empty save without negatives or NaN", () => {
    for (const event of EVENTS) {
      const out = applyEvent({ money: 0, xp: 0, xpTotal: 0, foreverMult: 1, temp: {} }, event, 0)
      for (const value of [out.patch.money, out.patch.xp, out.patch.xpTotal, out.patch.foreverMult]) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
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

  it("schedules a clamped exponential wait around the 150s mean, then fires", () => {
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

  it("does not fire during a fight or behind an open modal, and slips past the block", () => {
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
      expect(out.fire?.effects.some((effect) => effect.kind === "money" || effect.kind === "moneyPct")).toBe(false)
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

  it("holds a due event through a fight and fires it a few seconds after", () => {
    const game = () => useGame.getState()
    useGame.setState({ peakMoney: 1, gigs: [1] })
    game().tick(game().now + 1_000)
    const due = game().nextEventAt ?? 0
    game().forceEnemy(1)
    game().tick(due + 1)
    expect(game().event).toBeNull()
    expect(game().fight).toBeNull()
    expect(game().nextEventAt).toBe(due + 1 + EVENT_AFTER_BLOCK_MS)
    game().tick(due + 1 + EVENT_AFTER_BLOCK_MS)
    expect(game().event).not.toBeNull()
  })

  it("fires one event at a time and applies it exactly once", () => {
    useGame.setState({ money: 1_000, peakMoney: 1_000 })
    const before = useGame.getState().money
    expect(useGame.getState().fireEvent(21)).toBe(true)
    const state = useGame.getState()
    expect(state.money).toBe(before + 800)
    expect(state.event).toMatchObject({ eventId: 21 })
    expect(state.event?.lines.map((line) => line.text)).toEqual(["+$800"])

    expect(useGame.getState().fireEvent(2)).toBe(true)
    expect(useGame.getState().event?.eventId).toBe(2)
    expect(useGame.getState().eventSeq).toBe(2)
    expect(useGame.getState().money).toBe(before + 800)
  })

  it("dismisses without undoing the effects and schedules the next wait fresh", () => {
    useGame.setState({ money: 1_000, peakMoney: 1_000 })
    useGame.getState().fireEvent(21)
    const paid = useGame.getState().money
    useGame.getState().dismissEvent()
    expect(useGame.getState().event).toBeNull()
    expect(useGame.getState().lastEvent?.eventId).toBe(21)
    expect(useGame.getState().money).toBe(paid)
    expect(useGame.getState().nextEventAt).toBeNull()
  })

  it("refuses to fire during a fight and an unknown id", () => {
    expect(useGame.getState().fireEvent(99_999)).toBe(false)
    useGame.getState().forceEnemy(1)
    expect(useGame.getState().fireEvent(2)).toBe(false)
    expect(useGame.getState().event).toBeNull()
  })

  it("a fight starting closes an open event", () => {
    useGame.getState().fireEvent(2)
    expect(useGame.getState().event).not.toBeNull()
    useGame.getState().forceEnemy(1)
    expect(useGame.getState().event).toBeNull()
  })

  it("the permanent multiplier scales clicks and idle income, and persists", () => {
    useGame.setState({ money: 0, peakMoney: 1, gigs: [1, 5], xp: 0 })
    const base = useGame.getState().click().money
    useGame.getState().fireEvent(41)
    expect(useGame.getState().foreverMult).toBe(1.03)
    expect(useGame.getState().click().money).toBeCloseTo(base * 1.03)
    const saved = JSON.parse(localStorage.getItem("tech-ascension.save") ?? "{}")
    expect(saved.foreverMult).toBe(1.03)
  })

  it("the timed multiplier applies for its window and then stops", () => {
    useGame.setState({ money: 0, peakMoney: 1, gigs: [1, 5], xp: 0 })
    useGame.getState().fireEvent(58)
    expect(useGame.getState().tempMults.click?.mult).toBe(1.2)
    const hot = useGame.getState().click().money
    expect(hot).toBeCloseTo(1.2)
    const endsAt = useGame.getState().tempMults.click?.endsAt ?? 0
    useGame.getState().tick(endsAt + 1_000)
    expect(useGame.getState().tempMults.click).toBeUndefined()
    useGame.setState({ activeBoost: null })
    expect(useGame.getState().click().money).toBe(1)
  })

  it("idle income credits a timed multiplier only for the seconds it ran", () => {
    useGame.setState({ money: 0, peakMoney: 1, gigs: [5], xp: 0 })
    const cps = 2
    useGame.getState().fireEvent(97)
    const start = useGame.getState().now
    const ends = useGame.getState().tempMults.cps?.endsAt ?? 0
    const ran = Math.max(0, ends - start)
    const total = 600_000
    const before = useGame.getState().money
    useGame.getState().tick(start + total)
    const gained = useGame.getState().money - before
    const expected = cps * ((ran * 1.15 + (total - ran)) / 1000)
    expect(Math.abs(gained - expected)).toBeLessThan(cps * 5)
  })

  it("a cash penalty at zero money leaves the save intact and never softlocks", () => {
    useGame.getState().fireEvent(3)
    expect(useGame.getState().money).toBe(0)
    useGame.getState().fireEvent(106)
    expect(useGame.getState().xp).toBe(0)
    expect(useGame.getState().xpTotal).toBe(0)
    expect(useGame.getState().click().xp).toBeGreaterThan(0)
  })

  it("event multipliers survive a reload and credit offline income", () => {
    useGame.setState({ money: 0, peakMoney: 1, gigs: [5], xp: 0 })
    useGame.getState().fireEvent(41)
    const text = localStorage.getItem("tech-ascension.save")
    const savedAt = JSON.parse(text ?? "{}").savedAt as number
    const hour = 3_600_000
    const loaded = hydrate(text, savedAt + hour)
    expect(loaded.save.foreverMult).toBe(1.03)
    expect(loaded.save.money).toBeCloseTo(0 + 2 * 1.03 * 3600, 3)
    expect(hydrate(text?.replace('"foreverMult":1.03', '"foreverMult":9999') ?? null, savedAt).save.foreverMult).toBe(FOREVER_MULT_MAX)
    expect(eventById(41)?.name).toBe("Angel intro coffee")
  })
})
