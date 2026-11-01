import { beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { GEAR } from "../data/gear.ts"
import { PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import { LEAD_OPEN_RANK, LEADERSHIP } from "../data/leadership.ts"
import type { LeadId } from "../data/leadership.ts"
import { GIGS, JOB_TIERS, SKILL_TIERS, highestJobRank, jobRank, visibleJobs } from "../data/phases.ts"
import { REGIONS } from "../data/regions.ts"
import type { SpecId } from "../data/specializations.ts"
import { buildFactsOf, hireLocked, leadOptions, leadPickOpen, normalizeBuild } from "./build.ts"
import { describeEntry } from "./careerLog.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts, stepCompany } from "./globe/growth.ts"
import { HIRES, hireBonusOf, hirePayrollOf } from "./globe/hires.ts"
import type { Hires } from "./globe/hires.ts"
import { NO_BUILD, productFactsOf } from "./globe/product.ts"
import { ceilingOf, WORLD_CEILING } from "./globe/world.ts"
import { installGameHarness } from "./harness.ts"
import { readCareerText } from "./ledger.ts"
import { LEAD_PICK_KEY, nextUnlock, ownsEverything, shopFocus } from "./nextUnlock.ts"
import { DEFAULT_PACE_LEAD, simulatePace } from "./pace.ts"
import { capitalUnlocked, jobState } from "./phase.ts"
import { parseSave, SAVE_VERSION } from "./save.ts"
import { persistNow, useGame } from "./store.ts"

const game = installGameHarness()

const ids = (rows: readonly { id: number }[]) => rows.map((row) => row.id)
const rowById = (id: number) => JOB_TIERS.find((job) => job.id === id)!
const IC_ONLY = [16, 17, 19, 23, 24]
const MANAGER_ONLY = [18, 20, 21, 22]
const SHARED_ABOVE = [25, 26, 27, 28, 29, 30, 31]

/** A fresh career with plenty of XP, six gigs and the trunk up to Mid-level SWE. */
function toMid() {
  game.reset()
  game.keepProfile()
  game.setUsers("americas-east", 2_000_000)
  game.setXp(1e9)
  for (let id = 1; id <= 6; id++) game.forceGig(id)
  for (let id = 1; id <= 7; id++) expect(game.buyJob(id), `job ${id}`).toBe(true)
}

/** Buys the picked specialization's rows from rank 8 up to `top`. */
function climb(spec: SpecId, top: number) {
  for (const job of visibleJobs(spec)) {
    if (!job.spec || job.rank < 8 || job.rank > top) continue
    game.setXp(1e9)
    expect(game.buyJob(job.id), `job ${job.id}`).toBe(true)
  }
}

/** A career that holds Senior SWE (rank 14) on `spec`, with the leadership pick open. */
function toSenior(spec: SpecId = "backend") {
  toMid()
  expect(game.pickSpecialization(spec)).toBe(true)
  climb(spec, 14)
}

/** A career that holds the whole track to rank 15 and has picked `lead`. */
function toLine(lead: LeadId, spec: SpecId = "backend") {
  toMid()
  expect(game.pickSpecialization(spec)).toBe(true)
  climb(spec, 15)
  expect(game.pickLeadership(lead)).toBe(true)
  game.setXp(1e9)
}

describe("the pick", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
    game.setUsers("americas-east", 2_000_000)
  })

  it("is shut before Senior SWE and opens when a job of rank 14 is held", () => {
    expect(game.pickLeadership("ic")).toBe(false)
    toMid()
    expect(game.pickLeadership("ic")).toBe(false)
    expect(game.getState().build.leadershipOptions).toEqual([])
    game.pickSpecialization("backend")
    climb("backend", 13)
    expect(game.pickLeadership("manager")).toBe(false)
    expect(leadPickOpen(useGame.getState())).toBe(false)
    expect(game.getState().build).toMatchObject({ leadership: null, leadershipOptions: [] })
    game.setXp(1e9)
    expect(game.buyJob(14)).toBe(true)
    expect(LEAD_OPEN_RANK).toBe(14)
    expect(game.getState().build.leadershipOptions).toEqual(["ic", "manager"])
    expect(leadOptions(useGame.getState())).toEqual(["ic", "manager"])
    expect(game.pickLeadership("manager")).toBe(true)
    expect(game.getState().build).toMatchObject({ leadership: "manager", leadershipOptions: [] })
  })

  it("opens on a Senior job of any specialization", () => {
    for (const spec of ["frontend", "infra", "security"] as const) {
      toSenior(spec)
      expect(game.getState().build.leadershipOptions, spec).toEqual(["ic", "manager"])
      expect(game.pickLeadership("ic"), spec).toBe(true)
    }
  })

  it("is made once and then locked, and refuses an unknown id", () => {
    toSenior()
    for (const bad of ["wizard", "", "IC", "founder"]) expect(game.pickLeadership(bad), bad).toBe(false)
    expect(game.getState().build.leadership).toBeNull()
    expect(game.pickLeadership("manager")).toBe(true)
    expect(game.pickLeadership("manager")).toBe(false)
    expect(game.pickLeadership("ic")).toBe(false)
    expect(game.getState().build.leadership).toBe("manager")
    expect(game.getState().build.leadershipOptions).toEqual([])
  })

  it("is journaled as a pick, with the line's name", () => {
    toSenior()
    game.pickLeadership("manager")
    const line = game.careerLog().find((entry) => entry.type === "pick" && String(entry.ref).startsWith("lead:"))
    expect(line).toMatchObject({ type: "pick", ref: "lead:manager", name: "Manager" })
    const entry = useGame.getState().journal.entries.find((row) => row.ref === "lead:manager")!
    expect(describeEntry(entry)).toMatchObject({ title: "Leading as: Manager", detail: "leadership" })
    // The specialization's line still reads as before.
    const spec = useGame.getState().journal.entries.find((row) => row.ref === "spec:backend")!
    expect(describeEntry(spec).title).toBe("Specialized: Backend / Platform")
  })

  it("keeps the picks apart: the specialization and the line are separate", () => {
    toSenior("ai")
    game.pickLeadership("ic")
    expect(game.getState().build).toMatchObject({ specialization: "ai", leadership: "ic", switched: false })
  })
})

