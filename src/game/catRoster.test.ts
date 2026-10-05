import { describe, expect, it } from "vitest"
import { DESK_CAT_CLICK_POOL } from "../data/emojiCdn.ts"
import { addCatFound, CAT_ROSTER, catName, isRosterCat, normalizeCatsFound } from "./catRoster.ts"
import { normalizeStats } from "./stats.ts"

const first = CAT_ROSTER[0]!.url
const second = CAT_ROSTER[1]!.url

describe("cat roster", () => {
  it("holds every pool cat once, numbered from 1", () => {
    expect(CAT_ROSTER.length).toBe(new Set(DESK_CAT_CLICK_POOL).size)
    expect(CAT_ROSTER.length).toBeGreaterThan(0)
    expect(CAT_ROSTER.map((cat) => cat.no)).toEqual(CAT_ROSTER.map((_, index) => index + 1))
  })

  it("names a cat from its file", () => {
    expect(catName("https://cdn3.emoji.gg/emojis/CatDance.gif")).toBe("Cat Dance")
    expect(catName("https://cdn3.emoji.gg/emojis/2762-cat-sleep-pc.png")).toBe("Cat Sleep Pc")
    expect(catName("https://cdn3.emoji.gg/emojis/owocat.png")).toBe("Owocat")
    expect(catName("https://cdn3.emoji.gg/emojis/blob_cat_HUG.png")).toBe("Blob Cat HUG")
  })

  it("adds a roster cat once and ignores anything else", () => {
    const one = addCatFound([], first)
    expect(one).toEqual([first])
    expect(addCatFound(one, first)).toBe(one)
    expect(addCatFound(one, "https://example.com/dog.gif")).toBe(one)
    expect(addCatFound(one, second)).toEqual([first, second])
    expect(isRosterCat(42)).toBe(false)
  })

  it("keeps discovery order and drops junk when a save loads", () => {
    expect(normalizeCatsFound([second, 7, first, second, "nope"])).toEqual([second, first])
    expect(normalizeCatsFound("x")).toEqual([])
    expect(normalizeStats({ catsFound: [first] }).catsFound).toEqual([first])
    expect(normalizeStats({}).catsFound).toEqual([])
  })
})
