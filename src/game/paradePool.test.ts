import { describe, expect, it } from "vitest"
import { emojiClickUrl, emojiIdleUrl } from "../data/emojiAssets.ts"
import { EQUIPMENT, SKILL_TIERS } from "../data/phases.ts"
import { CAT_ROSTER } from "./catRoster.ts"
import { isGif } from "./gifParade.ts"
import { heldGifs, paradeCounts, paradePool, type ParadeProgress } from "./paradePool.ts"

function progress(over: Partial<ParadeProgress> = {}): ParadeProgress {
  return { catsFound: [], skills: {}, equipment: {}, owned: {}, jobs: [], gigs: [], xpTotal: 0, peakMoney: 0, ...over }
}

const gifsOf = (kind: "skill" | "equipment", id: number) =>
  [emojiIdleUrl(kind, id), emojiClickUrl(kind, id)].filter((url): url is string => Boolean(url && isGif(url)))

const skill = SKILL_TIERS.find((row) => gifsOf("skill", row.id).length > 0)!
const gear = EQUIPMENT.find((row) => gifsOf("equipment", row.id).length > 0)!
const cat = CAT_ROSTER.find((row) => isGif(row.url))!.url
const png = CAT_ROSTER.find((row) => !isGif(row.url))!.url

describe("gif parade pool", () => {
  it("is empty before anything is held or found", () => {
    expect(paradePool("all", progress())).toEqual([])
  })

  it("takes the idle and click gifs of the rows held, and nothing unbought", () => {
    const p = progress({ skills: { [skill.id]: 1 } })
    expect(heldGifs("skills", p)).toEqual(gifsOf("skill", skill.id))
    expect(heldGifs("gear", p)).toEqual([])
  })

  it("mixes every category for all, and keeps to one when picked", () => {
    const p = progress({ catsFound: [png, cat], skills: { [skill.id]: 3 }, equipment: { [gear.id]: 1 }, xpTotal: 1e12 })
    const all = paradePool("all", p)
    expect(all).toContain(cat)
    expect(all).not.toContain(png)
    for (const url of [...gifsOf("skill", skill.id), ...gifsOf("equipment", gear.id)]) expect(all).toContain(url)
    expect(new Set(all).size).toBe(all.length)
    expect(paradePool("cats", p)).toEqual([cat])
    expect(paradePool("gear", p)).toEqual(gifsOf("equipment", gear.id))
    expect(paradePool("jobs", p)).toEqual([])
  })

  it("counts each category for the picker", () => {
    const p = progress({ catsFound: [cat], skills: { [skill.id]: 1 } })
    const counts = paradeCounts(p)
    expect(counts.cats).toBe(1)
    expect(counts.skills).toBe(new Set(gifsOf("skill", skill.id)).size)
    expect(counts.gear).toBe(0)
    expect(counts.all).toBe(paradePool("all", p).length)
  })
})
