import { beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import { GIGS, JOB_TIERS, jobRank, SKILL_TIERS, visibleJobs } from "../data/phases.ts"
import { SPECIALIZATIONS } from "../data/specializations.ts"
import type { SpecId } from "../data/specializations.ts"
import {
  CLICK_BUILD_CLICK_MULT,
  clickShareMult,
  FRESH_BUILD,
  IDLE_BUILD_CLICK_MULT,
  IDLE_BUILD_IDLE_MULT,
  MANUAL_CLICKS_PER_SEC,
  normalizeBuild,
  styleFactors,
} from "./build.ts"
import { clickFlat, clickPower, clickShare, idleParts, idlePerSec, isGearRevealed, ownedSources, production } from "./economy.ts"
import { installGameHarness } from "./harness.ts"
import { readCareerText } from "./ledger.ts"
import { modFactors, modsOf } from "./mods.ts"
import { ownsEverything, nextUnlock } from "./nextUnlock.ts"
import { DEFAULT_PACE_SPEC, simulatePace } from "./pace.ts"
import { capitalUnlocked, jobState } from "./phase.ts"
import { parseSave, SAVE_VERSION } from "./save.ts"
import { persistNow, useGame } from "./store.ts"

const game = installGameHarness()

const ids = (rows: readonly { id: number }[]) => rows.map((row) => row.id)
const rowById = (id: number) => JOB_TIERS.find((job) => job.id === id)!

/** A fresh career that holds the trunk up to Mid-level SWE and plenty of XP. */
function toMid() {
  game.reset()
  game.keepProfile()
  game.setXp(1e9)
  for (let id = 1; id <= 6; id++) game.forceGig(id)
  for (let id = 1; id <= 7; id++) expect(game.buyJob(id), `job ${id}`).toBe(true)
}

/** Buys every row of a track from rank 8 to `top`, topping the XP up as it goes. */
function climb(spec: SpecId, top = 15) {
  for (const job of visibleJobs(spec)) {
    if (job.rank < 8 || job.rank > top || !job.spec) continue
    game.setXp(1e9)
    expect(game.buyJob(job.id), `job ${job.id}`).toBe(true)
  }
}

describe("the pick", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  it("opens at Mid-level SWE and not before", () => {
    game.setXp(1e9)
    for (let id = 1; id <= 6; id++) game.forceGig(id)
    expect(game.pickSpecialization("backend")).toBe(false)
    expect(game.getState().build).toEqual({ specialization: null, switched: false, options: [] })
    for (let id = 1; id <= 6; id++) game.buyJob(id)
    expect(game.pickSpecialization("backend")).toBe(false)
    expect(game.buyJob(7)).toBe(true)
    expect(game.getState().build.options).toEqual(SPECIALIZATIONS.map((row) => row.id))
    expect(game.pickSpecialization("backend")).toBe(true)
  })

  it("is made once and then locked, and refuses an unknown id", () => {
    toMid()
    expect(game.pickSpecialization("wizard")).toBe(false)
    expect(game.getState().build.specialization).toBeNull()
    expect(game.pickSpecialization("infra")).toBe(true)
    expect(game.getState().build).toMatchObject({ specialization: "infra", switched: false })
    expect(game.pickSpecialization("infra")).toBe(false)
    expect(game.pickSpecialization("ai")).toBe(false)
    expect(game.getState().build.specialization).toBe("infra")
  })

  it("is journaled", () => {
    toMid()
    game.pickSpecialization("ai")
    const line = game.careerLog().find((entry) => entry.type === "pick")
    expect(line).toMatchObject({ type: "pick", ref: "spec:ai", name: "AI engineer" })
  })

  it("hides the other tracks and refuses their rows", () => {
    toMid()
    game.pickSpecialization("frontend")
    const state = useGame.getState()
    expect(jobState(state, rowById(8))).toBe("hidden")
    expect(jobState(state, rowById(208))).toBe("hidden")
    expect(jobState(state, rowById(108))).toBe("ready")
    for (const id of [8, 208, 308, 408, 508]) {
      game.setXp(1e9)
      expect(game.buyJob(id), `job ${id}`).toBe(false)
    }
    game.setXp(1e9)
    expect(game.buyJob(108)).toBe(true)
    expect(game.getState().jobs).toContain(108)
    expect(visibleJobs("frontend").some((job) => job.id === 8 || job.id === 208)).toBe(false)
  })

  it("keeps the shared rows above the track shut until a pick, then opens them", () => {
    toMid()
    game.setXp(1e9)
    expect(jobState(useGame.getState(), rowById(16))).toBe("pick")
    expect(game.buyJob(16)).toBe(false)
    expect(game.buyJob(8)).toBe(false)
    expect(game.buyJob(108)).toBe(false)
    game.pickSpecialization("security")
    expect(game.buyJob(16)).toBe(true)
  })

  it("keeps capital out of reach through the ladder until a pick", () => {
    toMid()
    game.setXp(1e9)
    // Every route to Senior (rank 14) runs through a row above the trunk.
    for (const id of [8, 9, 10, 11, 12, 13, 14, 15, 16, 114, 214]) expect(game.buyJob(id), `job ${id}`).toBe(false)
    expect(game.getState().unlocks.capital).toBe(false)
    expect(game.getState().jobs.every((id) => id <= 7)).toBe(true)
    game.setMoney(100_000)
    expect(game.buy(1)).toBe(false)
    game.pickSpecialization("backend")
    climb("backend", 14)
    expect(game.getState().unlocks.capital).toBe(true)
  })

  it("offers every spec a track to Senior and past it", () => {
    for (const spec of SPECIALIZATIONS) {
      toMid()
      expect(game.pickSpecialization(spec.id)).toBe(true)
      climb(spec.id)
      game.setXp(1e9)
      expect(game.buyJob(16), spec.id).toBe(true)
      expect(game.getState().unlocks.capital, spec.id).toBe(true)
    }
  })
})

