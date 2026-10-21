import { BASE_XP_PER_CLICK, COST_GROWTH, EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS, firstJobAtRank, highestJobRank, jobRank } from "../data/phases.ts"
import type { Equip, Gig, JobTier, SkillTier } from "../data/phases.ts"
import { artFor, EQUIP_ART, GIG_ART, JOB_ART, SKILL_ART } from "../data/art.ts"
import type { ActiveBoost } from "../data/boosts.ts"
import { CAPITAL } from "../data/capital.ts"
import type { Capital } from "../data/capital.ts"
import { modFactors, NO_MODS } from "./mods.ts"
import { perksOf } from "./perks.ts"
import type { HasPerks } from "./perks.ts"

import type { EventMods } from "./mods.ts"
/**
 * Balances and costs are IEEE-754 doubles.
 *
 * `Math.floor` is exact only while the result is <= Number.MAX_SAFE_INTEGER
 * (~9.01e15). The last Mars capital rows (~1e15–5e16) still play, but the last
 * dollars are approximate. When exact integers past ~1e15 matter, swap this
 * module for decimal.js or break_infinity.js. Call sites should keep using
 * `nextCost`, `clickPower`, `idlePerSec`, and `production`.
 */

/** Counts keyed by item id (stringified). Used for skills, equipment and capital tiers. */
export type OwnedMap = Record<string, number>

/** The slice of game state every economy formula reads. */
export type Progress = {
  money: number
  /** Spendable XP. Skills cost XP. */
  xp: number
  /** Lifetime XP earned. Never spent. Phase gates and job requirements read this. */
  xpTotal: number
  /** Highest money balance ever held. */
  peakMoney: number
  skills: OwnedMap
  equipment: OwnedMap
  /** Phase D capital tiers (CAPITAL). */
  owned: OwnedMap
  /** Owned job ids (each role is held once). */
  jobs: readonly number[]
  /** Completed gig ids (each gig clears once). */
  gigs: readonly number[]
  /** The Legacy perks held. Left out, none: no discounts, no multipliers. */
  legacy?: HasPerks["legacy"]
}

export const BASE_CLICK = 1

const CAPITAL_BY_ID = new Map<number, Capital>(CAPITAL.map((tier) => [tier.id, tier]))
const SKILL_BY_ID = new Map<number, SkillTier>(SKILL_TIERS.map((row) => [row.id, row]))
const GIG_BY_ID = new Map<number, Gig>(GIGS.map((row) => [row.id, row]))
const JOB_BY_ID = new Map<number, JobTier>(JOB_TIERS.map((row) => [row.id, row]))
const EQUIP_BY_ID = new Map<number, Equip>(EQUIPMENT.map((row) => [row.id, row]))

export const capitalById = (id: number): Capital | undefined => CAPITAL_BY_ID.get(id)
export const skillById = (id: number): SkillTier | undefined => SKILL_BY_ID.get(id)
export const gigById = (id: number): Gig | undefined => GIG_BY_ID.get(id)
export const jobById = (id: number): JobTier | undefined => JOB_BY_ID.get(id)
export { firstJobAtRank, highestJobRank, jobRank }

/** The highest held job (the higher id on a tie in rank), or null when the career has none. */
export function highestJobId(jobs: readonly number[]): number | null {
  let best = 0
  let bestRank = 0
  for (const id of jobs) {
    const rank = jobRank(id)
    if (rank > bestRank || (rank === bestRank && rank > 0 && id > best)) {
      best = id
      bestRank = rank
    }
  }
  return best > 0 ? best : null
}
export const equipById = (id: number): Equip | undefined => EQUIP_BY_ID.get(id)

export function ownedCount(owned: OwnedMap, id: number): number {
  const value = owned[String(id)]
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0
}

