/// <reference types="node" />
import fs from "node:fs"
import { describe, expect, it } from "vitest"
import { BOOST_BY_ERA } from "../data/boosts.ts"
import { SPRITE_BY_TIER, SPRITE_SUBJECTS, spriteForTier } from "../data/sprites.ts"
import { TIERS } from "../data/tiers.ts"
import { advanceBoostClock, pickMultiplier, sampleDurationMs, sampleWaitMs } from "./boosts.ts"
import {
  canAfford,
  clickPower,
  highestRevealedId,
  isRevealed,
  nextCost,
  ownedCount,
  production,
  quotePurchase,
} from "./economy.ts"
import { formatNumber } from "./format.ts"
import { freshSave, hydrate, migrate, OFFLINE_CAP_MS, offlineCredit } from "./save.ts"

describe("economy", () => {
  it("grows cost by 1.15 and floors", () => {
    expect(nextCost(15, 0)).toBe(15)
    expect(nextCost(15, 1)).toBe(17)
    expect(nextCost(15, 2)).toBe(19)
  })

  it("adds click bonuses and leaves idle unboosted", () => {
    const github = TIERS.find((tier) => tier.name === "Personal GitHug")
    if (!github) throw new Error("missing Personal GitHug")
    expect(github.clickBonus).toBe(1)
    const owned = { "1": 1, [String(github.id)]: 2 }
    expect(clickPower(owned)).toBe(3)
    const live = production(owned, { mult: 10, endsAt: 1_000 }, 500)
    expect(live.click).toBe(30)
    expect(live.idle).toBeCloseTo(0.1 + 2 * github.cps)
    expect(live.mult).toBe(10)
    const expired = production(owned, { mult: 10, endsAt: 1_000 }, 1_000)
    expect(expired.click).toBe(3)
    expect(expired.idle).toBeCloseTo(live.idle)
    expect(expired.mult).toBe(1)
  })

  it("quotes a max buy that stops when the next copy is too expensive", () => {
    const quote = quotePurchase(100, 15, 0, "max")
    expect(quote.count).toBe(5)
    expect(quote.total).toBe(99)
    expect(canAfford(100 - quote.total, nextCost(15, quote.count))).toBe(false)
  })
})

describe("format", () => {
  it("uses suffix then scientific notation", () => {
    expect(formatNumber(0.1)).toBe("0.1")
    expect(formatNumber(12.4)).toBe("12.4")
    expect(formatNumber(1500)).toBe("1.5K")
    expect(formatNumber(1e6)).toBe("1M")
    expect(formatNumber(1e9)).toBe("1B")
    expect(formatNumber(1e12)).toBe("1T")
    expect(formatNumber(1e15)).toBe("1Qa")
    expect(formatNumber(1e18)).toBe("1Qi")
    expect(formatNumber(1e21)).toBe("1.00e21")
  })
})

