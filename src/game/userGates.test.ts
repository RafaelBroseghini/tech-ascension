import { beforeEach, describe, expect, it } from "vitest"
import { HOME_REGION_ID } from "../data/regions.ts"
import { PICK_USERS, SENIOR_USERS } from "../data/specializations.ts"
import { pickOpen, pickUsersShort, pickWaitsOnUsers, seniorUsersShort } from "./build.ts"
import { installGameHarness } from "./harness.ts"
import { jobState } from "./phase.ts"
import { JOB_TIERS } from "../data/phases.ts"
import { nextUnlock } from "./nextUnlock.ts"
import { useGame } from "./store.ts"

const game = installGameHarness()
const job = (id: number) => JOB_TIERS.find((row) => row.id === id)!

/** A career holding the trunk to Mid-level SWE, with `users` at home. */
function toMid(users: number) {
  game.reset()
  game.keepProfile()
  game.setUsers(HOME_REGION_ID, users)
  game.setXp(1e9)
  for (let id = 1; id <= 6; id++) game.forceGig(id)
  for (let id = 1; id <= 7; id++) expect(game.buyJob(id), `job ${id}`).toBe(true)
}

describe("the pick waits on users", () => {
  beforeEach(() => game.reset())

  it("stays shut at Mid-level SWE until the product has 10,000 users", () => {
    toMid(PICK_USERS - 1)
    expect(game.pickSpecialization("backend")).toBe(false)
    expect(game.getState().build.options).toEqual([])
    expect(pickWaitsOnUsers(useGame.getState())).toBe(true)
    game.setUsers(HOME_REGION_ID, PICK_USERS)
    expect(pickOpen(useGame.getState())).toBe(true)
    expect(game.pickSpecialization("backend")).toBe(true)
  })

  it("names the wait in the next step, with the users it has", () => {
    toMid(1234)
    expect(pickUsersShort(useGame.getState())).toBe(PICK_USERS - 1234)
    const next = nextUnlock(useGame.getState(), "C")
    expect(next?.key).toBe("spec:users")
    expect(next?.needs[0]).toContain("10,000 users")
    expect(next?.needs[0]).toContain("1,234 now")
  })

  it("does not open from the pure gates when no company is carried", () => {
    expect(pickUsersShort({ jobs: [1, 2, 3, 4, 5, 6, 7] })).toBe(0)
    expect(pickOpen({ jobs: [1, 2, 3, 4, 5, 6, 7] })).toBe(true)
  })

  it("is not closed again by users lost after the pick", () => {
    toMid(PICK_USERS)
    expect(game.pickSpecialization("backend")).toBe(true)
    game.setUsers(HOME_REGION_ID, 0)
    expect(game.getState().build.specialization).toBe("backend")
    // Nothing to pick again, and the track stays: the gate only ever reads the first pick.
    expect(pickOpen(useGame.getState())).toBe(false)
    expect(pickWaitsOnUsers(useGame.getState())).toBe(false)
  })
})

describe("Senior SWE waits on users", () => {
  beforeEach(() => game.reset())

  function toRank13(users: number) {
    toMid(PICK_USERS)
    expect(game.pickSpecialization("backend")).toBe(true)
    game.setUsers(HOME_REGION_ID, users)
    for (let id = 8; id <= 13; id++) {
      game.setXp(1e9)
      expect(game.buyJob(id), `job ${id}`).toBe(true)
    }
  }

  it("refuses the rank 14 row below 1,000,000 users and takes it at the mark", () => {
    toRank13(SENIOR_USERS - 1)
    game.setXp(1e9)
    expect(jobState(useGame.getState(), job(14))).toBe("users")
    expect(game.buyJob(14)).toBe(false)
    expect(seniorUsersShort(useGame.getState())).toBe(1)
    game.setUsers(HOME_REGION_ID, SENIOR_USERS)
    expect(jobState(useGame.getState(), job(14))).toBe("ready")
    expect(game.buyJob(14)).toBe(true)
  })

  it("names the users in the next step and does not hide the rows above", () => {
    toRank13(500_000)
    game.setXp(1e9)
    const next = nextUnlock(useGame.getState(), "C")
    expect(next?.key).toBe("job:14")
    expect(next?.needs[0]).toContain("1,000,000 users")
  })

  it("keeps the job and capital open when users fall afterwards", () => {
    toRank13(SENIOR_USERS)
    game.setXp(1e9)
    expect(game.buyJob(14)).toBe(true)
    game.setUsers(HOME_REGION_ID, 0)
    expect(seniorUsersShort(useGame.getState())).toBe(0)
    expect(game.getState().unlocks.capital).toBe(true)
  })

  it("leaves rank 13 and below to xp alone", () => {
    toMid(PICK_USERS)
    expect(game.pickSpecialization("backend")).toBe(true)
    game.setXp(1e9)
    expect(game.buyJob(8)).toBe(true)
  })
})
