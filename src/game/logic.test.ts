/// <reference types="node" />
import { describe, expect, it } from "vitest"
import { BOOST_BY_ERA, BOOST_PITY_FACTOR, BOOST_WAIT_MIN_FACTOR } from "../data/boosts.ts"
import { spriteForTier, thumbForTier } from "../data/sprites.ts"
import { EQUIP_ART, GIG_ART, JOB_ART, SKILL_ART } from "../data/art.ts"
import { PURCHASE_COST_SCALE } from "../data/costs.ts"
import { GEAR_TAB_UNLOCK, EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { COST_GROWTH, CAPITAL } from "../data/capital.ts"
import { advanceBoostClock, pickMultiplier, sampleDurationMs, sampleWaitMs } from "./boosts.ts"
import {
  canAfford,
  clickPower,
  idleParts,
  idlePerSec,
  isRevealed,
  isSkillRevealed,
  jobById,
  nextCost,
  visibleShopRows,
  ownedSources,
  production,
  quotePurchase,
  xpPerClick,
  xpPerSec,
} from "./economy.ts"
import { formatCompact, formatNumber, RAW_DIGITS_BELOW } from "./format.ts"
import { ownedArtIds } from "./phase.ts"
import { emojiIdleUrl, hasEmoji } from "../data/emojiAssets.ts"
import {
  DESK_CAT_EMOJI,
  DESK_CAT_CLICK_POOL,
  DESK_CAT_TITLE,
  EMOJI_CAPITAL,
  EMOJI_GEAR,
  EMOJI_GIGS,
  EMOJI_JOBS,
  EMOJI_SKILLS,
} from "../data/emojiCdn.ts"

/** Keep in step with DISALLOWED_TITLE in scripts/emojigg.mjs. */
const DISALLOWED_EMOJI_TITLE =
  /\b(nsfw|porn|hentai|rule34|nude|naked|boob|titty|penis|vagina|xxx|fuck|asshole|decap|naughty|gasm)\b|highway|interstate/i
import { freshSave, hydrate, OFFLINE_CAP_MS, offlineCredit, parseSave, SAVE_VERSION } from "./save.ts"
import { C } from "../pixel/palette.ts"
import { MAIN_SIZE, spriteGrid, THUMB_SIZE } from "../pixel/sprites.ts"
import { capDrops, WATERFALL_CAP, waterfallCount } from "./waterfall.ts"

const NONE = { skills: {}, equipment: {}, owned: {}, jobs: [], gigs: [] }

describe("economy", () => {
  it("grows cost by 1.15 and floors", () => {
    expect(COST_GROWTH).toBe(1.15)
    expect(nextCost(15, 0)).toBe(15)
    expect(nextCost(15, 1)).toBe(17)
    expect(nextCost(15, 2)).toBe(19)
  })

  it("adds click bonuses and leaves idle unboosted", () => {
    const batch = CAPITAL.find((row) => row.name === "WhyCombinator batch investment")
    if (!batch) throw new Error("missing WhyCombinator batch investment")
    expect(batch.clickBonus).toBe(10)
    const owned = { [String(batch.id)]: 2 }
    const p = { ...NONE, owned, equipment: { "1": 1 } }
    expect(clickPower(p)).toBe(1 + 2 + 20)
    const live = production(p, { mult: 10, endsAt: 1_000 }, 500)
    expect(live.click).toBe(230)
    expect(live.idle).toBeCloseTo(2 * batch.cps)
    expect(live.mult).toBe(10)
    const expired = production(p, { mult: 10, endsAt: 1_000 }, 1_000)
    expect(expired.click).toBe(23)
    expect(expired.idle).toBeCloseTo(live.idle)
    expect(expired.mult).toBe(1)
  })

  it("adds XP per click from skills on top of the base 1, and XP per second", () => {
    expect(xpPerClick({})).toBe(1)
    expect(xpPerSec({ skills: {}, jobs: [] })).toBe(0)
    const skills = { "1": 2, "2": 5, "14": 1 }
    expect(xpPerClick(skills)).toBe(1 + 2 * 1 + 1 * 3)
    const fromSkills = 5 * (SKILL_TIERS[1]?.xpPerSec ?? 0) + (SKILL_TIERS[13]?.xpPerSec ?? 0)
    expect(xpPerSec({ skills, jobs: [] })).toBeCloseTo(fromSkills)
  })

  it("adds idle XP from the jobs that teach on the job, and from no others", () => {
    const teaching = JOB_TIERS.filter((job) => job.xpPerSec > 0)
    const silent = JOB_TIERS.filter((job) => job.xpPerSec === 0)
    expect(teaching.length).toBeGreaterThan(0)
    expect(silent.length).toBeGreaterThan(0)
    // The internship and the mentor buddy teach; the QA rotation does not.
    expect(jobById(1)?.xpPerSec).toBeGreaterThan(0)
    expect(jobById(5)?.xpPerSec).toBe(0)
    const jobs = [1, 3, 5]
    expect(xpPerSec({ skills: {}, jobs })).toBe((jobById(1)?.xpPerSec ?? 0) + (jobById(3)?.xpPerSec ?? 0))
    const skills = { "2": 4 }
    expect(xpPerSec({ skills, jobs })).toBeCloseTo(xpPerSec({ skills, jobs: [] }) + xpPerSec({ skills: {}, jobs }))
    expect(production({ ...NONE, jobs }, null, 0).xpIdle).toBe(xpPerSec({ skills: {}, jobs }))
  })

  it("sums idle $/s from retainers, salaries, equipment and capital", () => {
    const p = { ...NONE, gigs: [1, 8, 17], jobs: [2, 14], equipment: { "17": 2, "44": 1 }, owned: { "3": 1 } }
    const parts = idleParts(p)
    expect(parts.retainers).toBeCloseTo(0 + 2 + 3)
    expect(parts.jobs).toBe(25 + 200)
    expect(parts.equipment).toBe(2 * 2 + 8)
    expect(parts.capital).toBe(800)
    expect(idlePerSec(p)).toBeCloseTo(5 + 225 + 12 + 800)
  })

  it("lists every owned source, biggest $/s first, summing to idle", () => {
    expect(ownedSources(NONE)).toEqual([])
    const p = { ...NONE, skills: { "1": 3, "5": 1 }, equipment: { "6": 2 }, gigs: [1, 8], jobs: [1, 2], owned: { "3": 1 } }
    const rows = ownedSources(p)
    expect(rows.map((row) => row.key)).toEqual(["capital:3", "job:2", "job:1", "gig:8", "equipment:6", "skill:5", "skill:1"])
    expect(rows.reduce((sum, row) => sum + row.idle, 0)).toBeCloseTo(idlePerSec(p))
    expect(rows.find((row) => row.key === "skill:1")?.click).toBe(3)
    expect(rows.find((row) => row.key === "equipment:6")?.click).toBe(6)
  })

  it("quotes the next copy, or nothing when the budget falls short", () => {
    expect(quotePurchase(100, 15, 0)).toEqual({ count: 1, total: 15 })
    expect(quotePurchase(100, 15, 0, 7)).toEqual({ count: 1, total: 7 })
    expect(quotePurchase(14, 15, 0)).toEqual({ count: 0, total: 0 })
    expect(quotePurchase(nextCost(15, 3) - 1, 15, 3).count).toBe(0)
    expect(canAfford(nextCost(15, 3), nextCost(15, 3))).toBe(true)
  })
})

describe("format", () => {
  it("keeps raw digits with separators below 10 million", () => {
    expect(RAW_DIGITS_BELOW).toBe(1e7)
    expect(formatNumber(0.1)).toBe("0.1")
    expect(formatNumber(12.4)).toBe("12.4")
    expect(formatNumber(999.6)).toBe("999")
    expect(formatNumber(1000)).toBe("1,000")
    expect(formatNumber(1500)).toBe("1,500")
    expect(formatNumber(12_345.9)).toBe("12,345")
    expect(formatNumber(500_000)).toBe("500,000")
    expect(formatNumber(1_234_567)).toBe("1,234,567")
    expect(formatNumber(9_999_999)).toBe("9,999,999")
    expect(formatNumber(-45_000)).toBe("-45,000")
  })

  it("abbreviates from 10 million on, with Cookie-style suffixes and no scientific notation in the tier range", () => {
    expect(formatNumber(1e7)).toBe("10M")
    expect(formatNumber(1.5e7)).toBe("15M")
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

  it("lets a caller pick the cutoff, and formatCompact brings K back", () => {
    expect(formatNumber(1500, 1000)).toBe("1.5K")
    expect(formatCompact(1500)).toBe("1.5K")
    expect(formatCompact(1e6)).toBe("1M")
    expect(formatCompact(999_999)).toBe("1M")
    expect(formatNumber(1500, 1e6)).toBe("1,500")
    expect(formatNumber(2_500_000, 1e6)).toBe("2.5M")
  })

  it("is not fooled by non-finite input", () => {
    expect(formatNumber(Number.NaN)).toBe("—")
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—")
  })
})

describe("save", () => {
  it("caps offline credit at 8 hours and writes the welcome toast", () => {
    const cps = 8
    const savedAt = 0
    const now = OFFLINE_CAP_MS + 60_000
    expect(offlineCredit(cps, savedAt, now)).toBe(cps * (OFFLINE_CAP_MS / 1000))
    const save = freshSave(savedAt)
    save.jobs = [1]
    save.money = 4
    const hydrated = hydrate(JSON.stringify(save), now)
    const credit = offlineCredit(cps, savedAt, now)
    expect(hydrated.save.money).toBe(4 + credit)
    const [sentence, creditLine] = (hydrated.toast ?? "").split("\n")
    expect(sentence?.endsWith(".")).toBe(true)
    // The internship also teaches, so the same away time studies too.
    const studied = offlineCredit(JOB_TIERS[0]?.xpPerSec ?? 0, savedAt, now)
    expect(hydrated.save.xp).toBeCloseTo(studied)
    expect(creditLine).toBe(`credited $${formatNumber(credit)} and studied +${formatNumber(studied)} XP`)
  })

  it("credits idle study XP offline and says so", () => {
    const save = freshSave(0)
    save.skills = { "2": 10 }
    const studied = 10 * (SKILL_TIERS[1]?.xpPerSec ?? 0) * 3600
    const hydrated = hydrate(JSON.stringify(save), 3_600_000)
    expect(hydrated.save.money).toBe(0)
    expect(hydrated.save.xp).toBeCloseTo(studied)
    expect(hydrated.save.xpTotal).toBeCloseTo(studied)
    const [sentence, creditLine] = (hydrated.toast ?? "").split("\n")
    expect(sentence?.endsWith(".")).toBe(true)
    expect(creditLine).toBe(`studied +${formatNumber(studied)} XP`)
  })

  it("drops an expired click boost and keeps a live one", () => {
    const now = 10_000
    const expired = hydrate(
      JSON.stringify({ version: SAVE_VERSION, money: 3, xp: 1, owned: { "3": 4 }, savedAt: now, activeBoost: { mult: 5, endsAt: now } }),
      now,
    )
    expect(expired.save.activeBoost).toBeUndefined()
    expect(expired.save.owned["3"]).toBe(4)

    const live = hydrate(
      JSON.stringify({ version: SAVE_VERSION, money: 0, xp: 0, owned: {}, savedAt: now, activeBoost: { mult: 2, endsAt: now + 5_000 } }),
      now,
    )
    expect(live.save.activeBoost).toEqual({ mult: 2, endsAt: now + 5_000 })
  })

  it("round-trips a save and normalises junk in the new fields", () => {
    const save = freshSave(5)
    save.xp = 40
    save.xpTotal = 900
    save.skills = { "3": 2 }
    save.equipment = { "1": 1 }
    save.jobs = [2, 1]
    save.gigs = [3, 1]
    const again = parseSave(JSON.parse(JSON.stringify(save)))
    expect(again).toMatchObject({ version: SAVE_VERSION, xp: 40, xpTotal: 900, skills: { "3": 2 }, equipment: { "1": 1 }, jobs: [1, 2], gigs: [1, 3] })

    const messy = parseSave({ version: SAVE_VERSION, xp: 50, xpTotal: 10, jobs: [1, 1, 99, "x", -2], gigs: [2, 2, 0.5, 404], skills: { "1": -3, a: 2 }, owned: { "99": 4, nope: 8 } })
    expect(messy?.xpTotal).toBe(50)
    expect(messy?.jobs).toEqual([1])
    expect(messy?.gigs).toEqual([2])
    expect(messy?.skills).toEqual({})
    expect(messy?.owned).toEqual({ "99": 4 })
  })

  it("wipes a save from any other version instead of migrating it", () => {
    const old = { version: 2, money: 1234, xp: 99_999, savedAt: 1, peakMoney: 5000, owned: { "1": 2, "26": 3 } }
    for (const payload of [old, { ...old, version: SAVE_VERSION - 1 }, { ...old, version: SAVE_VERSION + 1 }, { money: 9, owned: [2, 0, 3], savedAt: 50 }, [], "text", 7]) {
      expect(parseSave(payload)).toBeNull()
      const hydrated = hydrate(JSON.stringify(payload), 10_000)
      // A new career draws its own random name and handle; everything else is the fresh save.
      expect({ ...hydrated.save, profile: undefined }).toEqual({ ...freshSave(10_000), profile: undefined })
      expect(hydrated.save.profile?.handle).toMatch(/^[a-z]+-[a-z]+$/)
      expect(hydrated.toast).toMatch(/unreadable/)
    }
  })

  it("starts over when the payload is unreadable", () => {
    const hydrated = hydrate("{", 20)
    expect(hydrated.save.money).toBe(0)
    expect(hydrated.reset).toBe(true)
    expect(hydrated.toast).toMatch(/unreadable/)
  })
})

describe("click boosts", () => {
  it("clamps the exponential wait and rolls the era weights", () => {
    expect(sampleWaitMs(45_000, 0)).toBe(22_500)
    expect(sampleWaitMs(45_000, 0.999999)).toBe(112_500)
    expect(pickMultiplier(BOOST_BY_ERA.early.weights, 0)).toBe(3)
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
    const mean = BOOST_BY_ERA.early.meanWaitMs
    const wait = BOOST_WAIT_MIN_FACTOR * mean
    const first = advanceBoostClock(
      { activeBoost: null, nextBoostAt: null, idleSince: 0 },
      "early",
      0,
      rng,
    )
    expect(first.spawned).toBeNull()
    expect(first.clock.nextBoostAt).toBe(wait)

    const spawned = advanceBoostClock(first.clock, "early", wait, rng)
    expect(spawned.spawned).toEqual({ mult: 3, endsAt: wait + 8_000 })
    expect(spawned.clock.nextBoostAt).toBeNull()

    const still = advanceBoostClock(spawned.clock, "early", wait + 2_000, rng)
    expect(still.spawned).toBeNull()
    expect(still.clock.activeBoost?.mult).toBe(3)

    const endsAt = wait + 8_000
    const ended = advanceBoostClock(still.clock, "early", endsAt, rng)
    expect(ended.spawned).toBeNull()
    expect(ended.clock.activeBoost).toBeNull()
    expect(ended.clock.nextBoostAt).toBe(endsAt + 1_000 + wait)

    const pity = advanceBoostClock(
      { activeBoost: null, nextBoostAt: 999_999_999, idleSince: 0 },
      "early",
      BOOST_PITY_FACTOR * mean,
      rng,
    )
    expect(pity.spawned?.mult).toBe(3)
    expect(pity.clock.activeBoost).toEqual(pity.spawned)
  })

  it("holds a due or pity roll while a prompt is open, then spawns once it lifts", () => {
    const rng = () => 0
    const mean = BOOST_BY_ERA.early.meanWaitMs
    const now = BOOST_PITY_FACTOR * mean
    const clock = { activeBoost: null, nextBoostAt: 1, idleSince: 0 }
    const held = advanceBoostClock(clock, "early", now, rng, true)
    expect(held.spawned).toBeNull()
    expect(held.clock.activeBoost).toBeNull()
    expect(advanceBoostClock(held.clock, "early", now, rng, false).spawned).not.toBeNull()
  })
})

describe("catalog tables", () => {
  const contiguous = (rows: readonly { id: number }[]) => rows.every((row, index) => row.id === index + 1)

  it("ships Catalogs v4: 104 skills, 65 gigs, 31 jobs, 110 gear, 25 capital, ids 1..n", () => {
    expect([SKILL_TIERS.length, GIGS.length, JOB_TIERS.length, EQUIPMENT.length, CAPITAL.length]).toEqual([104, 65, 31, 110, 25])
    for (const rows of [SKILL_TIERS, GIGS, JOB_TIERS, EQUIPMENT, CAPITAL]) expect(contiguous(rows)).toBe(true)
  })

  it("doubles purchase prices and leaves payouts and gig lumps alone", () => {
    const scale = PURCHASE_COST_SCALE
    expect(SKILL_TIERS[0]?.baseXpCost).toBe(Math.ceil(120 * scale))
    expect(SKILL_TIERS[0]?.firstXpCost).toBe(90)
    expect(SKILL_TIERS[0]?.xpPerClick).toBe(1)
    expect(JOB_TIERS[0]?.xpCost).toBe(0)
    expect(JOB_TIERS[1]?.xpCost).toBe(Math.round(45_000 * 0.25 * scale))
    expect(JOB_TIERS[1]?.cps).toBe(25)
    expect(EQUIPMENT[0]?.baseCost).toBeCloseTo(200 * scale)
    expect(EQUIPMENT[0]?.clickBonus).toBe(2)
    expect(CAPITAL[0]?.baseCost).toBeCloseTo(100_000 * scale)
    expect(CAPITAL[0]?.cps).toBe(50)
    expect(GIGS[0]?.lump).toBe(40)
    expect(GEAR_TAB_UNLOCK.minXp).toBe(10_000)
  })

  it("keeps every row paid for: positive costs, and an income or click bonus", () => {
    for (const row of [...EQUIPMENT, ...CAPITAL]) {
      expect(row.baseCost).toBeGreaterThan(0)
      expect(row.cps + row.clickBonus).toBeGreaterThan(0)
    }
    for (const row of SKILL_TIERS) expect(row.xpPerClick + row.xpPerSec).toBeGreaterThan(0)
    for (const job of JOB_TIERS) expect(job.cps).toBeGreaterThan(0)
  })

  it("draws every capital row with a real sprite, with eras that never go backwards", () => {
    const order = ["mid", "upper", "q3", "end"]
    let last = 0
    for (const row of CAPITAL) {
      expect(row.artId).toBeGreaterThanOrEqual(19)
      expect(row.artId).toBeLessThanOrEqual(66)
      expect(order.indexOf(row.era)).toBeGreaterThanOrEqual(last)
      last = order.indexOf(row.era)
    }
  })

  it("uses no real brand names", () => {
    const banned =
      /\b(stack ?overflow|freecodecamp|youtube|github|kaggle|pytorch|tensorflow|y combinator|yc|raspberry pi|mac mini|openclaw|docker|kubernetes|hacker news|blackwell|leetcode|upwork|discord|linkedin|wordpress|figma|shopify|stripe|auth0|clerk|cs50|mdn|redis|graphql|trpc|postgres|chrome)\b/i
    const names = [...CAPITAL, ...SKILL_TIERS, ...GIGS, ...JOB_TIERS, ...EQUIPMENT].map((row) => row.name)
    for (const name of names) expect(name).not.toMatch(banned)
  })
})

describe("emoji.gg art", () => {
  const tables = [
    ["skill", EMOJI_SKILLS],
    ["gig", EMOJI_GIGS],
    ["job", EMOJI_JOBS],
    ["gear", EMOJI_GEAR],
    ["capital", EMOJI_CAPITAL],
  ] as const

  it("assigns an idle and a click image for every catalog row", () => {
    expect(Object.keys(EMOJI_SKILLS).length).toBe(SKILL_TIERS.length + 1)
    expect(hasEmoji("skill", 0)).toBe(true)
    expect(Object.keys(EMOJI_GIGS).length).toBe(GIGS.length)
    expect(Object.keys(EMOJI_JOBS).length).toBe(JOB_TIERS.length)
    expect(Object.keys(EMOJI_GEAR).length).toBe(EQUIPMENT.length)
    expect(Object.keys(EMOJI_CAPITAL).length).toBe(CAPITAL.length)
    for (const row of SKILL_TIERS) expect(hasEmoji("skill", row.id)).toBe(true)
    for (const row of GIGS) expect(hasEmoji("gig", row.id)).toBe(true)
    for (const row of JOB_TIERS) expect(hasEmoji("job", row.id)).toBe(true)
    for (const row of EQUIPMENT) expect(hasEmoji("equipment", row.id)).toBe(true)
    for (const row of CAPITAL) expect(hasEmoji("capital", row.id)).toBe(true)
  })

  it("hotlinks emoji.gg and does not stamp one image everywhere", () => {
    const seen = new Map<string, number>()
    for (const [, table] of tables) {
      for (const art of Object.values(table)) {
        expect(art.idle).toMatch(/^https:\/\/cdn3\.emoji\.gg\/emojis\//)
        expect(art.click).toMatch(/^https:\/\/cdn3\.emoji\.gg\/emojis\//)
        expect(art.idle).not.toBe(art.click)
        expect(art.label).not.toMatch(DISALLOWED_EMOJI_TITLE)
        for (const url of [art.idle, art.click]) seen.set(url, (seen.get(url) ?? 0) + 1)
      }
    }
    for (const count of seen.values()) expect(count).toBe(1)
    expect(EMOJI_CAPITAL[25].label.toLowerCase()).toMatch(/building|rocket/)
    expect(DESK_CAT_EMOJI).toMatch(/^https:\/\/cdn3\.emoji\.gg\/emojis\//)
    expect(DESK_CAT_TITLE).not.toMatch(DISALLOWED_EMOJI_TITLE)
    expect(DESK_CAT_EMOJI).not.toBe(EMOJI_SKILLS[0].idle)
    expect(DESK_CAT_CLICK_POOL.length).toBeGreaterThanOrEqual(100)
    expect(DESK_CAT_CLICK_POOL.length).toBeLessThanOrEqual(300)
    for (const url of DESK_CAT_CLICK_POOL) {
      expect(url).toMatch(/^https:\/\/cdn3\.emoji\.gg\/emojis\//)
      expect(url).not.toBe(DESK_CAT_EMOJI)
    }
  })

  it("does not show the ERROR stamp as job art", () => {
    const frontend = JOB_TIERS.find((job) => job.name === "Frontend specialist")
    const advisor = JOB_TIERS.find((job) => job.name === "Board advisor (tech)")
    expect(frontend?.id).toBe(11)
    expect(advisor?.id).toBe(25)
    for (const job of JOB_TIERS) {
      const idle = emojiIdleUrl("job", job.id) ?? ""
      expect(idle).not.toMatch(/\/Error\.png$/i)
      expect(idle.length).toBeGreaterThan(0)
    }
    expect(emojiIdleUrl("job", frontend?.id ?? 0)).toMatch(/10881-unicorn\.png$/)
    expect(emojiIdleUrl("job", advisor?.id ?? 0)).toMatch(/280352-chess\.png$/)
  })
})

describe("pixel sprites", () => {
  const ids = Array.from({ length: 67 }, (_, id) => id)

  it("draws the opening scene and every tier at 64×64 and 32×32 in at most 16 colours", () => {
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

describe("click waterfall", () => {
  it("spawns one thumb per click and one or two more during a boost", () => {
    expect(waterfallCount(false)).toBe(1)
    expect(waterfallCount(true, () => 0)).toBe(2)
    expect(waterfallCount(true, () => 0.99)).toBe(3)
  })

  it("keeps a bounded number of concurrent thumbs and evicts the oldest", () => {
    expect(WATERFALL_CAP).toBeGreaterThanOrEqual(12)
    expect(WATERFALL_CAP).toBeLessThanOrEqual(30)
    let live: number[] = []
    for (let i = 0; i < 200; i++) live = capDrops(live, [i, i + 1000])
    expect(live).toHaveLength(WATERFALL_CAP)
    expect(live[live.length - 1]).toBe(1199)
  })

  it("only draws from owned items of every kind", () => {
    expect(ownedArtIds(NONE)).toEqual([])
    const capitalArt = CAPITAL.find((row) => row.id === 1)?.artId
    const ids = ownedArtIds({ skills: { "1": 2, "2": 0 }, equipment: { "1": 1 }, owned: { "1": 1 }, jobs: [1], gigs: [1] })
    expect(ids.sort((a, b) => a - b)).toEqual([...new Set([SKILL_ART[0], EQUIP_ART[0], capitalArt, JOB_ART[0], GIG_ART[0]])].sort((a, b) => (a ?? 0) - (b ?? 0)))
  })
})

describe("hidden upgrades", () => {
  it("reveals each capital row once its own price has been held", () => {
    const [first, second, third] = CAPITAL
    if (!first || !second || !third) throw new Error("need three rows")
    expect(isRevealed(first, {}, 0)).toBe(false)
    expect(isRevealed(first, {}, first.baseCost - 1)).toBe(false)
    expect(isRevealed(first, {}, first.baseCost)).toBe(true)
    expect(isRevealed(second, {}, first.baseCost)).toBe(false)
    expect(isRevealed(first, { [String(third.id)]: 1 }, 0)).toBe(false)
    expect(isRevealed(third, { [String(third.id)]: 1 }, 0)).toBe(true)
  })

  it("shows owned rows and always the next unowned row, even while that row is still locked", () => {
    const [first, , third] = SKILL_TIERS
    if (!first || !third) throw new Error("need three skills")
    const owned = { [String(third.id)]: 1 }
    const visible = visibleShopRows(SKILL_TIERS, (row) => (owned[String(row.id)] ?? 0) > 0)
    expect(visible.map((row) => row.id)).toEqual([first.id, third.id])

    const waiting = visibleShopRows(
      [
        { id: 1, owned: true },
        { id: 2, owned: false },
        { id: 3, owned: false },
        { id: 4, owned: true },
      ],
      (row) => row.owned,
    )
    expect(waiting.map((row) => row.id)).toEqual([1, 2, 4])
    const pinned = visibleShopRows(
      [
        { id: 1, owned: true },
        { id: 2, owned: false },
        { id: 3, owned: false },
        { id: 4, owned: true },
      ],
      (row) => row.owned,
      (row) => row.id === 3,
    )
    expect(pinned.map((row) => row.id)).toEqual([1, 2, 3, 4])
  })

  it("reveals a skill by lifetime XP, or when owned", () => {
    const [first, second, third] = SKILL_TIERS
    if (!first || !second || !third) throw new Error("need three skills")
    expect(isSkillRevealed(first, {}, 0)).toBe(true)
    expect(isSkillRevealed(second, {}, 0)).toBe(false)
    expect(isSkillRevealed(second, {}, second.unlockAtXp)).toBe(true)
    expect(isSkillRevealed(third, {}, third.unlockAtXp - 1)).toBe(false)
    expect(isSkillRevealed(third, {}, third.unlockAtXp)).toBe(true)
    expect(isSkillRevealed(third, { [String(third.id)]: 1 }, 0)).toBe(true)
  })

  it("persists the peak balance and never lets it fall below current money", () => {
    const fresh = freshSave(1_000)
    expect(fresh.peakMoney).toBe(0)
    const loaded = hydrate(JSON.stringify({ ...fresh, money: 20, peakMoney: 500, savedAt: 1_000 }), 1_000)
    expect(loaded.save.peakMoney).toBe(500)
    const unset = hydrate(JSON.stringify({ version: SAVE_VERSION, money: 90, xp: 0, owned: {}, savedAt: 1_000 }), 1_000)
    expect(unset.save.peakMoney).toBe(90)
  })
})
