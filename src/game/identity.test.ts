import { describe, expect, it } from "vitest"
import { allIdentities, initialOf, normalizeIdentity, randomIdentity } from "./identity.ts"
import { freshSave, parseSave } from "./save.ts"

// Slang, slurs and adult words: none may appear in a name or handle, even with the hyphen dropped.
const BLOCKED = [
  "ass", "anal", "anus", "beaver", "bitch", "boob", "butt", "chink", "cock", "coon", "crap", "cum", "cunt", "damn",
  "dick", "dyke", "fag", "fap", "fuck", "gook", "hoe", "homo", "jap", "jizz", "kike", "kkk", "milf", "nazi", "nig",
  "nude", "orgy", "pedo", "piss", "porn", "puss", "rape", "sex", "shit", "slut", "spic", "tard", "thot", "tit", "twat",
  "wank", "whore", "wop", "xxx",
]

describe("the career's name and handle", () => {
  it("draws an adjective and an animal, Tailscale style", () => {
    expect(randomIdentity(() => 0)).toEqual({ name: "Brisk Axolotl", handle: "brisk-axolotl" })
    expect(randomIdentity().handle).toMatch(/^[a-z]+-[a-z]+$/)
  })

  it("never draws a blocked word, in any of the 1,024 pairs", () => {
    const pairs = allIdentities()
    expect(pairs).toHaveLength(1024)
    for (const { name, handle } of pairs) {
      for (const form of [handle, handle.replace(/-/g, ""), name.toLowerCase()]) {
        for (const word of BLOCKED) expect(form.includes(word), `${handle} contains ${word}`).toBe(false)
      }
    }
  })

  it("always changes on a reroll", () => {
    const now = randomIdentity(() => 0)
    expect(randomIdentity(() => 0, now).handle).not.toBe(now.handle)
    for (let i = 0; i < 50; i++) expect(randomIdentity(Math.random, now).handle).not.toBe(now.handle)
  })

  it("loads only pairs the lists can draw, and rebuilds the name from the handle", () => {
    expect(normalizeIdentity({ name: "anything at all", handle: "quiet-otter", chosen: true })).toEqual({ name: "Quiet Otter", handle: "quiet-otter", chosen: true })
    expect(normalizeIdentity({ name: "Ada", handle: "ada-lovelace" })).toBeUndefined()
    expect(normalizeIdentity({ handle: "quiet-otter-x" })).toBeUndefined()
    expect(normalizeIdentity({ handle: 7 })).toBeUndefined()
    expect(normalizeIdentity({ handle: "quiet-otter" })?.chosen).toBe(false)
    expect(initialOf("quiet otter")).toBe("Q")
  })

  it("is drawn, not yet kept, for every new save, and kept through a load", () => {
    const save = freshSave(0)
    expect(save.profile?.chosen).toBe(false)
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.profile).toEqual(save.profile)
    expect(parseSave({ ...save, profile: { name: "x", handle: "rude-word" } })?.profile).toBeUndefined()
  })
})