describe("the switch", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  it("keeps money, gear and the trunk, drops the old track and starts at the new one", () => {
    toMid()
    game.pickSpecialization("backend")
    climb("backend", 11)
    game.setMoney(100_000)
    expect(game.buyEquipment(1)).toBe(true)
    const before = game.getState()
    expect(before.jobs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(game.switchSpecialization("frontend")).toBe(true)
    const after = game.getState()
    expect(after.build).toMatchObject({ specialization: "frontend", switched: true })
    expect(after.jobs).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(after.money).toBe(before.money)
    expect(after.equipment).toEqual(before.equipment)
    // The new track starts at its first row; the old one is gone.
    game.setXp(1e9)
    expect(game.buyJob(9)).toBe(false)
    expect(game.buyJob(108)).toBe(true)
    expect(game.careerLog().find((entry) => entry.type === "switch")).toMatchObject({ ref: "spec:frontend", from: "backend", name: "Frontend" })
  })

  it("keeps the shared rows already held", () => {
    toMid()
    game.pickSpecialization("backend")
    climb("backend", 15)
    game.setXp(1e9)
    expect(game.buyJob(16)).toBe(true)
    expect(game.buyJob(17)).toBe(true)
    expect(game.switchSpecialization("infra")).toBe(true)
    expect(game.getState().jobs).toEqual([1, 2, 3, 4, 5, 6, 7, 16, 17])
  })

  it("is refused without a pick, to the same specialization, to an unknown id, and a second time", () => {
    toMid()
    expect(game.switchSpecialization("frontend")).toBe(false)
    game.pickSpecialization("backend")
    expect(game.getState().build.options).toEqual(["frontend", "infra", "ai", "fde", "security"])
    expect(game.switchSpecialization("backend")).toBe(false)
    expect(game.switchSpecialization("wizard")).toBe(false)
    expect(game.switchSpecialization("ai")).toBe(true)
    expect(game.getState().build.options).toEqual([])
    expect(game.switchSpecialization("infra")).toBe(false)
    expect(game.switchSpecialization("backend")).toBe(false)
    expect(game.getState().build).toMatchObject({ specialization: "ai", switched: true })
  })

  it("after Senior keeps capital open, gear revealed, and the phase", () => {
    toMid()
    game.pickSpecialization("backend")
    climb("backend", 14)
    game.setMoney(1_000_000)
    // Managed cluster opens at Senior and $25,000 held.
    const cluster = GEAR.find((row) => row.id === 50)!
    expect(cluster.unlockJobRank).toBe(14)
    expect(game.getState().unlocks.capital).toBe(true)
    expect(game.getState().phase).toBe("D")
    game.setMoney(0)
    expect(game.switchSpecialization("security")).toBe(true)
    const state = useGame.getState()
    expect(Math.max(...state.jobs)).toBe(7)
    expect(state.build.peakRank).toBe(14)
    expect(capitalUnlocked(state)).toBe(true)
    expect(game.getState().unlocks.capital).toBe(true)
    expect(game.getState().phase).toBe("D")
    // The jobs held no longer reach rank 14, but the gear it opened stays revealed and buyable.
    expect(isGearRevealed(cluster, {}, state.peakMoney, state.jobs)).toBe(false)
    expect(isGearRevealed(cluster, {}, state.peakMoney, state.jobs, state.build.peakRank)).toBe(true)
    game.setMoney(1_000_000)
    expect(game.buyEquipment(cluster.id)).toBe(true)
    expect(game.buy(1)).toBe(true)
  })

  it("does not carry the old track's XP rates or salaries", () => {
    toMid()
    game.pickSpecialization("backend")
    climb("backend", 10)
    const salaries = idlePerSec(useGame.getState())
    game.switchSpecialization("frontend")
    expect(idlePerSec(useGame.getState())).toBeLessThan(salaries)
  })
})