describe("the rows above rank 15", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
    game.setUsers("americas-east", 2_000_000)
  })

  it("leaves rank 15 in the track and waits on the pick for everything above it", () => {
    toSenior()
    game.setXp(1e9)
    expect(jobState(useGame.getState(), rowById(15))).toBe("ready")
    expect(game.buyJob(15)).toBe(true)
    for (const row of JOB_TIERS.filter((job) => job.rank > 15 && job.id < 100)) {
      expect(jobState(useGame.getState(), row), `job ${row.id}`).toBe("lead")
      expect(game.buyJob(row.id), `job ${row.id}`).toBe(false)
    }
    expect(game.getState().jobs.every((id) => jobRank(id) <= 15)).toBe(true)
  })

  it("opens the shared rows 25 to 31 for either line once the pick is made", () => {
    for (const lead of ["ic", "manager"] as const) {
      toLine(lead)
      for (const id of SHARED_ABOVE) expect(jobState(useGame.getState(), rowById(id)), `${lead} ${id}`).toBe("ready")
    }
  })

  it("hides the other line's rows and refuses them", () => {
    toLine("ic")
    for (const id of MANAGER_ONLY) {
      expect(jobState(useGame.getState(), rowById(id)), `job ${id}`).toBe("hidden")
      expect(game.buyJob(id), `job ${id}`).toBe(false)
    }
    for (const id of IC_ONLY) expect(jobState(useGame.getState(), rowById(id)), `job ${id}`).toBe("ready")
    expect(game.buyJob(16)).toBe(true)

    toLine("manager")
    for (const id of IC_ONLY) {
      expect(jobState(useGame.getState(), rowById(id)), `job ${id}`).toBe("hidden")
      expect(game.buyJob(id), `job ${id}`).toBe(false)
    }
    for (const id of MANAGER_ONLY) expect(jobState(useGame.getState(), rowById(id)), `job ${id}`).toBe("ready")
    expect(game.buyJob(18)).toBe(true)
    expect(game.getState().jobs.filter((id) => IC_ONLY.includes(id))).toEqual([])
  })

  it("lets each line buy every row it can see, and only those", () => {
    for (const [lead, expectedCount] of [["ic", 27], ["manager", 26]] as const) {
      toLine(lead)
      const visible = visibleJobs("backend", lead)
      expect(visible).toHaveLength(expectedCount)
      for (const job of visible) {
        game.setXp(1e9)
        if (!game.getState().jobs.includes(job.id)) expect(game.buyJob(job.id), `${lead} job ${job.id}`).toBe(true)
      }
      expect(game.getState().jobs.slice().sort((a, b) => a - b)).toEqual(ids(visible).slice().sort((a, b) => a - b))
    }
  })

  it("never closes anything: capital and gear stay open across the pick", () => {
    toSenior()
    const state = () => useGame.getState()
    expect(capitalUnlocked(state())).toBe(true)
    const before = game.getState().unlocks
    game.pickLeadership("manager")
    expect(capitalUnlocked(state())).toBe(true)
    expect(game.getState().unlocks).toEqual(before)
    game.setMoney(1_000_000)
    expect(game.buy(1)).toBe(true)
  })

  it("keeps the line across the specialization's one switch", () => {
    toLine("manager")
    expect(game.buyJob(18)).toBe(true)
    expect(game.switchSpecialization("frontend")).toBe(true)
    expect(game.getState().build).toMatchObject({ specialization: "frontend", switched: true, leadership: "manager" })
    expect(game.getState().jobs).toEqual([1, 2, 3, 4, 5, 6, 7, 18])
    game.setXp(1e9)
    expect(game.buyJob(20)).toBe(true)
    expect(game.buyJob(16)).toBe(false)
    expect(game.pickLeadership("ic")).toBe(false)
  })
})

