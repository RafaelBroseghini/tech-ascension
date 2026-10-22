import { afterEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { EQUIPMENT, GIGS, SKILL_TIERS, visibleJobs } from "../data/phases.ts"
import { buyEverything, parseAmount, setMoneyDirect, setXpDirect } from "./admin.ts"
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

  it("buys everything once, keeps counts, and pays job XP lumps only once", () => {
    useGame.setState({ equipment: { [String(EQUIPMENT[0]!.id)]: 3 } })
    buyEverything()
    const state = useGame.getState()
    expect(Object.keys(state.skills)).toHaveLength(SKILL_TIERS.length)
    expect(Object.keys(state.equipment)).toHaveLength(EQUIPMENT.length)
    expect(Object.keys(state.owned)).toHaveLength(CAPITAL.length)
    expect(state.equipment[String(EQUIPMENT[0]!.id)]).toBe(3)
    expect(state.gigs).toHaveLength(GIGS.length)
    // A career holds its own track only: the picked one, or Backend when nothing was picked.
    expect(state.jobs).toHaveLength(visibleJobs("backend").length)
    expect(state.build.spec).toBe("backend")
    const xp = state.xp
    buyEverything()
    expect(useGame.getState().xp).toBe(xp)
  })
})