describe("old saves and the save block", () => {
  const base = { version: SAVE_VERSION, money: 0, xp: 0, xpTotal: 1e6, skills: {}, equipment: {}, owned: {}, gigs: [], savedAt: 0, peakMoney: 0 }

  it("maps a save that holds a job above Mid-level and no specialization to Backend", () => {
    const save = parseSave({ ...base, jobs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] })!
    expect(save.build).toEqual({ spec: "backend", switched: false })
    expect(save.jobs).toHaveLength(14)
    // Job 14 still means Senior.
    expect(save.jobs).toContain(14)
    expect(rowById(14).name).toBe("Senior SWE")
    expect(parseSave({ ...base, jobs: [15] })!.build?.spec).toBe("backend")
  })

  it("leaves a save at or below Mid-level without a build", () => {
    expect(parseSave({ ...base, jobs: [1, 2, 3, 4, 5, 6, 7] })!.build).toBeUndefined()
    expect(parseSave({ ...base, jobs: [] })!.build).toBeUndefined()
    // Shared leadership rows alone are not a track, but they do mean the career was past Mid-level.
    expect(parseSave({ ...base, jobs: [16] })!.build?.spec).toBe("backend")
  })

  it("takes the track of a held track row, and drops rows of other tracks", () => {
    expect(parseSave({ ...base, jobs: [1, 7, 108, 109] })!.build?.spec).toBe("frontend")
    const mixed = parseSave({ ...base, jobs: [1, 7, 8, 108, 208], build: { spec: "frontend", switched: false } })!
    expect(mixed.jobs).toEqual([1, 7, 108])
    expect(parseSave({ ...base, jobs: [1, 7], build: { spec: "infra" } })!.build).toEqual({ spec: "infra", switched: false })
  })

  it("drops an unknown specialization and clamps what it keeps", () => {
    expect(parseSave({ ...base, jobs: [1], build: { spec: "wizard", switched: true } })!.build).toBeUndefined()
    expect(parseSave({ ...base, jobs: [1, 7], build: { spec: "ai", switched: true, peakRank: 999 } })!.build).toEqual({ spec: "ai", switched: true, peakRank: 31 })
    expect(parseSave({ ...base, jobs: [1, 7], build: { spec: "ai", switched: "yes", peakRank: "x" } })!.build).toEqual({ spec: "ai", switched: false })
    expect(normalizeBuild(undefined, []).build).toBeUndefined()
  })

  it("round-trips a pick and a switch through the save", () => {
    game.reset()
    game.keepProfile()
    expect(JSON.parse(readCareerText() ?? "{}").build).toBeUndefined()
    toMid()
    game.pickSpecialization("backend")
    climb("backend", 14)
    game.switchSpecialization("fde")
    persistNow()
    const saved = JSON.parse(readCareerText() ?? "{}")
    expect(saved.build).toEqual({ spec: "fde", switched: true, peakRank: 14 })
    const parsed = parseSave(saved)!
    expect(parsed.build).toEqual(saved.build)
    expect(parsed.jobs).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe("reset and the Exit", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
  })

  it("reset clears the build", () => {
    toMid()
    game.pickSpecialization("backend")
    game.switchSpecialization("ai")
    expect(useGame.getState().build.switched).toBe(true)
    game.reset()
    expect(useGame.getState().build).toEqual(FRESH_BUILD)
    expect(game.getState().build).toEqual({ specialization: null, switched: false, options: [] })
    expect(JSON.parse(readCareerText() ?? "{}").build).toBeUndefined()
  })

  it("the Exit clears the build, and the next career can pick again", () => {
    toMid()
    game.pickSpecialization("ai")
    game.setMoney(PRESTIGE_EARN_SCALE * 3)
    expect(game.exit()).toBeGreaterThan(0)
    expect(game.getState().build).toEqual({ specialization: null, switched: false, options: [] })
    expect(game.getState().jobs.every((id) => id <= 7)).toBe(true)
    toMid()
    expect(game.pickSpecialization("security")).toBe(true)
  })
})