describe("hiring", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
    game.setUsers("americas-east", 2_000_000)
  })

  it("is refused with no line picked and for an individual contributor, whatever the rank and the money", () => {
    toSenior()
    game.setMoney(1e15)
    expect(game.hire("outsourced")).toBe(false)
    game.pickLeadership("ic")
    game.setXp(1e9)
    for (const id of [16, 17, 19, 23, 24, 25, 26, 27, 28, 29, 30, 31]) game.buyJob(id)
    expect(highestJobRank(game.getState().jobs)).toBe(31)
    game.setMoney(1e15)
    for (const row of HIRES) expect(game.hire(row.id), row.id).toBe(false)
    expect(game.getState().headcount).toBe(0)
    expect(game.getState().money).toBe(1e15)
  })

  it("is refused to a Manager below the kind's rank, and opens with each rank", () => {
    toLine("manager")
    game.setMoney(1e15)
    // Senior SWE (14) and the rank 15 row do not open the first kind: it asks for Engineering manager.
    expect(game.hire("outsourced")).toBe(false)
    const opens: [string, number][] = [
      ["outsourced", 18],
      ["bootcamp", 18],
      ["copypaste", 20],
      ["senior", 20],
      ["staff", 21],
      ["tenx", 21],
      ["greybeard", 22],
      ["codegod", 22],
    ]
    expect(HIRES.map((row) => [row.id, row.rank])).toEqual(opens)
    let rank = 0
    for (const [id, needed] of opens) {
      game.setMoney(1e15)
      if (rank < needed) {
        // The kind above is open as a row (a hire of the one before it), but its rank is not held yet.
        expect(game.hire(id), `${id} before rank ${needed}`).toBe(false)
        game.setXp(1e9)
        expect(game.buyJob(needed), `job ${needed}`).toBe(true)
        rank = needed
      }
      game.setMoney(1e15)
      expect(game.hire(id), `${id} at rank ${needed}`).toBe(true)
      expect(game.getState().hires[id]).toBe(1)
    }
    expect(game.getState().headcount).toBe(8)
  })

  it("still needs the row above to have a hire, and the money", () => {
    toLine("manager")
    game.setXp(1e9)
    for (const id of [18, 20, 21, 22]) game.buyJob(id)
    game.setMoney(1e15)
    expect(game.hire("bootcamp")).toBe(false)
    game.setMoney(0)
    expect(game.hire("outsourced")).toBe(false)
    game.setMoney(1e15)
    expect(game.hire("outsourced")).toBe(true)
    expect(game.hire("bootcamp")).toBe(true)
  })

  it("says why a kind is shut", () => {
    const row = (id: string) => HIRES.find((hire) => hire.id === id)!
    expect(hireLocked({ jobs: [14] }, row("outsourced"))).toBe("Hiring opens when you lead as a Manager")
    expect(hireLocked({ jobs: [14, 16], build: { spec: "backend", switched: false, leadership: "ic" } }, row("outsourced"))).toBe("Hiring opens when you lead as a Manager")
    const manager = { spec: "backend" as const, switched: false, leadership: "manager" as const }
    expect(hireLocked({ jobs: [14], build: manager }, row("outsourced"))).toBe("Needs Engineering manager")
    expect(hireLocked({ jobs: [14, 18], build: manager }, row("outsourced"))).toBeNull()
    expect(hireLocked({ jobs: [14, 18], build: manager }, row("copypaste"))).toBe("Needs Director of Eng")
    expect(hireLocked({ jobs: [14, 18, 20], build: manager }, row("staff"))).toBe("Needs VP Engineering")
    expect(hireLocked({ jobs: [14, 18, 20, 21], build: manager }, row("codegod"))).toBe("Needs CTO (startup)")
    expect(hireLocked({ jobs: [14, 22], build: manager }, row("codegod"))).toBeNull()
  })

  it("keeps hires already held working under IC: they grow the product and draw pay, but nobody new is hired", () => {
    toLine("ic")
    const held: Hires = { outsourced: 3, bootcamp: 1 }
    useGame.setState({ hires: held })
    game.setMoney(1e15)
    expect(game.hire("outsourced")).toBe(false)
    expect(game.getState().hires).toEqual(held)
    expect(game.getState().headcount).toBe(4)
    // They still count in the growth facts and the payroll.
    const facts = productFactsOf(held, undefined, { ...NO_BUILD, lead: "ic" })
    expect(facts.hireBonus).toBeGreaterThan(0)
    expect(facts.hireBonus).toBe(hireBonusOf(held))
    expect(facts.payroll).toBe(hirePayrollOf(held))
    // Letting one go is still allowed.
    expect(useGame.getState().fire("bootcamp")).toBe(true)
    expect(game.getState().hires).toEqual({ outsourced: 3 })
  })
})

