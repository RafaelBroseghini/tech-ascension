import { describe, expect, it } from "vitest"
import { GOLD_SKILLS } from "../data/gold.ts"
import { FEATURES } from "../data/features.ts"
import { CAPITAL } from "../data/capital.ts"
import { IDE_BANDS } from "../data/idePacks.ts"
import { JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { stageOf } from "./phase.ts"
import type { FeatureProgress } from "./features.ts"
import {
  clickKitChoices,
  featureById,
  isCosmetic,
  musicChoices,
  nextGhost,
  openFeatureIds,
  rowUnlocks,
  themeChoices,
  triggerLabel,
  triggerMet,
  triggerProgress,
  upNext,
} from "./features.ts"

/** The first 10x dev row a career can reach on XP alone (Hover Tap also waits for a Senior SWE). */
const OPEN_ROW = GOLD_SKILLS.find((row) => !row.unlockJobRank)!

function progress(over: Partial<FeatureProgress> = {}): FeatureProgress {
  return {
    money: 0,
    xp: 0,
    xpTotal: 0,
    peakMoney: 0,
    skills: {},
    equipment: {},
    owned: {},
    jobs: [],
    gigs: [],
    gold: [],
    returns: 0,
    playTimeMs: 0,
    ...over,
  }
}

const none = new Set<string>()

describe("the feature table", () => {
  it("has unique ids, and every cosmetic waits on a picker in the table", () => {
    const ids = FEATURES.map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const row of FEATURES.filter(isCosmetic)) {
      expect(featureById(row.parent!)).toBeDefined()
      expect(featureById(row.parent!)?.parent).toBeUndefined()
    }
  })

  it("points every trigger at a row that exists", () => {
    for (const row of FEATURES) {
      const trigger = row.trigger
      if (trigger.kind === "skill") expect(SKILL_TIERS.some((skill) => skill.id === trigger.id)).toBe(true)
      if (trigger.kind === "art") expect(IDE_BANDS.some((band) => band.fromTier === trigger.tier)).toBe(true)
      expect(triggerLabel(trigger)).not.toBe("")
    }
  })
})

describe("gates", () => {
  it("opens nothing at minute zero", () => {
    expect(openFeatureIds(progress())).toEqual([])
  })

  it("opens a skill row with the skill and a gear row with the gear", () => {
    expect(triggerMet({ kind: "skill", id: 8 }, progress({ skills: { "8": 1 } }))).toBe(true)
    expect(triggerMet({ kind: "skill", id: 8 }, progress({ skills: { "7": 1 } }))).toBe(false)
    expect(triggerMet({ kind: "gear", id: 11 }, progress({ equipment: { "11": 2 } }))).toBe(true)
  })

  it("opens the firsts, the boards and the 10x dev section from progress", () => {
    const p = progress({ gigs: [1], peakMoney: 40, xpTotal: OPEN_ROW.unlockXp, skills: { "15": 1, "16": 1 } })
    expect(triggerMet({ kind: "firstGig" }, p)).toBe(true)
    expect(triggerMet({ kind: "money" }, p)).toBe(true)
    expect(triggerMet({ kind: "firstJob" }, p)).toBe(false)
    expect(triggerMet({ kind: "board", board: "gigs" }, p)).toBe(true)
    expect(triggerMet({ kind: "board", board: "gear" }, p)).toBe(true)
    expect(triggerMet({ kind: "gold" }, p)).toBe(true)
    expect(triggerMet({ kind: "board", board: "capital" }, p)).toBe(false)
  })

  it("brings the cat with the first job, never for time spent or a return alone", () => {
    const cat = FEATURES.find((row) => row.id === "cat")!
    expect(triggerMet(cat.trigger, progress())).toBe(false)
    expect(triggerMet(cat.trigger, progress({ playTimeMs: 24 * 60 * 60 * 1000, returns: 3 }))).toBe(false)
    expect(triggerMet(cat.trigger, progress({ jobs: [1] }))).toBe(true)
  })

  it("counts an era as reached once any row of that era or a later one is owned", () => {
    expect(triggerMet({ kind: "era", era: "mid" }, progress({ owned: { "6": 1 } }))).toBe(true)
    expect(triggerMet({ kind: "era", era: "upper" }, progress({ owned: { "1": 1 } }))).toBe(false)
  })

  it("a theme opens at its art tier", () => {
    const themes = FEATURES.filter((row) => row.id.startsWith("theme:") && row.trigger.kind === "art")
    expect(themes.map((row) => [row.id, row.trigger.kind === "art" ? row.trigger.tier : 0])).toEqual([
      ["theme:solarized-light", 19],
      ["theme:tokyo-night", 23],
      ["theme:monokai", 27],
      ["theme:gruvbox", 31],
      ["theme:github-light", 34],
      ["theme:gruvbox-light", 37],
      ["theme:synthwave", 50],
    ])
    const stages = [...JOB_TIERS.map((job) => progress({ jobs: [job.id] })), ...CAPITAL.map((row) => progress({ owned: { [row.id]: 1 } }))]
    for (const row of themes) {
      if (row.trigger.kind !== "art") continue
      const tier = row.trigger.tier
      const arts = stages.map((p) => stageOf(p)?.artId ?? 0)
      expect(arts.some((art) => art < tier) && arts.some((art) => art >= tier)).toBe(true)
      for (const [i, p] of stages.entries()) expect(triggerMet(row.trigger, p)).toBe((arts[i] ?? 0) >= tier)
    }
    expect(triggerMet({ kind: "art", tier: 19 }, progress())).toBe(false)
  })
})