describe("click and idle builds", () => {
  const fullyHeld = (spec: SpecId) => ({ jobs: ids(visibleJobs(spec)), build: { spec, switched: false } })

  it("derives the click multiple from the plain ladder's 0.68 share", () => {
    expect(visibleJobs("backend").reduce((sum, job) => sum + job.clickPct, 0) / 100).toBeCloseTo(0.68, 12)
    expect(CLICK_BUILD_CLICK_MULT).toBeCloseTo(2.5 / 0.68, 12)
    expect(MANUAL_CLICKS_PER_SEC).toBe(2)
    expect(IDLE_BUILD_IDLE_MULT).toBe(1.25)
    expect(IDLE_BUILD_CLICK_MULT).toBe(0.5)
  })

  it("pays 5 times the idle $/s at 2 manual clicks a second on a fully held click build", () => {
    for (const spec of ["frontend", "fde"] as const) {
      const held = fullyHeld(spec)
      expect(held.jobs).toHaveLength(31)
      const share = clickShare(held)
      expect(share, spec).toBeCloseTo(2.5, 12)
      expect(share * MANUAL_CLICKS_PER_SEC, spec).toBeCloseTo(5, 12)
    }
  })

  it("reads the same through clickPower: clicks at 2 a second out-earn idle five to one", () => {
    const held = fullyHeld("frontend")
    const state = { equipment: {}, owned: {}, gigs: [], ...held }
    const idle = idlePerSec(state)
    expect((clickPower(state) - clickFlat(state)) * MANUAL_CLICKS_PER_SEC).toBeCloseTo(5 * idle, 6)
  })

  it("leaves balanced builds at the plain ladder and halves an idle build's click share", () => {
    for (const spec of ["backend", "security"] as const) {
      expect(styleFactors(spec)).toEqual({ idle: 1, click: 1 })
      expect(clickShare(fullyHeld(spec))).toBeCloseTo(0.68, 12)
    }
    for (const spec of ["infra", "ai"] as const) {
      expect(styleFactors(spec)).toEqual({ idle: 1.25, click: 0.5 })
      expect(clickShare(fullyHeld(spec))).toBeCloseTo(0.34, 12)
    }
    expect(styleFactors(null)).toEqual({ idle: 1, click: 1 })
  })

  it("pays an idle build a quarter more idle $/s on every source, and nothing else", () => {
    const own = { equipment: { "1": 2, "5": 1 }, owned: { "1": 1 }, gigs: [8], jobs: [1, 2, 3, 4, 5, 6, 7] }
    const plain = idleParts({ ...own, build: { spec: "backend", switched: false } })
    for (const spec of ["infra", "ai"] as const) {
      const boosted = idleParts({ ...own, build: { spec, switched: false } })
      expect(boosted.jobs).toBeCloseTo(plain.jobs * 1.25, 9)
      expect(boosted.retainers).toBeCloseTo(plain.retainers * 1.25, 9)
      expect(boosted.equipment).toBeCloseTo(plain.equipment * 1.25, 9)
      expect(boosted.capital).toBeCloseTo(plain.capital * 1.25, 9)
      const rows = ownedSources({ skills: {}, ...own, build: { spec, switched: false } })
      expect(rows.reduce((sum, row) => sum + row.idle, 0)).toBeCloseTo(idlePerSec({ ...own, build: { spec, switched: false } }), 9)
    }
    expect(idlePerSec(own)).toBe(idlePerSec({ ...own, build: { spec: "security", switched: false } }))
  })

  describe("in the store", () => {
    beforeEach(() => {
      game.reset()
      game.keepProfile()
    })

    function holdAll(spec: SpecId) {
      const held = fullyHeld(spec)
      useGame.setState({ jobs: held.jobs, build: held.build, money: 0, xpTotal: 1e9, xp: 0, activeBoost: null })
    }

    /** What a click should pay, before any boost: flat plus the share of idle $/s, times the event and kitchen factors. */
    function expected(source: "manual" | "auto") {
      const state = useGame.getState()
      return clickPower(state, source) * modFactors(modsOf(state), Date.now(), Date.now()).click
    }

    it("a manual click gets the click build's multiple and a hover or auto click does not", () => {
      holdAll("frontend")
      const state = useGame.getState()
      const idle = idlePerSec(state)
      const manualWorth = expected("manual")
      const autoWorth = expected("auto")
      expect(manualWorth).toBeGreaterThan(autoWorth)
      // The auto click is the plain ladder's: flat plus 0.68 of idle.
      expect(clickPower(state, "auto")).toBeCloseTo(clickFlat(state) + 0.68 * idle, 6)
      expect(clickPower(state, "manual")).toBeCloseTo(clickFlat(state) + 2.5 * idle, 6)

      const manual = useGame.getState().click()
      expect(manual.money).toBeCloseTo(manualWorth, 6)
      const auto = useGame.getState().click("auto")
      expect(auto.money).toBeCloseTo(autoWorth, 6)
      expect(auto.money).toBeLessThan(manual.money)
      // The harness click is a manual one.
      expect(game.click().money).toBeCloseTo(manualWorth, 6)
    })

    it("reports the manual click in the snapshot and in production", () => {
      holdAll("fde")
      const snap = game.getState()
      expect(snap.clickShare).toBeCloseTo(2.5, 9)
      const rates = production(useGame.getState(), null, Date.now(), modsOf(useGame.getState()))
      expect(rates.click).toBeCloseTo(snap.clickPower, 6)
      expect(rates.clickAuto).toBeLessThan(rates.click)
    })

    it("a hover click on an idle build keeps the idle penalty, and on a balanced build changes nothing", () => {
      holdAll("ai")
      expect(clickShareMult("ai", "auto")).toBe(0.5)
      expect(clickShareMult("ai", "manual")).toBe(0.5)
      expect(clickShare(useGame.getState(), "auto")).toBeCloseTo(0.34, 12)
      holdAll("backend")
      expect(clickShare(useGame.getState(), "auto")).toBe(clickShare(useGame.getState(), "manual"))
      expect(clickShareMult("frontend", "auto")).toBe(1)
      expect(clickShareMult("frontend", "manual")).toBeCloseTo(CLICK_BUILD_CLICK_MULT, 12)
    })

    it("time away pays an idle build its quarter too", () => {
      // The same holdings on two tracks: the product's users pay alike, so the credits differ by the quarter of the career's own income.
      const awayCredit = (spec: SpecId) => {
        toMid()
        game.pickSpecialization(spec)
        climb(spec, 10)
        const cps = game.getState().cps
        return { cps, credited: game.advanceOffline(3_600_000).credited }
      }
      const plain = awayCredit("backend")
      const idle = awayCredit("infra")
      expect(plain.cps).toBeGreaterThan(0)
      expect(idle.cps / plain.cps).toBeCloseTo(1.25, 9)
      expect((idle.credited - plain.credited) / (plain.cps * 3600)).toBeCloseTo(0.25, 3)
    })

    it("an idle build's cps in the snapshot carries the quarter", () => {
      holdAll("backend")
      const plain = game.getState().cps
      holdAll("infra")
      expect(game.getState().cps).toBeCloseTo(plain * 1.25, 6)
    })
  })
})