/** nextCost = floor(baseCost × COST_GROWTH ^ owned). Owned 0 returns baseCost. */
export function nextCost(baseCost: number, owned: number): number {
  if (!Number.isFinite(baseCost) || baseCost < 0) return Number.POSITIVE_INFINITY
  const count = Number.isFinite(owned) && owned > 0 ? Math.floor(owned) : 0
  if (count === 0) return baseCost
  return Math.floor(baseCost * COST_GROWTH ** count)
}

/** A row's base price after a perk's discount, whole dollars. The same number is charged, listed and compared everywhere. */
export const discounted = (baseCost: number, factor: number): number => (factor === 1 ? baseCost : Math.round(baseCost * factor))

/** The base price of a capital row for the perks held (Volume discount). */
export const capitalBase = (tier: Pick<Capital, "baseCost">, p: HasPerks): number => discounted(tier.baseCost, perksOf(p).capitalCost)

/** The base price of a gear row for the perks held (Bulk hardware). */
export const gearBase = (row: Pick<Equip, "baseCost">, p: HasPerks): number => discounted(row.baseCost, perksOf(p).gearCost)

export function canAfford(money: number, cost: number): boolean {
  if (!Number.isFinite(money) || !Number.isFinite(cost) || cost < 0) return false
  if (money >= cost) return true
  return cost - money <= Math.max(1, Math.abs(cost)) * 1e-8
}

/** What buying the next copy costs: one copy and its price, or none when the budget falls short. */
export function quotePurchase(
  budget: number,
  baseCost: number,
  owned: number,
  firstCost?: number,
): { count: number; total: number } {
  const cost = owned === 0 && firstCost !== undefined ? firstCost : nextCost(baseCost, owned)
  if (!(cost > 0) || !Number.isFinite(cost) || !canAfford(budget, cost)) return { count: 0, total: 0 }
  return { count: 1, total: cost }
}

/** A skill's next copy, in XP. The first copy can sit below the curve (`firstXpCost`: the used laptop). */
export function skillCost(row: Pick<SkillTier, "baseXpCost" | "firstXpCost">, owned: number): number {
  return owned === 0 && row.firstXpCost !== undefined ? row.firstXpCost : nextCost(row.baseXpCost, owned)
}

/** XP per click from skills, before any boost. Base 1 plus every owned copy's xpPerClick. */
export function xpPerClick(skills: OwnedMap): number {
  let sum = BASE_XP_PER_CLICK
  for (const row of SKILL_TIERS) sum += ownedCount(skills, row.id) * row.xpPerClick
  return sum
}

/** Idle XP/s: skills (study time, in every phase) plus the jobs held that teach on the job. */
export function xpPerSec(p: Pick<Progress, "skills" | "jobs">): number {
  let sum = 0
  for (const row of SKILL_TIERS) sum += ownedCount(p.skills, row.id) * row.xpPerSec
  for (const id of p.jobs) sum += jobById(id)?.xpPerSec ?? 0
  return sum
}

/** Flat money per click: $1 plus gear, capital, and job click bonuses. */
export function clickFlat(p: Pick<Progress, "equipment" | "owned" | "jobs">): number {
  let bonus = 0
  for (const row of EQUIPMENT) bonus += ownedCount(p.equipment, row.id) * row.clickBonus
  for (const tier of CAPITAL) bonus += ownedCount(p.owned, tier.id) * tier.clickBonus
  for (const id of p.jobs) bonus += jobById(id)?.clickBonus ?? 0
  return BASE_CLICK + bonus
}

/** Share of idle $/s that each click adds: every job held adds its `clickPct`. */
export function clickShare(p: Pick<Progress, "jobs">): number {
  let pct = 0
  for (const id of p.jobs) pct += jobById(id)?.clickPct ?? 0
  return pct / 100
}

/**
 * Money per click before boosts: the flat part plus the jobs' share of idle $/s, so a click stays worth
 * something next to salaries and capital. Phase B+ only pays it out.
 */