describe("save", () => {
  it("caps offline credit at 8 hours and writes the welcome toast", () => {
    const owned = { "1": 10 }
    const cps = 1
    const savedAt = 0
    const now = OFFLINE_CAP_MS + 60_000
    expect(offlineCredit(cps, savedAt, now)).toBe(cps * (OFFLINE_CAP_MS / 1000))
    const save = freshSave(savedAt)
    save.owned = owned
    save.money = 4
    const hydrated = hydrate(JSON.stringify(save), now)
    const credit = offlineCredit(1, savedAt, now)
    expect(hydrated.save.money).toBe(4 + credit)
    expect(hydrated.toast).toBe(`welcome back, credited $${formatNumber(credit)}`)
  })

  it("drops an expired click boost and keeps a live one", () => {
    const now = 10_000
    const expired = hydrate(
      JSON.stringify({ version: 1, money: 3, xp: 1, owned: { "2": 4 }, savedAt: now, activeBoost: { mult: 5, endsAt: now } }),
      now,
    )
    expect(expired.save.activeBoost).toBeUndefined()
    expect(expired.save.owned["2"]).toBe(4)

    const live = hydrate(
      JSON.stringify({ version: 1, money: 0, xp: 0, owned: {}, savedAt: now, activeBoost: { mult: 2, endsAt: now + 5_000 } }),
      now,
    )
    expect(live.save.activeBoost).toEqual({ mult: 2, endsAt: now + 5_000 })
  })

  it("migrates a legacy owned array and keeps unknown tier ids", () => {
    const migrated = migrate({ money: 9, owned: [2, 0, 3], savedAt: 50 })
    expect(migrated?.version).toBe(2)
    expect(migrated?.owned[String(TIERS[0]?.id)]).toBe(2)
    expect(migrated?.owned[String(TIERS[2]?.id)]).toBe(3)
    expect(ownedCount(migrated?.owned ?? {}, TIERS[1]?.id ?? 0)).toBe(0)

    const future = migrate({ version: 1, money: 1, xp: 0, owned: { "99": 4, nope: 8 }, savedAt: 1 })
    expect(future?.owned["99"]).toBe(4)
    expect(future?.owned.nope).toBeUndefined()
  })

  it("re-keys v1 owned counts onto the v2 stage ids", () => {
    const byName = (name: string) => TIERS.find((tier) => tier.name === name)?.id
    const v1 = { version: 1, money: 5, xp: 0, savedAt: 1, owned: { "1": 2, "4": 1, "15": 3, "48": 1 } }
    const migrated = migrate(v1)
    expect(migrated?.version).toBe(2)
    expect(migrated?.owned[String(byName("Used laptop"))]).toBe(2)
    expect(migrated?.owned[String(byName("YouToob CS / ML intro"))]).toBe(1)
    expect(migrated?.owned[String(byName("Fine-tune your first LLM"))]).toBe(3)
    expect(migrated?.owned[String(byName("Mars megacampus"))]).toBe(1)
    expect(Object.keys(migrated?.owned ?? {})).toHaveLength(4)

    const again = migrate({ ...v1, version: 2, owned: migrated?.owned })
    expect(again?.owned).toEqual(migrated?.owned)
  })

  it("starts over when the payload is unreadable", () => {
    const hydrated = hydrate("{", 20)
    expect(hydrated.save.money).toBe(0)
    expect(hydrated.toast).toMatch(/unreadable/)
  })
})

describe("click boosts", () => {
  it("clamps the exponential wait and rolls the era weights", () => {
    expect(sampleWaitMs(45_000, 0)).toBe(18_000)
    expect(sampleWaitMs(45_000, 0.999999)).toBe(112_500)
    expect(pickMultiplier(BOOST_BY_ERA.early.weights, 0)).toBe(2)
    expect(pickMultiplier(BOOST_BY_ERA.early.weights, 0.7)).toBe(5)
    expect(pickMultiplier(BOOST_BY_ERA.early.weights, 0.95)).toBe(10)
    expect(pickMultiplier(BOOST_BY_ERA.end.weights, 0.6)).toBe(10)
    expect(sampleDurationMs(BOOST_BY_ERA.early, 0)).toBe(8_000)
    expect(sampleDurationMs(BOOST_BY_ERA.early, 0.999)).toBe(12_000)
    expect(sampleDurationMs(BOOST_BY_ERA.end, 0)).toBe(5_000)
    expect(sampleDurationMs(BOOST_BY_ERA.end, 0.999)).toBe(8_000)
  })

  it("schedules, replaces a single slot, and force-rolls on pity", () => {
    const rng = () => 0
    const first = advanceBoostClock(
      { activeBoost: null, nextBoostAt: null, idleSince: 0 },
      "early",
      0,
      rng,
    )
    expect(first.spawned).toBeNull()
    expect(first.clock.nextBoostAt).toBe(18_000)

    const spawned = advanceBoostClock(first.clock, "early", 18_000, rng)
    expect(spawned.spawned).toEqual({ mult: 2, endsAt: 26_000 })
    expect(spawned.clock.nextBoostAt).toBeNull()

    const still = advanceBoostClock(spawned.clock, "early", 20_000, rng)
    expect(still.spawned).toBeNull()
    expect(still.clock.activeBoost?.mult).toBe(2)

    const ended = advanceBoostClock(still.clock, "early", 26_000, rng)
    expect(ended.spawned).toBeNull()
    expect(ended.clock.activeBoost).toBeNull()
    expect(ended.clock.nextBoostAt).toBe(26_000 + 1_000 + 18_000)

    const pity = advanceBoostClock(
      { activeBoost: null, nextBoostAt: 999_999, idleSince: 0 },
      "early",
      112_500,
      rng,
    )
    expect(pity.spawned?.mult).toBe(2)
    expect(pity.clock.activeBoost).toEqual(pity.spawned)
  })
})