describe("the ending", () => {
  const nearWin = Object.fromEntries(REGIONS.map((r) => [r.id, ceilingOf(r.id) * (7.9999e9 / WORLD_CEILING)]))
  const everywhere = { regions: REGIONS.map((r) => r.id), pops: ["ashburn", "frankfurt", "tokyo", "saopaulo", "lagos", "sydney", "sf"], off: [], dark: [] }
  const never = () => 0.999
  const winFacts = (hires: Hires, lead?: LeadId | null) => growthFacts([1, 2, 3, 4, 5, 6, 7, 8], { "110": 20 }, everywhere, productFactsOf(hires, undefined, { ...NO_BUILD, lead: lead ?? null }))
  const team: Hires = Object.fromEntries(HIRES.slice(0, 6).map((row) => [row.id, 20]))
  const near = (hiredUsers = 0) => ({ ...FRESH_COMPANY, users: nearWin, hiredUsers })
  const wonWith = (hires: Hires, lead: LeadId | null | undefined, hiredShare: number) => stepCompany(near(7.9999e9 * hiredShare), winFacts(hires, lead), 60_000, 60_000, never).state

  it("comes from the line the facts carry", () => {
    expect(productFactsOf({}, undefined, { ...NO_BUILD, lead: "ic" }).ending).toBe("nightOwl")
    expect(productFactsOf({}, undefined, { ...NO_BUILD, lead: "manager" }).ending).toBe("sponsor")
    expect(productFactsOf({}).ending).toBeUndefined()
    expect(productFactsOf({}, undefined, NO_BUILD).ending).toBeUndefined()
    expect(LEADERSHIP.map((row) => row.ending)).toEqual(["nightOwl", "sponsor"])
  })

  it("makes a Manager's win the sponsor's, even with no hires", () => {
    const won = wonWith({}, "manager", 0)
    expect(won.won).toBe(true)
    expect(won.ending).toBe("sponsor")
  })

  it("makes an IC's win the night owl's, even when the hires brought most of the users", () => {
    const won = wonWith(team, "ic", 0.9)
    expect(won.won).toBe(true)
    expect(won.ending).toBe("nightOwl")
  })

  it("falls back to the hires' share with no line, as before", () => {
    expect(wonWith(team, undefined, 0.9).ending).toBe("sponsor")
    expect(wonWith({}, null, 0).ending).toBe("nightOwl")
    expect(wonWith(team, null, 0.4).ending).toBe("nightOwl")
  })

  it("is picked once, when the win latches, and stays through a later line", () => {
    const won = stepCompany(near(), winFacts({}, "manager"), 60_000, 60_000, never)
    expect(won.notes.find((n) => n.ref === "world:won")?.data).toMatchObject({ ending: "sponsor" })
    expect(stepCompany(won.state, winFacts({}, "ic"), 60_000, 120_000, never).state.ending).toBe("sponsor")
  })

  it("is not served from a stale cache after the pick", () => {
    const gigs = [1, 2, 3]
    const gear = { "110": 1 }
    const before = growthFacts(gigs, gear, undefined, productFactsOf({}, undefined, NO_BUILD))
    const after = growthFacts(gigs, gear, undefined, productFactsOf({}, undefined, { ...NO_BUILD, lead: "manager" }))
    expect(before.product?.ending).toBeUndefined()
    expect(after.product?.ending).toBe("sponsor")
  })

  it("follows the line in the store: the Hall of Fame records it on the Exit", () => {
    for (const [lead, ending] of [["ic", "nightOwl"], ["manager", "sponsor"]] as const) {
      toLine(lead)
      useGame.setState({
        company: { ...FRESH_COMPANY, users: nearWin },
        equipment: { "110": 20 },
        footprint: everywhere,
        gigs: [1, 2, 3, 4, 5, 6, 7, 8],
      })
      const store = useGame.getState()
      const grown = advanceCompany(store.company, growthFacts(store.gigs, store.equipment, store.footprint, productFactsOf(store.hires, store.legacy, buildFactsOf(store))), store.now, store.now + 60_000, never)
      expect(grown.state.won).toBe(true)
      useGame.setState({ company: grown.state })
      expect(useGame.getState().company.ending).toBe(ending)
      game.setMoney(PRESTIGE_EARN_SCALE * 3)
      expect(game.exit()).toBeGreaterThan(0)
      expect(game.getState().legacy.endings).toContain(ending)
    }
  })

  it("follows the line while away: a win on return reads the pick", () => {
    toLine("manager")
    useGame.setState({
      company: { ...FRESH_COMPANY, users: nearWin },
      equipment: { "110": 20 },
      footprint: everywhere,
      gigs: [1, 2, 3, 4, 5, 6, 7, 8],
    })
    game.advanceOffline(8 * 3_600_000)
    expect(game.getState().world.won).toBe(true)
    expect(useGame.getState().company.ending).toBe("sponsor")
  })
})

