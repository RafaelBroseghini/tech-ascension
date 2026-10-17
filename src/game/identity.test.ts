import { describe, expect, it } from "vitest"
import { allHandles, allProducts, initialOf, normalizeIdentity, productsOf, randomHandle, randomIdentity, randomProduct } from "./identity.ts"
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
    expect(randomIdentity(() => 0)).toEqual({ handle: "brisk-axolotl", product: "Axolotly" })
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

  it("never draws a blocked word, in any product", () => {
    const products = allProducts()
    expect([products.length, new Set(products).size]).toEqual([256, 256])
    for (const product of products) {
      for (const word of BLOCKED) expect(product.toLowerCase().includes(word), `${product} contains ${word}`).toBe(false)
    }
  })

  it("names the product after the handle's animal, and a reroll only changes the suffix", () => {
    expect(productsOf("quiet-otter")).toContain("Otterly")
    expect(productsOf("quiet-otter")).toContain("Otterbase")
    const product = randomProduct("quiet-otter", () => 0)
    expect(product).toBe("Otterly")
    for (let i = 0; i < 50; i++) {
      const next = randomProduct("quiet-otter", Math.random, product)
      expect(next).not.toBe(product)
      expect(next.startsWith("Otter")).toBe(true)
    }
    expect(randomProduct("quiet-otter", () => 0, product)).not.toBe(product)
  })

  it("always changes on a reroll", () => {
    const handle = randomHandle(() => 0)
    expect(randomHandle(() => 0, handle)).not.toBe(handle)
    for (let i = 0; i < 50; i++) expect(randomHandle(Math.random, handle)).not.toBe(handle)
  })

  it("loads only handles the lists can draw, and nothing else", () => {
    expect(normalizeIdentity({ handle: "quiet-otter", product: "Otterhub", chosen: true })).toEqual({ handle: "quiet-otter", product: "Otterhub", chosen: true })
    expect(normalizeIdentity({ handle: "quiet-otter" })?.chosen).toBe(false)
    // A name left in a save is dropped, never shown.
    expect(normalizeIdentity({ name: "Anything Goes", handle: "quiet-otter", product: "Otterhub", chosen: true })).toEqual({
      handle: "quiet-otter",
      product: "Otterhub",
      chosen: true,
    })
    expect(normalizeIdentity({ handle: "ada-lovelace" })).toBeUndefined()
    expect(normalizeIdentity({ handle: "quiet-otter-extra" })).toBeUndefined()
    expect(normalizeIdentity({ handle: 7 })).toBeUndefined()
  })

  it("replaces a hand-edited product, and gives a save from before products one without losing chosen", () => {
    for (const product of ["Free Money", "Wolfly", "otterly", 7, undefined]) {
      const loaded = normalizeIdentity({ handle: "quiet-otter", product, chosen: true })
      expect(productsOf("quiet-otter")).toContain(loaded?.product)
      expect(loaded?.chosen).toBe(true)
    }
  })

  it("is drawn, not yet kept, for every new save, and kept through a load", () => {
    const save = freshSave(0)
    expect(save.profile?.chosen).toBe(false)
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.profile).toEqual(save.profile)
    expect(parseSave({ ...save, profile: { handle: "rude-word" } })?.profile).toBeUndefined()
  })
})
