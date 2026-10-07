import { describe, expect, it } from "vitest"
import { FEATURES } from "../data/features.ts"
import { IDE_PACKS } from "../data/idePacks.ts"
import { SKILL_TIERS } from "../data/phases.ts"
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
      if (trigger.kind === "folder") expect(IDE_PACKS.some((pack) => pack.id === trigger.packId)).toBe(true)
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
    const p = progress({ gigs: [1], peakMoney: 40, xpTotal: 15_000, skills: { "15": 1, "16": 1 } })
    expect(triggerMet({ kind: "firstGig" }, p)).toBe(true)
    expect(triggerMet({ kind: "money" }, p)).toBe(true)
    expect(triggerMet({ kind: "firstJob" }, p)).toBe(false)
    expect(triggerMet({ kind: "board", board: "gigs" }, p)).toBe(true)
    expect(triggerMet({ kind: "board", board: "gear" }, p)).toBe(true)
    expect(triggerMet({ kind: "gold" }, p)).toBe(true)
    expect(triggerMet({ kind: "board", board: "capital" }, p)).toBe(false)
  })

  it("brings the cat after a quarter of an hour at the desk, or sooner on a return", () => {
    expect(triggerMet({ kind: "settled" }, progress())).toBe(false)
    expect(triggerMet({ kind: "settled" }, progress({ playTimeMs: 15 * 60 * 1000 - 1 }))).toBe(false)
    expect(triggerMet({ kind: "settled" }, progress({ playTimeMs: 15 * 60 * 1000 }))).toBe(true)
    expect(triggerMet({ kind: "settled" }, progress({ returns: 1 }))).toBe(true)
    expect(triggerProgress({ kind: "settled" }, progress({ playTimeMs: 5 * 60 * 1000 }))).toEqual({ fill: 1 / 3, left: "more time at the desk" })
  })

  it("counts an era as reached once any row of that era or a later one is owned", () => {
    expect(triggerMet({ kind: "era", era: "mid" }, progress({ owned: { "6": 1 } }))).toBe(true)
    expect(triggerMet({ kind: "era", era: "upper" }, progress({ owned: { "1": 1 } }))).toBe(false)
  })
})

describe("teasing", () => {
  it("lists the next closed rows in table order, skipping cosmetics", () => {
    expect(upNext(progress(), none).map((row) => row.id)).toEqual(["editor", "terminal", "careerLog"])
    const later = upNext(progress({ skills: { "1": 1 } }), new Set(["editor"]))
    expect(later.map((row) => row.id)).toEqual(["terminal", "careerLog", "githug"])
  })

  it("stands one row in its place: the first closed one with a slot on screen", () => {
    expect(nextGhost(progress(), none)?.id).toBe("terminal")
    expect(nextGhost(progress({ skills: { "8": 1 } }), new Set(["editor", "terminal"]))?.id).toBe("careerLog")
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
    expect(rowUnlocks("skill:8").map((row) => row.id)).toEqual(["terminal"])
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
})