describe("old saves and the save block", () => {
  const base = { version: SAVE_VERSION, money: 0, xp: 0, xpTotal: 1e6, skills: {}, equipment: {}, owned: {}, gigs: [], savedAt: 0, peakMoney: 0 }
  const ladder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  const hires = { outsourced: 2 }

  it("gives a save with only IC rows above rank 15 the IC line", () => {
    const save = parseSave({ ...base, jobs: [...ladder, 16, 17] })!
    expect(save.build).toEqual({ spec: "backend", switched: false, leadership: "ic" })
    expect(save.jobs).toEqual([...ladder, 16, 17])
  })

  it("gives a save with a manager row and no IC row the Manager line", () => {
    const save = parseSave({ ...base, jobs: [...ladder, 18, 20] })!
    expect(save.build?.leadership).toBe("manager")
    expect(save.jobs).toEqual([...ladder, 18, 20])
  })

  it("gives a save with hires and only shared rows above 15 the Manager line, and keeps the hires", () => {
    const save = parseSave({ ...base, jobs: [...ladder, 25], hires })!
    expect(save.build?.leadership).toBe("manager")
    expect(save.hires).toEqual(hires)
    expect(save.jobs).toEqual([...ladder, 25])
  })

  it("gives a save with no hires and only shared rows above 15 the IC line", () => {
    expect(parseSave({ ...base, jobs: [...ladder, 25, 26] })!.build?.leadership).toBe("ic")
  })

  it("gives a save with both lines' rows the IC line and drops the manager rows", () => {
    const save = parseSave({ ...base, jobs: [...ladder, 16, 18, 20, 25] })!
    expect(save.build?.leadership).toBe("ic")
    expect(save.jobs).toEqual([...ladder, 16, 25])
  })

  it("gives a save with hires and an IC row the IC line, and keeps the hires", () => {
    const save = parseSave({ ...base, jobs: [...ladder, 19], hires })!
    expect(save.build?.leadership).toBe("ic")
    expect(save.hires).toEqual(hires)
  })

  it("gives a save with hires and both lines' rows the IC line", () => {
    const save = parseSave({ ...base, jobs: [...ladder, 16, 18], hires })!
    expect(save.build?.leadership).toBe("ic")
    expect(save.jobs).toEqual([...ladder, 16])
    expect(save.hires).toEqual(hires)
  })

  it("leaves a save with hires and nothing above rank 15 without a line, and keeps the hires", () => {
    const save = parseSave({ ...base, jobs: ladder, hires })!
    expect(save.build?.leadership).toBeUndefined()
    expect(save.hires).toEqual(hires)
    expect(parseSave({ ...base, jobs: [1, 2, 3] })!.build).toBeUndefined()
  })

  it("keeps the line a save names, and drops the other line's rows under it", () => {
    const save = parseSave({ ...base, jobs: [...ladder, 16, 18, 25], build: { spec: "backend", switched: false, leadership: "manager" } })!
    expect(save.build).toEqual({ spec: "backend", switched: false, leadership: "manager" })
    expect(save.jobs).toEqual([...ladder, 18, 25])
  })

  it("drops an unknown line, and a line set by hand is a pick like any other", () => {
    const unknown = parseSave({ ...base, jobs: ladder, build: { spec: "backend", leadership: "founder" } })!
    expect(unknown.build).toEqual({ spec: "backend", switched: false })
    expect(unknown.build).not.toHaveProperty("leadership")
    expect(normalizeBuild({ leadership: "ic" }, []).build).toEqual({ spec: null, switched: false, leadership: "ic" })
    expect(normalizeBuild({ leadership: 3 }, []).build).toBeUndefined()
  })

  it("maps with the hires passed in, and with none when they are left out", () => {
    expect(normalizeBuild(undefined, [...ladder, 25], hires).build?.leadership).toBe("manager")
    expect(normalizeBuild(undefined, [...ladder, 25]).build?.leadership).toBe("ic")
    expect(normalizeBuild(undefined, [...ladder, 25], {}).build?.leadership).toBe("ic")
  })

  it("round-trips a pick through the save, and omits the line before it", () => {
    game.reset()
    game.keepProfile()
    game.setUsers("americas-east", 2_000_000)
    expect(JSON.parse(readCareerText() ?? "{}").build).toBeUndefined()
    toSenior()
    persistNow()
    expect(JSON.parse(readCareerText() ?? "{}").build).toEqual({ spec: "backend", switched: false })
    game.pickLeadership("manager")
    persistNow()
    const saved = JSON.parse(readCareerText() ?? "{}")
    expect(saved.build).toEqual({ spec: "backend", switched: false, leadership: "manager" })
    const parsed = parseSave(saved)!
    expect(parsed.build).toEqual(saved.build)
    expect(parsed.jobs).toEqual(saved.jobs)
  })
})

