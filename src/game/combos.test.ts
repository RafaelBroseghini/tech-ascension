import { beforeEach, describe, expect, it, vi } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { COMBO_CAP_PCT, COMBOS } from "../data/combos.ts"
import type { ComboRef } from "../data/combos.ts"
import { GEAR } from "../data/gear.ts"
import { GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { isTag } from "../data/tags.ts"
import { PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import { comboFactors, comboTotals, effectLabel, foundCombos, newCombos, normalizeComboIds } from "./combos.ts"
import type { ComboHoldings } from "./combos.ts"
import { readCareerText } from "./ledger.ts"
import { hydrate, parseSave } from "./save.ts"
import { persistNow, useGame } from "./store.ts"

const TABLES = {
  skill: new Set(SKILL_TIERS.map((row) => row.id)),
  gig: new Set(GIGS.map((row) => row.id)),
  job: new Set(JOB_TIERS.map((row) => row.id)),
  gear: new Set(GEAR.map((row) => row.id)),
  capital: new Set(CAPITAL.map((row) => row.id)),
}

const EMPTY: ComboHoldings = { skills: {}, equipment: {}, owned: {}, jobs: [], gigs: [] }

/** Holdings that hold exactly the row refs given. Tag refs are not built here. */
function holding(...refs: ComboRef[]): ComboHoldings {
  const h = { skills: {} as Record<string, number>, equipment: {} as Record<string, number>, owned: {} as Record<string, number>, jobs: [] as number[], gigs: [] as number[] }
  for (const ref of refs) {
    if (ref.kind === "tag") throw new Error("a tag is not a row")
    const key = String(ref.id)
    if (ref.kind === "skill") h.skills[key] = 1
    else if (ref.kind === "gear") h.equipment[key] = 1
    else if (ref.kind === "capital") h.owned[key] = 1
    else if (ref.kind === "job") h.jobs.push(ref.id)
    else h.gigs.push(ref.id)
  }
  return h
}

// Slang, slurs, adult words and plain swearing. Whole words only, so "class" and "title" are fine.
const BANNED = [
  "anal", "anus", "ass", "asshole", "balls", "bastard", "beaver", "bitch", "boner", "boob", "butt", "chink", "cock", "coon", "crap",
  "cum", "cunt", "damn", "dick", "dong", "dyke", "fag", "fap", "fuck", "goddamn", "gook", "hell", "hitler", "hoe", "homo", "horny",
  "jap", "jizz", "kike", "kkk", "milf", "nazi", "nigga", "nigger", "nude", "orgy", "pedo", "piss", "porn", "prick", "pussy", "rape",
  "retard", "sex", "shit", "slut", "spic", "suck", "tard", "thot", "tits", "twat", "wank", "whore", "wop", "xxx",
]
const SUFFIXES = ["", "s", "es", "ed", "er", "ing", "y"]

function bannedWordIn(text: string): string | null {
  for (const word of text.toLowerCase().split(/[^a-z]+/)) {
    for (const banned of BANNED) {
      if (SUFFIXES.some((suffix) => word === banned + suffix)) return word
    }
  }
  return null
}

describe("the combo table", () => {
  it("has unique ids and two different ingredients each", () => {
    expect(new Set(COMBOS.map((row) => row.id)).size).toBe(COMBOS.length)
    for (const row of COMBOS) expect(JSON.stringify(row.a), `${row.id}: a and b differ`).not.toBe(JSON.stringify(row.b))
  })

  it("points every ingredient at a real row or a real tag held at least once", () => {
    for (const row of COMBOS) {
      for (const ref of [row.a, row.b]) {
        if (ref.kind === "tag") {
          expect(isTag(ref.tag), `${row.id}: tag ${ref.tag}`).toBe(true)
          expect(ref.count, `${row.id}: tag count`).toBeGreaterThanOrEqual(1)
        } else {
          expect(TABLES[ref.kind].has(ref.id), `${row.id}: ${ref.kind} ${ref.id}`).toBe(true)
        }
      }
    }
  })

  it("keeps each effect between 1 and 5 percent, and caps each kind", () => {
    for (const row of COMBOS) {
      expect(row.effect.pct, row.id).toBeGreaterThanOrEqual(1)
      expect(row.effect.pct, row.id).toBeLessThanOrEqual(5)
    }
    const totals = comboTotals(COMBOS)
    for (const kind of ["idle", "click", "xp"] as const) {
      const raw = COMBOS.filter((row) => row.effect.kind === kind).reduce((sum, row) => sum + row.effect.pct, 0)
      expect(totals[kind]).toBe(Math.min(COMBO_CAP_PCT, raw))
      expect(totals[kind]).toBeLessThanOrEqual(COMBO_CAP_PCT)
    }
    // Many copies of the whole table still stop at the cap.
    const piled = comboTotals([...COMBOS, ...COMBOS, ...COMBOS, ...COMBOS, ...COMBOS, ...COMBOS, ...COMBOS, ...COMBOS])
    expect(piled).toEqual({ idle: COMBO_CAP_PCT, click: COMBO_CAP_PCT, xp: COMBO_CAP_PCT })
  })

  it("writes clean names and jokes", () => {
    for (const row of COMBOS) {
      expect(row.name.length, row.id).toBeGreaterThan(0)
      expect(row.joke.length, row.id).toBeGreaterThan(0)
      expect(bannedWordIn(row.name), `${row.id} name`).toBeNull()
      expect(bannedWordIn(row.joke), `${row.id} joke`).toBeNull()
    }
  })

  it("the word scan catches what it should", () => {
    expect(bannedWordIn("What the hell")).toBe("hell")
    expect(bannedWordIn("Shits and giggles")).toBe("shits")
    expect(bannedWordIn("A class on titles and passes")).toBeNull()
  })
})

describe("finding combos", () => {
  const sample = COMBOS.find((row) => row.a.kind !== "tag" && row.b.kind !== "tag")!

  it("finds a combo only when both ingredients are held", () => {
    expect(foundCombos(EMPTY)).toEqual([])
    expect(foundCombos(holding(sample.a)).map((row) => row.id)).not.toContain(sample.id)
    expect(foundCombos(holding(sample.b)).map((row) => row.id)).not.toContain(sample.id)
    expect(foundCombos(holding(sample.a, sample.b)).map((row) => row.id)).toContain(sample.id)
  })

  it("reads a tag ingredient from the rows held", () => {
    const row = COMBOS.find((entry) => entry.id === "zero-trust")!
    expect(foundCombos(EMPTY)).not.toContain(row)
    const skills: Record<string, number> = {}
    for (const tier of SKILL_TIERS) if (tier.tags.includes("security") || tier.tags.includes("infra")) skills[String(tier.id)] = 1
    expect(foundCombos({ ...EMPTY, skills }).map((entry) => entry.id)).toContain("zero-trust")
  })

  it("reports only the combos not known yet", () => {
    const h = holding(sample.a, sample.b)
    expect(newCombos(h, []).map((row) => row.id)).toContain(sample.id)
    expect(newCombos(h, [sample.id]).map((row) => row.id)).not.toContain(sample.id)
  })

  it("adds the found combos into the rate factors, each kind capped", () => {
    expect(comboFactors(EMPTY)).toEqual({ click: 1, cps: 1, xpIdle: 1 })
    const h = holding(sample.a, sample.b)
    const factors = comboFactors(h)
    const totals = comboTotals(foundCombos(h))
    expect(factors.cps).toBeCloseTo(1 + totals.idle / 100, 12)
    expect(factors.click).toBeCloseTo(1 + totals.click / 100, 12)
    expect(factors.xpIdle).toBeCloseTo(1 + totals.xp / 100, 12)
    expect(effectLabel(sample.effect)).toMatch(/^\+\d+% /)
  })

  it("drops unknown ids and duplicates from a save", () => {
    const [first, second] = COMBOS
    expect(normalizeComboIds([second!.id, "nonsense", first!.id, second!.id, 7, null])).toEqual([first!.id, second!.id])
    expect(normalizeComboIds(undefined)).toEqual([])
    expect(normalizeComboIds("line-noise")).toEqual([])
  })
})

describe("the kitchen in the store", () => {
  const combo = COMBOS.find((row) => row.id === "line-noise")!
  const comboLines = () => useGame.getState().journal.entries.filter((entry) => entry.type === "combo")

  function learn(...ids: number[]) {
    for (const id of ids) {
      useGame.setState((state) => ({ xp: state.xp + 50_000, xpTotal: Math.max(state.xpTotal, 50_000) }))
      const before = useGame.getState().skills[String(id)] ?? 0
      useGame.getState().buySkill(id)
      expect(useGame.getState().skills[String(id)] ?? 0).toBe(before + 1)
    }
  }

  beforeEach(() => {
    useGame.getState().wipe()
  })

  it("finds a combo once, with one journal line, when the second ingredient lands", () => {
    expect(combo.a).toEqual({ kind: "skill", id: 11 })
    expect(combo.b).toEqual({ kind: "skill", id: 12 })
    learn(11)
    expect(useGame.getState().combos).toEqual([])
    expect(comboLines()).toHaveLength(0)
    learn(12)
    expect(useGame.getState().combos).toEqual(["line-noise"])
    expect(comboLines()).toHaveLength(1)
    expect(comboLines()[0]).toMatchObject({ type: "combo", ref: "combo:line-noise" })
    // More copies and more purchases do not find it again.
    learn(12, 13)
    expect(useGame.getState().combos.filter((id) => id === "line-noise")).toHaveLength(1)
    expect(comboLines().filter((entry) => entry.ref === "combo:line-noise")).toHaveLength(1)
  })

  it("survives a save and load, and does not journal again", async () => {
    learn(11, 12)
    persistNow()
    const saved = parseSave(JSON.parse(readCareerText() ?? "null"))
    expect(saved?.combos).toEqual(["line-noise"])
    const loaded = hydrate(JSON.stringify(saved), Date.now())
    expect(loaded.save.combos).toEqual(["line-noise"])
    // A fresh boot of the store restores it from the save and finds nothing new to journal.
    const lines = comboLines().length
    vi.resetModules()
    const ledger = await import("./ledger.ts")
    ledger.stageCareer(saved!)
    const reloaded = await import("./store.ts")
    expect(reloaded.useGame.getState().combos).toEqual(["line-noise"])
    expect(reloaded.useGame.getState().journal.entries.filter((entry) => entry.type === "combo")).toHaveLength(lines)
  })

  it("leaves the field out of a save with none", () => {
    persistNow()
    expect(parseSave(JSON.parse(readCareerText() ?? "null"))?.combos).toBeUndefined()
  })

  it("starts over with a wipe", () => {
    learn(11, 12)
    expect(useGame.getState().combos).toHaveLength(1)
    useGame.getState().wipe()
    expect(useGame.getState().combos).toEqual([])
    expect(comboLines()).toHaveLength(0)
  })

  it("starts over with an Exit", () => {
    learn(11, 12)
    useGame.setState((state) => ({ stats: { ...state.stats, lifetimeEarned: PRESTIGE_EARN_SCALE * 10 } }))
    expect(useGame.getState().exit()).not.toBe(false)
    expect(useGame.getState().combos).toEqual([])
    expect(useGame.getState().skills).toEqual({})
  })
})
