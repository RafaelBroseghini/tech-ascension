import { describe, expect, it } from "vitest"
import { allHandles, allNames, initialOf, nameSlug, normalizeIdentity, randomHandle, randomIdentity, randomName } from "./identity.ts"
import { freshSave, parseSave } from "./save.ts"

// Slang, slurs and adult words: none may appear in a name or handle, as shown or run together.
const BLOCKED = [
  "anal", "anus", "ass", "balls", "beaver", "bitch", "boner", "boob", "butt", "chink", "cock", "coon", "cox", "crap",
  "cum", "cunt", "damn", "dick", "dong", "dyke", "fag", "fap", "fuck", "gook", "hitler", "hoe", "homo", "horny", "hump",
  "jap", "jizz", "kike", "kkk", "kok", "milf", "nazi", "nig", "nude", "orgy", "pedo", "pee", "piss", "poo", "porn",
  "puss", "rape", "retard", "sex", "shit", "slut", "spic", "suck", "tard", "thot", "tit", "twat", "wank", "whore",
  "wop", "xxx",
]

// The prank names schoolyards and crank calls are made of: none of these first names, and no surname that
// completes one ("Mike Hunt", "Ben Dover", "Hugh Jass", "Seymour Butts", "Anita Bath", "Phil McCracken").
const PRANK_FIRST = ["Al", "Amanda", "Anita", "Barry", "Ben", "Dick", "Dixie", "Harry", "Heywood", "Hugh", "Ima", "Ivana", "Jack", "Justin", "Mike", "Moe", "Oliver", "Pat", "Phil", "Seymour", "Wayne", "Willie"]
const PRANK_LAST = ["Bath", "Butts", "Dover", "Hoff", "Hunt", "Jass", "Klozoff", "Lester", "McCracken", "Normous", "Ness", "Rection", "Tinkle"]

describe("the career's name and handle", () => {
  it("draws a person's name and a web handle that has nothing to do with it", () => {
    const drawn = randomIdentity(() => 0)
    expect(drawn).toEqual({ name: "Ada Abara", handle: "brisk-axolotl" })
    const live = randomIdentity()
    expect(live.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
    expect(live.handle).toMatch(/^[a-z]+-[a-z]+$/)
    expect(nameSlug(live.name)).not.toBe(live.handle)
  })

  it("never draws a blocked word, in any of the 1,024 names or 1,024 handles", () => {
    const names = allNames()
    const handles = allHandles()
    expect([names.length, new Set(names).size, handles.length, new Set(handles).size]).toEqual([1024, 1024, 1024, 1024])
    const forms = [...names.flatMap((name) => [name.toLowerCase(), name.toLowerCase().replace(/ /g, "")]), ...handles.flatMap((handle) => [handle, handle.replace(/-/g, "")])]
    for (const form of forms) {
      for (const word of BLOCKED) expect(form.includes(word), `${form} contains ${word}`).toBe(false)
    }
  })

  it("never makes a prank name", () => {
    for (const name of allNames()) {
      const [first, last] = name.split(" ")
      expect(PRANK_FIRST, name).not.toContain(first)
      expect(PRANK_LAST, name).not.toContain(last)
    }
  })

  it("always changes what a reroll asks for", () => {
    const name = randomName(() => 0)
    const handle = randomHandle(() => 0)
    expect(randomName(() => 0, name)).not.toBe(name)
    expect(randomHandle(() => 0, handle)).not.toBe(handle)
    for (let i = 0; i < 50; i++) expect(randomName(Math.random, name)).not.toBe(name)
  })

  it("loads only names and handles the lists can draw", () => {
    expect(normalizeIdentity({ name: "Maya Chen", handle: "quiet-otter", chosen: true })).toEqual({ name: "Maya Chen", handle: "quiet-otter", chosen: true })
    expect(normalizeIdentity({ name: "Ada Lovelace", handle: "quiet-otter" })).toBeUndefined()
    expect(normalizeIdentity({ name: "Maya Chen", handle: "ada-lovelace" })).toBeUndefined()
    expect(normalizeIdentity({ name: "Maya Chen Extra", handle: "quiet-otter" })).toBeUndefined()
    expect(normalizeIdentity({ name: "Maya Chen", handle: "quiet-otter" })?.chosen).toBe(false)
    expect(nameSlug("Maya Chen")).toBe("maya-chen")
    expect(initialOf("Maya Chen")).toBe("M")
  })

  it("is drawn, not yet kept, for every new save, and kept through a load", () => {
    const save = freshSave(0)
    expect(save.profile?.chosen).toBe(false)
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.profile).toEqual(save.profile)
    expect(parseSave({ ...save, profile: { name: "Anything Goes", handle: "rude-word" } })?.profile).toBeUndefined()
  })
})
