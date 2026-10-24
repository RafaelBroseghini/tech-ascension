import { describe, expect, it } from "vitest"
import { CAPITAL } from "../../data/capital.ts"
import { EQUIPMENT, GEAR_TAB_UNLOCK, GIGS, JOB_TIERS, SKILL_TIERS } from "../../data/phases.ts"
import { GOLD_SKILLS } from "../../data/gold.ts"
import { LEADERSHIP } from "../../data/leadership.ts"
import { ORIGINS } from "../../data/origins.ts"
import { SPECIALIZATIONS } from "../../data/specializations.ts"
import { canBuyGold, isGoldRevealed, nextInFamily } from "../gold.ts"
import { capitalUnlocked, equipmentOpen, gigBoardUnlocked, gigState, jobBoardUnlocked, jobState } from "../phase.ts"
import type { Gates } from "../phase.ts"
import { ONE_OF_EACH_PAYBACK_SECONDS, simulatePace, STACKER_PAYBACK_SECONDS } from "../pace.ts"
import type { PaceCareer } from "../pace.ts"
import * as oracle from "./oracle.ts"
import { holds, nodeOf, revealed } from "./index.ts"
import type { Ref, TreeView } from "./index.ts"

const node = (ref: Ref) => nodeOf(ref)!

/** Every rule the tree models, against the rule as it was written before the tree, for one career. */
function compare(p: PaceCareer): string[] {
  const bad: string[] = []
  const gates = p as unknown as Gates
  const note = (what: string, was: unknown, now: unknown) => {
    if (was !== now) bad.push(`${what}: was ${String(was)}, tree ${String(now)}`)
  }
  note("gig board", oracle.gigBoardUnlocked(gates), gigBoardUnlocked(gates))
  note("job board", oracle.jobBoardUnlocked(gates), jobBoardUnlocked(gates))
  note("capital", oracle.capitalUnlocked(gates), capitalUnlocked(gates))
  note("gear tab", oracle.equipmentOpen(p), equipmentOpen(p))
  note("gear tab (tree)", oracle.equipmentOpen(p), holds(node("board:gear").requires, p))
  for (const gig of GIGS) note(`gig ${gig.id}`, oracle.gigState(gates, gig), gigState(gates, gig))
  for (const job of JOB_TIERS) note(`job ${job.id}`, oracle.jobState(gates, job), jobState(gates, job))
  for (const row of SKILL_TIERS) note(`skill ${row.id} shown`, oracle.isSkillRevealed(row, p.skills, p.xpTotal), revealed(node(`skill:${row.id}`), p))
  for (const row of EQUIPMENT) note(`gear ${row.id} shown`, oracle.isGearRevealed(row, p.equipment, p.peakMoney, p.jobs, p.build?.peakRank ?? 0), revealed(node(`gear:${row.id}`), p))
  for (const tier of CAPITAL) note(`capital ${tier.id} shown`, oracle.isRevealed(tier, p.owned, p.peakMoney), revealed(node(`capital:${tier.id}`), p))
  return bad
}