describe("owning everything", () => {
  const everything = (spec: SpecId) => ({
    skills: Object.fromEntries(SKILL_TIERS.map((row) => [String(row.id), 1])),
    equipment: Object.fromEntries(GEAR.map((row) => [String(row.id), 1])),
    owned: Object.fromEntries(CAPITAL.map((row) => [String(row.id), 1])),
    gigs: GIGS.map((gig) => gig.id),
    jobs: ids(visibleJobs(spec)),
    build: { spec, switched: false },
  })

  it("is reachable for every specialization by holding every row it can see", () => {
    for (const row of SPECIALIZATIONS) {
      const held = everything(row.id)
      expect(held.jobs, row.id).toHaveLength(31)
      expect(ownsEverything(held), row.id).toBe(true)
      expect(ownsEverything({ ...held, jobs: held.jobs.slice(1) }), row.id).toBe(false)
      expect(ownsEverything({ ...held, jobs: held.jobs.filter((id) => jobRank(id) !== 14) }), row.id).toBe(false)
    }
  })

  it("does not ask for the other tracks' rows, and does not take them instead", () => {
    const backend = everything("backend")
    expect(ownsEverything({ ...backend, jobs: [...backend.jobs, ...ids(JOB_TIERS.filter((job) => job.spec === "frontend"))] })).toBe(true)
    expect(ownsEverything({ ...backend, build: { spec: "frontend", switched: false } })).toBe(false)
  })

  it("walks the next job of the career's own track", () => {
    game.reset()
    game.keepProfile()
    toMid()
    game.pickSpecialization("infra")
    const next = nextUnlock(useGame.getState(), "C")
    expect(next?.key).toBe("job:208")
    expect(next?.name).toBe("On-call primary")
  })
})

describe("the pace model", () => {
  const profile = { visitsPerDay: 4, minutesPerVisit: 5, clicksPerSec: 2 }

  it("picks Backend by default, at Mid-level, and finishes the ladder it can see", () => {
    const run = simulatePace(profile, { maxDays: 30 })
    expect(DEFAULT_PACE_SPEC).toBe("backend")
    expect(run.complete).toBe(true)
    expect(run.milestones.allJobs).toBeDefined()
  })

  it("takes another track when asked, and reaches the end of that one", () => {
    const run = simulatePace(profile, { maxDays: 30, specialization: "infra" })
    expect(run.complete).toBe(true)
    expect(run.milestones.allJobs).toBeDefined()
    expect(run.milestones.seniorJob).toBeDefined()
  })
})
