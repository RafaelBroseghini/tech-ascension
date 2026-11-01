import { describe, expect, it } from "vitest"
import { allHandles, initialOf, normalizeIdentity, randomHandle, randomIdentity } from "./identity.ts"
import { freshSave, parseSave } from "./save.ts"

// Slang, slurs and adult words: none may appear in a handle, as shown or run together.
const BLOCKED = [
  "anal", "anus", "ass", "balls", "beaver", "bitch", "boner", "boob", "butt", "chink", "cock", "coon", "cox", "crap",
  "cum", "cunt", "damn", "dick", "dong", "dyke", "fag", "fap", "fuck", "gook", "hitler", "hoe", "homo", "horny", "hump",
  "jap", "jizz", "kike", "kkk", "kok", "milf", "nazi", "nig", "nude", "orgy", "pedo", "pee", "piss", "poo", "porn",
  "puss", "rape", "retard", "sex", "shit", "slut", "spic", "suck", "tard", "thot", "tit", "twat", "wank", "whore",
  "wop", "xxx",
]

describe("the career's handle", () => {
  it("draws an adjective-animal handle", () => {
    expect(randomIdentity(() => 0)).toEqual({ handle: "brisk-axolotl" })
    expect(randomIdentity().handle).toMatch(/^[a-z]+-[a-z]+$/)
    expect(initialOf("quiet-otter")).toBe("Q")
  })

  it("never draws a blocked word, in any of the 1,024 handles", () => {
    const handles = allHandles()
    expect([handles.length, new Set(handles).size]).toEqual([1024, 1024])
    for (const form of handles.flatMap((handle) => [handle, handle.replace(/-/g, "")])) {
      for (const word of BLOCKED) expect(form.includes(word), `${form} contains ${word}`).toBe(false)
    }
  })

  it("always changes on a reroll", () => {
    const handle = randomHandle(() => 0)
    expect(randomHandle(() => 0, handle)).not.toBe(handle)
    for (let i = 0; i < 50; i++) expect(randomHandle(Math.random, handle)).not.toBe(handle)
  })

  it("loads only handles the lists can draw, and nothing else", () => {
    expect(normalizeIdentity({ handle: "quiet-otter", chosen: true })).toEqual({ handle: "quiet-otter", chosen: true })
    expect(normalizeIdentity({ handle: "quiet-otter" })?.chosen).toBe(false)
    // A name left in a save is dropped, never shown.
    expect(normalizeIdentity({ name: "Anything Goes", handle: "quiet-otter", chosen: true })).toEqual({ handle: "quiet-otter", chosen: true })
    expect(normalizeIdentity({ handle: "ada-lovelace" })).toBeUndefined()
    expect(normalizeIdentity({ handle: "quiet-otter-extra" })).toBeUndefined()
    expect(normalizeIdentity({ handle: 7 })).toBeUndefined()
  })

  it("is drawn, not yet kept, for every new save, and kept through a load", () => {
    const save = freshSave(0)
    expect(save.profile?.chosen).toBe(false)
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.profile).toEqual(save.profile)
    expect(parseSave({ ...save, profile: { handle: "rude-word" } })?.profile).toBeUndefined()
  })
})
