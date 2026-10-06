import { describe, expect, it } from "vitest"
import { cleanHandle, cleanName, initialOf, normalizeIdentity, randomIdentity } from "./identity.ts"
import { freshSave, parseSave } from "./save.ts"

describe("the career's name and handle", () => {
  it("draws an adjective and an animal, Tailscale style", () => {
    expect(randomIdentity(() => 0)).toEqual({ name: "Brisk Axolotl", handle: "brisk-axolotl" })
    const drawn = randomIdentity()
    expect(drawn.handle).toMatch(/^[a-z]+-[a-z]+$/)
    expect(cleanHandle(drawn.handle)).toBe(drawn.handle)
  })

  it("cleans a handle the way GitHug takes them", () => {
    expect(cleanHandle("  @Ada Lovelace!! ")).toBe("ada-lovelace")
    expect(cleanHandle("--x--y--")).toBe("x-y")
    expect(cleanHandle("a".repeat(60))).toHaveLength(39)
    expect(cleanHandle("!!!")).toBeNull()
    expect(cleanHandle(7)).toBeNull()
  })

  it("trims a name and refuses a blank one", () => {
    expect(cleanName("  Ada   Lovelace ")).toBe("Ada Lovelace")
    expect(cleanName("   ")).toBeNull()
    expect(initialOf("ada")).toBe("A")
  })

  it("is drawn for every new save and kept through a load, junk dropped", () => {
    const save = freshSave(0)
    expect(normalizeIdentity(save.profile)).toEqual(save.profile)
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.profile).toEqual(save.profile)
    expect(parseSave({ ...save, profile: { name: "", handle: "x" } })?.profile).toBeUndefined()
  })
})
