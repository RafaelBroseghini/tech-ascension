/// <reference types="node" />
import { describe, expect, it } from "vitest"
import { BOOST_BY_ERA } from "../data/boosts.ts"
import { OVERLAYS, overlayForTier, tokenize } from "../data/overlays.ts"
import { spriteForTier, thumbForTier } from "../data/sprites.ts"
import { TIERS } from "../data/tiers.ts"
import { advanceBoostClock, pickMultiplier, sampleDurationMs, sampleWaitMs } from "./boosts.ts"
import {
  canAfford,
  clickPower,
  highestRevealedId,
  idlePerSec,
  isRevealed,
  nextCost,
  ownedCount,
  ownedSources,
  production,
  quotePurchase,
} from "./economy.ts"
import { formatNumber } from "./format.ts"
import { freshSave, hydrate, migrate, OFFLINE_CAP_MS, offlineCredit } from "./save.ts"
import { C } from "../pixel/palette.ts"
import { MAIN_SIZE, spriteGrid, THUMB_SIZE } from "../pixel/sprites.ts"
import { capDrops, ownedTierIds, WATERFALL_CAP, waterfallCount } from "./waterfall.ts"

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

  it("lists only owned sources, biggest $/s first, summing to idle", () => {
    expect(ownedSources({})).toEqual([])
    const owned = { "1": 10, "2": 1, "5": 3, "7": 0 }
    const rows = ownedSources(owned)
    expect(rows.map((row) => row.tier.id)).toEqual([5, 1, 2])
    for (const row of rows) expect(row.idle).toBeCloseTo(row.count * row.tier.cps)
    expect(rows.reduce((sum, row) => sum + row.idle, 0)).toBeCloseTo(idlePerSec(owned))
  })

  it("quotes a max buy that stops when the next copy is too expensive", () => {
    const quote = quotePurchase(100, 15, 0, "max")
    expect(quote.count).toBe(5)
    expect(quote.total).toBe(99)
    expect(canAfford(100 - quote.total, nextCost(15, quote.count))).toBe(false)
  })
})