describe("tier table", () => {
  it("has contiguous ids and strictly rising prices", () => {
    TIERS.forEach((tier, index) => {
      expect(tier.id).toBe(index + 1)
      if (index > 0) expect(tier.baseCost).toBeGreaterThan(TIERS[index - 1]?.baseCost ?? 0)
    })
  })

  it("uses no real brand names", () => {
    const banned =
      /\b(stack ?overflow|freecodecamp|youtube|github|kaggle|pytorch|tensorflow|y combinator|yc|raspberry pi|mac mini|openclaw|docker|kubernetes|hacker news|blackwell)\b/i
    for (const tier of TIERS) expect(tier.name).not.toMatch(banned)
  })
})

describe("sprites", () => {
  it("maps every tier, plus the opening scene, to a webp on disk", () => {
    expect(new Set(TIERS.map((tier) => tier.id)).size).toBe(TIERS.length)
    for (const tier of TIERS) {
      const subject = SPRITE_SUBJECTS.find((row) => row.id === tier.id)
      expect(subject?.name).toBe(tier.name)
      expect(subject?.subject.length).toBeGreaterThan(10)
      expect(SPRITE_BY_TIER[tier.id]).toBe(`/sprites/${tier.id}.webp`)
    }
    for (const id of [0, ...TIERS.map((tier) => tier.id)]) {
      const bytes = fs.readFileSync(`public/sprites/${id}.webp`)
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF")
      expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP")
      expect(bytes.length).toBeGreaterThan(8_000)
    }
    expect(spriteForTier(0)).toBe("/sprites/0.webp")
  })
})

describe("hidden upgrades", () => {
  it("reveals a tier only once its price has been reached, plus everything before it", () => {
    const [first, second, third] = TIERS
    if (!first || !second || !third) throw new Error("need three tiers")
    expect(isRevealed(first, {}, 0)).toBe(false)
    expect(isRevealed(first, {}, first.baseCost - 1)).toBe(false)
    expect(isRevealed(first, {}, first.baseCost)).toBe(true)
    expect(isRevealed(second, {}, first.baseCost)).toBe(false)
    expect(highestRevealedId({}, third.baseCost)).toBe(3)
    expect(isRevealed(first, { "3": 1 }, 0)).toBe(true)
    expect(isRevealed(second, { "3": 1 }, 0)).toBe(true)
    expect(isRevealed(third, { "3": 1 }, 0)).toBe(true)
  })

  it("persists the peak balance and never lets it fall below current money", () => {
    const fresh = freshSave(1_000)
    expect(fresh.peakMoney).toBe(0)
    const loaded = hydrate(JSON.stringify({ ...fresh, money: 20, peakMoney: 500, savedAt: 1_000 }), 1_000)
    expect(loaded.save.peakMoney).toBe(500)
    const legacy = hydrate(JSON.stringify({ version: 1, money: 90, xp: 0, owned: {}, savedAt: 1_000 }), 1_000)
    expect(legacy.save.peakMoney).toBe(90)
  })
})