describe("teasing", () => {
  it("lists the next closed rows in table order, skipping cosmetics", () => {
    expect(upNext(progress(), none).map((row) => row.id)).toEqual(["studio", "careerLog", "githug"])
    const later = upNext(progress({ skills: { "1": 1 } }), new Set(["studio"]))
    expect(later.map((row) => row.id)).toEqual(["careerLog", "githug", "linkedout"])
  })

  it("stands one row in its place: the first closed one with a slot on screen", () => {
    expect(nextGhost(progress(), none)?.id).toBe("careerLog")
    expect(nextGhost(progress({ skills: { "5": 1 } }), new Set(["studio", "careerLog", "githug"]))?.id).toBe("linkedout")
  })

  it("fills the ring as the trigger gets close, and reads full once it opens", () => {
    const skill = SKILL_TIERS[7]!
    const far = triggerProgress({ kind: "skill", id: 8 }, progress({ xpTotal: skill.unlockAtXp / 2 }))
    const near = triggerProgress({ kind: "skill", id: 8 }, progress({ xpTotal: skill.unlockAtXp, xp: skill.baseXpCost - 1 }))
    expect(far.fill).toBeLessThan(near.fill)
    expect(near.left).toBe("more XP")
    expect(triggerProgress({ kind: "skill", id: 8 }, progress({ skills: { "8": 1 } }))).toEqual({ fill: 1, left: "" })
  })
})

describe("rows that open something", () => {
  it("names the feature a shop row opens", () => {
    expect(rowUnlocks("skill:1")).toEqual([])
    expect(rowUnlocks("skill:8")).toEqual([])
    expect(rowUnlocks("gear:11").map((row) => row.id)).toEqual(["themes", "theme:dracula"])
    expect(rowUnlocks("gig:1")).toEqual([])
  })

  it("lists only the cosmetics a career has earned, on top of the starting ones", () => {
    expect(themeChoices(none)).toEqual(["mocha", "latte"])
    expect(themeChoices(new Set(["themes", "theme:dracula"]))).toEqual(["mocha", "latte", "dracula"])
    expect(clickKitChoices(new Set(["kit:felt"]))).toEqual(["thock", "felt"])
    expect(musicChoices(none)).toEqual([])
    expect(musicChoices(new Set(["music", "music:cozy"]))).toEqual(["cozy"])
  })

  describe("the gif parade", () => {
    const parade = featureById("parade")!

    it("is a mid-game row: it opens with the first mid-era capital row and not before", () => {
      expect(parade.trigger).toEqual({ kind: "era", era: "mid" })
      expect(openFeatureIds(progress({ owned: {} }))).not.toContain("parade")
      expect(openFeatureIds(progress({ jobs: [1, 2, 3, 4, 5, 6, 7], gigs: [1, 2, 3, 4, 5, 6], xpTotal: 1e9 }))).not.toContain("parade")
      expect(openFeatureIds(progress({ owned: { "1": 1 } }))).toContain("parade")
    })

    it("is not opened by the cats, the rows held or a hover skill (the things that fill it)", () => {
      expect(openFeatureIds(progress({ gigs: [1, 2, 3, 4, 5, 6, 7, 8], jobs: [1, 2, 3], xpTotal: 1e9 }))).not.toContain("parade")
    })
  })
})