describe("format", () => {
  it("uses Cookie-style suffixes and no scientific notation in the tier range", () => {
    expect(formatNumber(0.1)).toBe("0.1")
    expect(formatNumber(12.4)).toBe("12.4")
    expect(formatNumber(1500)).toBe("1.5K")
    expect(formatNumber(1e6)).toBe("1M")
    expect(formatNumber(1e9)).toBe("1B")
    expect(formatNumber(1e12)).toBe("1T")
    expect(formatNumber(1e15)).toBe("1Qa")
    expect(formatNumber(1e18)).toBe("1Qi")
    expect(formatNumber(1e21)).toBe("1Sx")
    expect(formatNumber(5e22)).toBe("50Sx")
    expect(formatNumber(1.5e24)).toBe("1.5Sp")
    expect(formatNumber(1e33)).toBe("1Dc")
    expect(formatNumber(1e40)).toBe("1.00e40")
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

describe("pixel sprites", () => {
  const ids = [0, ...TIERS.map((tier) => tier.id)]

  it("draws the opening scene and every tier at 64×64 and 32×32 in at most 16 colours", () => {
    expect(new Set(TIERS.map((tier) => tier.id)).size).toBe(TIERS.length)
    for (const id of ids) {
      const main = spriteGrid(id, MAIN_SIZE)
      const thumb = spriteGrid(id, THUMB_SIZE)
      expect([main.w, main.h]).toEqual([64, 64])
      expect([thumb.w, thumb.h]).toEqual([32, 32])
      expect(main.colors().length).toBeLessThanOrEqual(16)
      expect(thumb.colors().length).toBeLessThanOrEqual(16)
      expect(main.data.filter(Boolean).length).toBeGreaterThan(500)
      expect(thumb.data.filter(Boolean).length).toBeGreaterThan(120)
    }
  })

  it("wraps every sprite in a 1px ink outline with no soft edges", () => {
    for (const id of ids) {
      for (const size of [MAIN_SIZE, THUMB_SIZE] as const) {
        const grid = spriteGrid(id, size)
        for (let y = 1; y < grid.h - 1; y++) {
          for (let x = 1; x < grid.w - 1; x++) {
            if (grid.get(x, y) !== 0) continue
            for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
              const near = grid.get(nx, ny)
              if (near !== 0) expect(near).toBe(C.ink)
            }
          }
        }
      }
    }
  })

  it("serves distinct PNG data URLs for the stage art and the thumbs", () => {
    const seen = new Set<string>()
    for (const id of ids) {
      const url = spriteForTier(id)
      expect(url.startsWith("data:image/png;base64,")).toBe(true)
      expect(thumbForTier(id)).not.toBe(url)
      seen.add(url)
    }
    expect(seen.size).toBe(ids.length)
    const bytes = Buffer.from(spriteForTier(1).split(",")[1] ?? "", "base64")
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG")
    expect(bytes.readUInt32BE(16)).toBe(64)
    expect(bytes.readUInt32BE(20)).toBe(64)
  })
})

describe("IDE code overlays", () => {
  it("ships the fifteen brief snippets, in order, each at most 18 lines", () => {
    expect(OVERLAYS.map((o) => o.file)).toEqual([
      "fizzbuzz.py",
      "two_sum.py",
      "reverse_list.go",
      "debounce.ts",
      "BinarySearch.java",
      "worker_pool.go",
      "finetune_loop.py",
      "rate_limit.ts",
      "lru.rs",
      "attention.py",
      "gemm.cu",
      "consensus.go",
      "edge_route.ts",
      "orbital_sync.py",
      "habitat_ctl.rs",
    ])
    for (const overlay of OVERLAYS) {
      expect(overlay.code.split("\n").length).toBeLessThanOrEqual(18)
      expect(overlay.code).not.toMatch(/^\s*$/m)
    }
  })

  it("keys every tier to one band that stays inside the tier's era, never going backwards", () => {
    let last = 0
    for (const tier of TIERS) {
      const overlay = overlayForTier(tier.id)
      expect(overlay.era).toBe(tier.era)
      expect(overlay.id).toBeGreaterThanOrEqual(last)
      last = overlay.id
    }
    expect(new Set(TIERS.map((tier) => overlayForTier(tier.id).id)).size).toBe(15)
  })

  it("starts on fizzbuzz before the first purchase and ends on the habitat controller", () => {
    expect(overlayForTier(0).file).toBe("fizzbuzz.py")
    expect(overlayForTier(1).file).toBe("fizzbuzz.py")
    expect(overlayForTier(33).file).toBe("finetune_loop.py")
    expect(overlayForTier(44).file).toBe("attention.py")
    expect(overlayForTier(50).file).toBe("consensus.go")
    expect(overlayForTier(66).file).toBe("habitat_ctl.rs")
  })

  it("tokenizes without losing or adding a character", () => {
    for (const overlay of OVERLAYS) {
      expect(
        tokenize(overlay.code, overlay.lang)
          .map((token) => token.text)
          .join(""),
      ).toBe(overlay.code)
    }
    const kinds = tokenize('for i in range(1, 101): print("Fizz")', "python")
    expect(kinds.find((t) => t.text === "for")?.kind).toBe("kw")
    expect(kinds.find((t) => t.text === "101")?.kind).toBe("num")
    expect(kinds.find((t) => t.text === '"Fizz"')?.kind).toBe("str")
    expect(kinds.find((t) => t.text === "range")?.kind).toBe("fn")
  })
})

describe("click waterfall", () => {
  it("spawns one thumb per click and one or two more during a boost", () => {
    expect(waterfallCount(false)).toBe(1)
    expect(waterfallCount(true, () => 0)).toBe(2)
    expect(waterfallCount(true, () => 0.99)).toBe(3)
  })

  it("keeps at most 12-16 concurrent thumbs and evicts the oldest", () => {
    expect(WATERFALL_CAP).toBeGreaterThanOrEqual(12)
    expect(WATERFALL_CAP).toBeLessThanOrEqual(16)
    let live: number[] = []
    for (let i = 0; i < 200; i++) live = capDrops(live, [i, i + 1000])
    expect(live).toHaveLength(WATERFALL_CAP)
    expect(live[live.length - 1]).toBe(1199)
  })

  it("only draws from owned tiers", () => {
    expect(ownedTierIds({})).toEqual([])
    expect(ownedTierIds({ "1": 2, "3": 0, "26": 1 }).sort((a, b) => a - b)).toEqual([1, 26])
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