export function clickPower(p: Pick<Progress, "equipment" | "owned" | "jobs" | "gigs" | "legacy">): number {
  return clickFlat(p) + clickShare(p) * idlePerSec(p)
}

export type IdleParts = { retainers: number; jobs: number; equipment: number; capital: number }

export function idleParts(p: Pick<Progress, "equipment" | "owned" | "jobs" | "gigs" | "legacy">): IdleParts {
  const perks = perksOf(p)
  let retainers = 0
  for (const id of p.gigs) retainers += gigById(id)?.retainerCps ?? 0
  let jobs = 0
  for (const id of p.jobs) jobs += jobById(id)?.cps ?? 0
  let equipment = 0
  for (const row of EQUIPMENT) equipment += ownedCount(p.equipment, row.id) * row.cps
  let capital = 0
  for (const tier of CAPITAL) capital += ownedCount(p.owned, tier.id) * tier.cps
  return { retainers: retainers * perks.salaries, jobs: jobs * perks.salaries, equipment, capital: capital * perks.capitalIncome }
}

/** Idle $/s: gig retainers + salaries + equipment + capital. Click boosts never apply. */
export function idlePerSec(p: Pick<Progress, "equipment" | "owned" | "jobs" | "gigs" | "legacy">): number {
  const parts = idleParts(p)
  return parts.retainers + parts.jobs + parts.equipment + parts.capital
}

/** One capital tier's share of idle $/s. */
export function capitalIdlePerSec(tier: Capital, owned: OwnedMap): number {
  return ownedCount(owned, tier.id) * tier.cps
}

export function highestOwnedCapital(owned: OwnedMap): Capital | null {
  let best: Capital | null = null
  for (const tier of CAPITAL) {
    if (ownedCount(owned, tier.id) <= 0) continue
    if (!best || tier.id > best.id) best = tier
  }
  return best
}

export function highestOwnedSkill(skills: OwnedMap): SkillTier | null {
  let best: SkillTier | null = null
  for (const row of SKILL_TIERS) {
    if (ownedCount(skills, row.id) > 0 && (!best || row.id > best.id)) best = row
  }
  return best
}

export type OwnedKind = "skill" | "gig" | "job" | "equipment" | "capital"

export type OwnedSource = {
  key: string
  kind: OwnedKind
  id: number
  name: string
  artId: number
  count: number
  /** $/s this row contributes. */
  idle: number
  /** XP/s this row contributes. */
  xpIdle: number
  /** Click bonus this row contributes: dollars for equipment and capital, XP for skills. */
  click: number
}

const KIND_RANK: Record<OwnedKind, number> = { capital: 0, job: 1, equipment: 2, gig: 3, skill: 4 }

/** Everything owned: capital, jobs, equipment, gig retainers, skills. Biggest $/s first, then biggest XP/s. */
export function ownedSources(p: Pick<Progress, "skills" | "equipment" | "owned" | "jobs" | "gigs" | "legacy">): OwnedSource[] {
  const rows: OwnedSource[] = []
  const perks = perksOf(p)
  for (const tier of CAPITAL) {
    const count = ownedCount(p.owned, tier.id)
    if (count > 0)
      rows.push({ key: `capital:${tier.id}`, kind: "capital", id: tier.id, name: tier.name, artId: tier.artId, count, idle: count * tier.cps * perks.capitalIncome, xpIdle: 0, click: count * tier.clickBonus })
  }
  for (const id of p.jobs) {
    const job = jobById(id)
    if (job)
      rows.push({ key: `job:${id}`, kind: "job", id, name: job.name, artId: artFor(JOB_ART, id), count: 1, idle: job.cps * perks.salaries, xpIdle: job.xpPerSec, click: job.clickBonus })
  }
  for (const row of EQUIPMENT) {
    const count = ownedCount(p.equipment, row.id)
    if (count > 0)
      rows.push({ key: `equipment:${row.id}`, kind: "equipment", id: row.id, name: row.name, artId: artFor(EQUIP_ART, row.id), count, idle: count * row.cps, xpIdle: 0, click: count * row.clickBonus })
  }
  for (const id of p.gigs) {
    const gig = gigById(id)
    if (gig && gig.retainerCps > 0)
      rows.push({ key: `gig:${id}`, kind: "gig", id, name: gig.name, artId: artFor(GIG_ART, id), count: 1, idle: gig.retainerCps * perks.salaries, xpIdle: 0, click: 0 })
  }
  for (const row of SKILL_TIERS) {
    const count = ownedCount(p.skills, row.id)
    if (count > 0)
      rows.push({ key: `skill:${row.id}`, kind: "skill", id: row.id, name: row.name, artId: artFor(SKILL_ART, row.id), count, idle: 0, xpIdle: count * row.xpPerSec, click: count * row.xpPerClick })
  }
  return rows.sort(
    (a, b) => b.idle - a.idle || KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.xpIdle - a.xpIdle || b.id - a.id,
  )
}