describe("the tree and the rules it replaced", () => {
  const profiles = [
    { visitsPerDay: 24, minutesPerVisit: 15, clicksPerSec: 2 },
    { visitsPerDay: 4, minutesPerVisit: 5, clicksPerSec: 2 },
  ]
  const careers: { spec: (typeof SPECIALIZATIONS)[number]["id"]; lead: (typeof LEADERSHIP)[number]["id"]; origin?: (typeof ORIGINS)[number]["id"] }[] = [
    ...SPECIALIZATIONS.flatMap((spec) => LEADERSHIP.map((lead) => ({ spec: spec.id, lead: lead.id }))),
    ...ORIGINS.map((origin) => ({ spec: "backend" as const, lead: "ic" as const, origin: origin.id })),
  ]

  it("agree at every round of the shop, across every build and origin", () => {
    let rounds = 0
    for (const career of careers) {
      for (const profile of profiles) {
        for (const paybackSeconds of [STACKER_PAYBACK_SECONDS, ONE_OF_EACH_PAYBACK_SECONDS]) {
          simulatePace(profile, {
            maxDays: 5,
            paybackSeconds,
            specialization: career.spec,
            leadership: career.lead,
            ...(career.origin ? { origin: career.origin } : {}),
            inspect: (p) => {
              rounds += 1
              const bad = compare(p)
              if (bad.length > 0) throw new Error(`${career.spec}/${career.lead}/${career.origin ?? "none"}: ${bad[0]}`)
            },
          })
        }
      }
    }
    expect(rounds).toBeGreaterThan(1000)
  }, 240_000)

  const base = (over: Partial<TreeView> = {}): TreeView & { equipment: Record<string, number> } => ({ xpTotal: 0, peakMoney: 0, skills: {}, owned: {}, equipment: {}, jobs: [], gigs: [], ...over })

  it("keep the latches: what a gate leads to keeps it open", () => {
    const gates = (over: Partial<TreeView>) => base(over) as unknown as Gates
    expect(gigBoardUnlocked(gates({ gigs: [1] }))).toBe(true)
    expect(jobBoardUnlocked(gates({ jobs: [1] }))).toBe(true)
    expect(capitalUnlocked(gates({ owned: { "1": 1 } }))).toBe(true)
    expect(capitalUnlocked(gates({}))).toBe(false)
    expect(capitalUnlocked(gates({ peakMoney: 500_000 }))).toBe(true)
    expect(capitalUnlocked(gates({ peakMoney: 499_999 }))).toBe(false)
    expect(holds(node("board:gear").requires, base({ equipment: { "7": 1 } }))).toBe(true)
    expect(holds(node("board:gear").requires, base({ xpTotal: GEAR_TAB_UNLOCK.minXp - 1 }))).toBe(false)
    expect(holds(node("board:gear").requires, base({ xpTotal: GEAR_TAB_UNLOCK.minXp }))).toBe(true)
  })

  it("count the rank a switch kept, and leave the user gates open for a caller with no company", () => {
    const gear = EQUIPMENT.find((row) => row.unlockJobRank > 0)!
    const view = base({ peakMoney: 1e12, build: { spec: "backend", switched: true, peakRank: gear.unlockJobRank } })
    expect(revealed(node(`gear:${gear.id}`), view)).toBe(oracle.isGearRevealed(gear, {}, 1e12, [], gear.unlockJobRank))
    expect(revealed(node(`gear:${gear.id}`), view)).toBe(true)
    expect(revealed(node(`gear:${gear.id}`), base({ peakMoney: 1e12 }))).toBe(false)
    const senior = JOB_TIERS.find((job) => job.id === 14)!
    const open = base({ xpTotal: 1e9, jobs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], gigs: [1, 2, 3, 4, 5, 6], build: { spec: "backend", switched: false } })
    expect(jobState(open as unknown as Gates, senior)).toBe("ready")
    expect(jobState({ ...open, company: { users: { "americas-east": 10 } } } as unknown as Gates, senior)).toBe("users")
    expect(jobState({ ...open, company: { users: { "americas-east": 1_000_000 } } } as unknown as Gates, senior)).toBe("ready")
  })

  it("agree on the 10x dev perks: a chain in each family, on XP and a rank", () => {
    for (const row of GOLD_SKILLS) {
      for (const xpTotal of [0, row.unlockXp - 1, row.unlockXp, 1e12]) {
        for (const jobs of [[], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]) {
          const gold = GOLD_SKILLS.filter((other) => other.family === row.family && other.id < row.id).map((other) => other.id)
          const gates = { xpTotal, gold, jobs }
          const view = base({ xpTotal, gold, jobs })
          expect(revealed(node(`gold:${row.id}`), view), `gold ${row.id} shown`).toBe(isGoldRevealed(row, gates))
          expect(holds(node(`gold:${row.id}`).requires, view), `gold ${row.id} buyable`).toBe(isGoldRevealed(row, gates) && nextInFamily(gold, row))
          expect(canBuyGold({ ...gates, xp: 1e15 }, row)).toBe(holds(node(`gold:${row.id}`).requires, view))
        }
      }
    }
  })
})