describe("reset and the Exit", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
    game.setUsers("americas-east", 2_000_000)
  })

  it("reset clears the line", () => {
    toLine("manager")
    game.reset()
    expect(useGame.getState().build.leadership).toBeUndefined()
    expect(game.getState().build).toEqual({ specialization: null, switched: false, options: [], leadership: null, leadershipOptions: [] })
    expect(JSON.parse(readCareerText() ?? "{}").build).toBeUndefined()
  })

  it("the Exit clears the line, and the next career can pick again", () => {
    toLine("ic")
    game.setMoney(PRESTIGE_EARN_SCALE * 3)
    expect(game.exit()).toBeGreaterThan(0)
    expect(game.getState().build).toEqual({ specialization: null, switched: false, options: [], leadership: null, leadershipOptions: [] })
    toSenior()
    expect(game.pickLeadership("manager")).toBe(true)
  })
})

describe("the next step", () => {
  beforeEach(() => {
    game.reset()
    game.keepProfile()
    game.setUsers("americas-east", 2_000_000)
  })

  it("names the pick once the track is held to its top, and the next row of the line after it", () => {
    toSenior()
    // Rank 15 is a track row, so it comes first.
    expect(nextUnlock(useGame.getState(), "C")?.key).toBe("job:15")
    game.setXp(1e9)
    game.buyJob(15)
    const next = nextUnlock(useGame.getState(), "C")
    expect(next).toMatchObject({ key: LEAD_PICK_KEY, name: "Pick a leadership line", tab: "C", either: true })
    expect(next?.needs).toEqual(LEADERSHIP.map((row) => row.name))
    expect(next?.needs.length).toBeGreaterThan(0)
    expect(shopFocus(useGame.getState(), next!)).toEqual({ tab: "C", row: "lead:ic" })
    game.pickLeadership("manager")
    expect(nextUnlock(useGame.getState(), "C")).toMatchObject({ key: "job:18", name: "Engineering manager" })
  })

  it("walks the next row of an IC's own line", () => {
    toLine("ic")
    game.buyJob(16)
    expect(nextUnlock(useGame.getState(), "C")?.key).toBe("job:17")
    game.buyJob(17)
    // 18 is the Manager's: the walk goes to 19.
    expect(nextUnlock(useGame.getState(), "C")?.key).toBe("job:19")
  })

  it("keeps the pick out of the whole-game walk's way until every earlier panel is done", () => {
    toSenior()
    game.setXp(1e9)
    game.buyJob(15)
    expect(nextUnlock(useGame.getState())?.tab).toBe("A")
  })
})