/** A capital row stays hidden until the player has held its price (peakMoney) once, or owns it. */
export function isRevealed(tier: Capital, owned: OwnedMap, peakMoney: number): boolean {
  return ownedCount(owned, tier.id) > 0 || canAfford(peakMoney, tier.baseCost)
}

/** A skill shows once lifetime XP reaches its `unlockAtXp`, or when it is already owned. */
export function isSkillRevealed(row: SkillTier, skills: OwnedMap, xpTotal: number): boolean {
  return ownedCount(skills, row.id) > 0 || xpTotal >= row.unlockAtXp
}

/** A gear row shows once the player has held its `unlockMoney` and holds a job of rank `unlockJobRank` or higher (0 = none), or already owns it. */
export function isGearRevealed(row: Equip, equipment: OwnedMap, peakMoney: number, jobs: readonly number[]): boolean {
  if (ownedCount(equipment, row.id) > 0) return true
  return canAfford(peakMoney, row.unlockMoney) && (row.unlockJobRank === 0 || highestJobRank(jobs) >= row.unlockJobRank)
}

/**
 * Rows to put in the shop. Owned rows stay so they can be bought again.
 * The first unowned row is always shown, even while its own gate is still shut,
 * so the next purchase is never a blank. Later unowned rows stay hidden,
 * unless `include` asks for one (the Next button's jump target).
 */
export function visibleShopRows<T>(rows: readonly T[], owned: (row: T) => boolean, include?: (row: T) => boolean): T[] {
  const visible: T[] = []
  let heldNext = false
  for (const row of rows) {
    if (owned(row)) {
      visible.push(row)
      continue
    }
    if (heldNext && !include?.(row)) continue
    heldNext = true
    visible.push(row)
  }
  return visible
}

export function boostMultiplier(boost: ActiveBoost | null | undefined, now: number): number {
  if (!boost) return 1
  if (!(boost.endsAt > now)) return 1
  if (!Number.isFinite(boost.mult) || boost.mult <= 0) return 1
  return boost.mult
}

/**
 * Click gain includes the click boost. Idle never does. `mods` are the random-event multipliers:
 * the permanent one scales every stream, a timed one scales its own (click, idle $, idle XP).
 */
export function production(
  p: Pick<Progress, "skills" | "equipment" | "owned" | "jobs" | "gigs" | "legacy">,
  boost: ActiveBoost | null | undefined,
  now: number,
  mods: EventMods = NO_MODS,
): { click: number; idle: number; mult: number; xpClick: number; xpIdle: number } {
  const mult = boostMultiplier(boost, now)
  const fx = modFactors(mods, now, now)
  return {
    click: clickPower(p) * mult * fx.click,
    idle: idlePerSec(p) * fx.cps,
    mult,
    xpClick: xpPerClick(p.skills) * fx.click,
    xpIdle: xpPerSec(p) * fx.xpIdle,
  }
}
