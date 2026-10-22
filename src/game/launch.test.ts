import { beforeEach, describe, expect, it } from "vitest"
import { HOME_REGION_ID } from "../data/regions.ts"
import { FRESH_COMPANY } from "./globe/growth.ts"
import { servableUsers } from "./globe/load.ts"
import { installGameHarness } from "./harness.ts"
import { LAUNCH_CLICKS, LAUNCH_MIN_USERS, LAUNCH_SHARE, launchGain, shipLaunches, shipsLaunches } from "./launch.ts"
import { totalUsers } from "./globe/world.ts"
import { normalizeBuild } from "./build.ts"
import { useGame } from "./store.ts"

const game = installGameHarness()
const crowd = (users: Record<string, number>) => ({ ...FRESH_COMPANY, users })

describe("shipping launches", () => {
  it("is Frontend's alone", () => {
    expect(shipsLaunches("frontend")).toBe(true)
    for (const other of ["backend", "infra", "ai", "fde", "security", null] as const) expect(shipsLaunches(other)).toBe(false)
  })

  it("banks clicks below a launch without shipping, and keeps the charge", () => {
    const step = shipLaunches(crowd({ [HOME_REGION_ID]: 1000 }), 3, LAUNCH_CLICKS - 4)
    expect(step.launches).toBe(0)
    expect(step.charge).toBe(LAUNCH_CLICKS - 1)
    expect(totalUsers(step.company.users)).toBe(1000)
  })

  it("ships one launch per LAUNCH_CLICKS, a share of the crowd, and keeps the remainder", () => {
    const step = shipLaunches(crowd({ [HOME_REGION_ID]: 10_000 }), LAUNCH_CLICKS - 1, 1 + LAUNCH_CLICKS + 3)
    expect(step.launches).toBe(2)
    expect(step.charge).toBeCloseTo(3, 9)
    // Two launches, each a share of what the crowd was then.
    expect(totalUsers(step.company.users)).toBeCloseTo(10_000 * (1 + LAUNCH_SHARE) ** 2, 6)
  })

  it("brings at least LAUNCH_MIN_USERS to a small or empty crowd, at home", () => {
    expect(launchGain(0)).toBe(LAUNCH_MIN_USERS)
    const step = shipLaunches(crowd({}), 0, LAUNCH_CLICKS)
    expect(step.company.users[HOME_REGION_ID]).toBe(LAUNCH_MIN_USERS)
  })

  it("spreads a launch over the regions the crowd is in, in proportion", () => {
    const step = shipLaunches(crowd({ [HOME_REGION_ID]: 3_000, europe: 1_000 }), 0, LAUNCH_CLICKS)
    const gain = launchGain(4_000)
    expect(step.company.users[HOME_REGION_ID]).toBeCloseTo(3_000 + gain * 0.75, 6)
    expect(step.company.users.europe).toBeCloseTo(1_000 + gain * 0.25, 6)
  })

  it("never brings more users than the gear can serve", () => {
    const room = 500
    const step = shipLaunches(crowd({ [HOME_REGION_ID]: 480 }), 0, LAUNCH_CLICKS * 5, room)
    expect(totalUsers(step.company.users)).toBeLessThanOrEqual(room + 1e-9)
    expect(step.launches).toBe(5)
    // A crowd already past the room gets none, and the charge still resets.
    const over = shipLaunches(crowd({ [HOME_REGION_ID]: 900 }), 0, LAUNCH_CLICKS, room)
    expect(totalUsers(over.company.users)).toBe(900)
    expect(over.charge).toBe(0)
  })

  it("serves the laptop's hundred users by default", () => {
    expect(servableUsers({})).toBe(100)
  })
})

describe("launches in the store", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  function frontend(users = 50) {
    game.setUsers(HOME_REGION_ID, 10_000)
    game.setXp(1e9)
    for (let id = 1; id <= 6; id++) game.forceGig(id)
    for (let id = 1; id <= 7; id++) game.buyJob(id)
    expect(game.pickSpecialization("frontend")).toBe(true)
    game.setUsers(HOME_REGION_ID, users)
    useGame.setState({ equipment: { "42": 20 } })
  }

  it("charges on manual clicks only, and ships at LAUNCH_CLICKS", () => {
    frontend(50)
    for (let i = 0; i < LAUNCH_CLICKS - 1; i++) game.click()
    expect(game.getState().launch).toMatchObject({ ships: true, charge: LAUNCH_CLICKS - 1 })
    const before = game.getState().world.users
    game.click()
    expect(game.getState().launch.charge).toBe(0)
    expect(game.getState().world.users).toBeGreaterThan(before)
  })

  it("does not charge on hover or auto clicks, nor for another build", () => {
    frontend(50)
    useGame.getState().click("auto")
    expect(game.getState().launch.charge).toBe(0)
    game.reset()
    game.keepProfile()
    game.setXp(1e9)
    game.click()
    expect(game.getState().launch).toMatchObject({ ships: false, charge: 0 })
  })

  it("is saved with the build and dropped on a switch", () => {
    frontend(50)
    for (let i = 0; i < 7; i++) game.click()
    expect(useGame.getState().build.charge).toBe(7)
    expect(normalizeBuild({ spec: "frontend", switched: false, charge: 7 }, [1, 2, 3, 4, 5, 6, 7]).build?.charge).toBe(7)
    expect(normalizeBuild({ spec: "backend", switched: false, charge: 7 }, [1, 2, 3, 4, 5, 6, 7]).build?.charge).toBeUndefined()
    expect(normalizeBuild({ spec: "frontend", switched: false, charge: 99 }, [1, 2, 3, 4, 5, 6, 7]).build?.charge).toBeLessThan(LAUNCH_CLICKS)
    expect(game.switchSpecialization("backend")).toBe(true)
    expect(useGame.getState().build.charge).toBeUndefined()
  })
})

describe("launches and the milestones", () => {
  it("stop one user short of the next milestone, so the growth step latches it", () => {
    const step = shipLaunches(crowd({ [HOME_REGION_ID]: 999_000 }), 0, LAUNCH_CLICKS * 3)
    expect(totalUsers(step.company.users)).toBeLessThan(1_000_000)
    expect(totalUsers(step.company.users)).toBeGreaterThanOrEqual(999_999 - 1e-6)
  })

  it("never carry the crowd past the win", () => {
    const step = shipLaunches(crowd({ [HOME_REGION_ID]: 7_999_999_990 }), 0, LAUNCH_CLICKS * 4)
    expect(totalUsers(step.company.users)).toBeLessThan(8_000_000_000)
  })
})