describe("owning everything", () => {
  const owned = (spec: SpecId, lead: LeadId) => ({
    skills: Object.fromEntries(SKILL_TIERS.map((row) => [String(row.id), 1])),
    equipment: Object.fromEntries(GEAR.map((row) => [String(row.id), 1])),
    owned: Object.fromEntries(CAPITAL.map((row) => [String(row.id), 1])),
    gigs: GIGS.map((gig) => gig.id),
    jobs: ids(visibleJobs(spec, lead)),
    build: { spec, switched: false, leadership: lead },
  })

  it("is reachable for both lines under several specializations, and the other line's rows are not asked for", () => {
    for (const spec of ["backend", "frontend", "infra", "security"] as const) {
      for (const lead of ["ic", "manager"] as const) {
        const held = owned(spec, lead)
        expect(ownsEverything(held), `${spec} ${lead}`).toBe(true)
        const other: LeadId = lead === "ic" ? "manager" : "ic"
        // Holding the other line's rows as well changes nothing, and holding only them is not enough.
        expect(ownsEverything({ ...held, jobs: [...held.jobs, ...ids(JOB_TIERS.filter((job) => job.lead === other))] }), `${spec} ${lead}`).toBe(true)
        expect(ownsEverything({ ...held, build: { ...held.build, leadership: other } }), `${spec} ${lead} as ${other}`).toBe(false)
        const lineRow = JOB_TIERS.find((job) => job.lead === lead)!
        expect(ownsEverything({ ...held, jobs: held.jobs.filter((id) => id !== lineRow.id) }), `${spec} ${lead}`).toBe(false)
      }
    }
  })

  it("is reached through the store by buying every row of a line", () => {
    for (const lead of ["ic", "manager"] as const) {
      toLine(lead)
      for (const job of visibleJobs("backend", lead)) {
        game.setXp(1e9)
        if (!game.getState().jobs.includes(job.id)) game.buyJob(job.id)
      }
      useGame.setState({
        skills: owned("backend", lead).skills,
        equipment: owned("backend", lead).equipment,
        owned: owned("backend", lead).owned,
        gigs: owned("backend", lead).gigs,
      })
      expect(ownsEverything(useGame.getState()), lead).toBe(true)
    }
  })
})

describe("the pace model", () => {
  const profile = { visitsPerDay: 4, minutesPerVisit: 5, clicksPerSec: 2 }

  it("plays an individual contributor by default and finishes the ladder it can see", () => {
    expect(DEFAULT_PACE_LEAD).toBe("ic")
    const run = simulatePace(profile, { maxDays: 30 })
    expect(run.complete).toBe(true)
    expect(run.milestones.allJobs).toBeDefined()
    expect(run.milestones.seniorJob).toBeDefined()
  })

  it("takes the other line when asked, and finishes that one too", () => {
    const run = simulatePace(profile, { maxDays: 30, leadership: "manager" })
    expect(run.complete).toBe(true)
    expect(run.milestones.allJobs).toBeDefined()
  })

  it("owns everything no later than before the manager rows left the IC's ladder", () => {
    // The day the run owned everything before the user gates was 1.0 for this profile and one visit (a quarter day) later with them (docs/PACING.md); skipping four rows cannot make it later still.
    const run = simulatePace(profile, { maxDays: 30 })
    expect(run.ownedDays).not.toBeNull()
    expect(run.ownedDays!).toBeLessThanOrEqual(1.26)
  })
})
