import { afterEach, describe, expect, it } from "vitest"
import { parseAmount, setMoneyDirect, setXpDirect } from "./admin.ts"
import { ADMIN_CODE, getAdminMode, isAdminCode, setAdminMode, subscribeAdminMode } from "./adminMode.ts"
import { useGame } from "./store.ts"

describe("admin", () => {
  afterEach(() => {
    setAdminMode(false)
    useGame.getState().wipe()
  })

  it("only opens on the exact code", () => {
    expect(isAdminCode(ADMIN_CODE)).toBe(true)
    expect(isAdminCode("tech-ascension-admin ")).toBe(false)
    expect(isAdminCode(true)).toBe(false)
    expect(isAdminCode(null)).toBe(false)
  })

  it("tells listeners when admin mode flips", () => {
    let calls = 0
    const stop = subscribeAdminMode(() => calls++)
    setAdminMode(true)
    setAdminMode(true)
    expect(getAdminMode()).toBe(true)
    expect(calls).toBe(1)
    stop()
  })

  it("reads plain, grouped, suffixed and exponent amounts", () => {
    expect(parseAmount("1500")).toBe(1500)
    expect(parseAmount("$1,500,000")).toBe(1_500_000)
    expect(parseAmount("40k")).toBe(40_000)
    expect(parseAmount("2.5M")).toBe(2_500_000)
    expect(parseAmount("3e9")).toBe(3e9)
    expect(parseAmount("1t")).toBe(1e12)
    expect(parseAmount("")).toBeNull()
    expect(parseAmount("-5")).toBeNull()
    expect(parseAmount("lots")).toBeNull()
  })

  it("sets money and XP, and lifetime XP never falls", () => {
    setMoneyDirect(12_345)
    expect(useGame.getState().money).toBe(12_345)
    setXpDirect(50_000)
    expect(useGame.getState()).toMatchObject({ xp: 50_000, xpTotal: 50_000 })
    setXpDirect(10)
    expect(useGame.getState()).toMatchObject({ xp: 10, xpTotal: 50_000 })
    setMoneyDirect(Number.NaN)
    expect(useGame.getState().money).toBe(12_345)
  })
})
