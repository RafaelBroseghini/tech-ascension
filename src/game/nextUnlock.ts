import { CAPITAL_UNLOCK, GEAR_TAB_UNLOCK, GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import type { Gig, JobTier, SkillTier } from "../data/phases.ts"
import { GEAR } from "../data/gear.ts"
import type { GearItem } from "../data/gear.ts"
import { CAPITAL } from "../data/capital.ts"
import type { Capital, Era } from "../data/capital.ts"
import { canAfford, isGearRevealed, jobById, nextCost, ownedCount, skillById } from "./economy.ts"
import type { Progress } from "./economy.ts"
import { formatNumber } from "./format.ts"
import { capitalUnlocked, equipmentOpen, gigBoardUnlocked, gigSkillGap, jobBoardUnlocked } from "./phase.ts"
import type { Gates, ShopTab } from "./phase.ts"

export type NextUnlock = {
  key: string
  name: string
  /** The shop tab this thing lives on. */
  tab: ShopTab
  /** What is still missing (XP, skills, gig count, money), shortest useful phrase each. Never empty. */
  needs: string[]
  /** True when any one of `needs` opens it (Capital), instead of all of them. */
  either: boolean
}

type Progression = Gates & Pick<Progress, "equipment"> & Partial<Pick<Progress, "money" | "xp">>

/** The shop row a Next click should reveal. `row` matches `data-row` on the offer. */
export type ShopFocus = {
  tab: ShopTab
  row: string
  era?: Era
}

const rowId = (key: string, prefix: string) => {
  if (!key.startsWith(prefix)) return null
  const id = Number(key.slice(prefix.length))
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * The row the player can act on for this suggestion. Closed boards point at the
 * prerequisite you buy or clear (a skill, the next gig, the senior job), not at
 * the lock panel. A catalog row points at itself. Null when the only gap is XP
 * or cash, so there is no row to open.
 */
export function shopFocus(p: Progression, next: NextUnlock): ShopFocus | null {
  if (rowId(next.key, "skill:")) return { tab: "A", row: next.key }
  if (rowId(next.key, "gig:")) return { tab: "B", row: next.key }
  if (rowId(next.key, "job:")) return { tab: "C", row: next.key }
  if (rowId(next.key, "gear:")) return { tab: "G", row: next.key }

  const capitalId = rowId(next.key, "capital:")
  if (capitalId) {
    const era = CAPITAL.find((row) => row.id === capitalId)?.era
    return era ? { tab: "D", row: next.key, era } : { tab: "D", row: next.key }
  }

  if (next.key === "board:gig") {
    const id = GIG_BOARD_UNLOCK.requireOwnedSkills.find((skillId) => ownedCount(p.skills, skillId) === 0)
    return id ? { tab: "A", row: `skill:${id}` } : null
  }

  if (next.key === "board:job") {
    if (p.gigs.length >= JOB_BOARD_UNLOCK.minGigsCompleted) return null
    const gig = GIGS.find((row) => !p.gigs.includes(row.id))
    return gig ? { tab: "B", row: `gig:${gig.id}` } : null
  }

  if (next.key === "board:capital" && !p.jobs.some((id) => id >= CAPITAL_UNLOCK.minJobId)) {
    return { tab: "C", row: `job:${CAPITAL_UNLOCK.minJobId}` }
  }

  return null
}

const xpLeft = (have: number, need: number) => `${formatNumber(Math.ceil(need - have))} more XP`
const moneyLeft = (have: number, need: number) => `$${formatNumber(Math.ceil(need - have))} more held`
const gigsLeft = (have: number, need: number) => `${need - have} more ${need - have === 1 ? "gig" : "gigs"}`
const cashShort = (have: number, cost: number) => `$${formatNumber(Math.ceil(cost - have))}`
const xpShort = (have: number, cost: number) => `${formatNumber(Math.ceil(cost - have))} XP`

/** True once every skill, gig, job, gear row, and capital row is owned at least once. */
export function ownsEverything(p: Pick<Progress, "skills" | "equipment" | "owned" | "jobs" | "gigs">): boolean {
  for (const skill of SKILL_TIERS) if (ownedCount(p.skills, skill.id) === 0) return false
  for (const gig of GIGS) if (!p.gigs.includes(gig.id)) return false
  for (const job of JOB_TIERS) if (!p.jobs.includes(job.id)) return false
  for (const row of GEAR) if (ownedCount(p.equipment, row.id) === 0) return false
  for (const row of CAPITAL) if (ownedCount(p.owned, row.id) === 0) return false
  return true
}

const wallet = (p: Progression) => (typeof p.money === "number" && Number.isFinite(p.money) ? p.money : 0)
const study = (p: Progression) => (typeof p.xp === "number" && Number.isFinite(p.xp) ? p.xp : 0)

/**
 * The one thing to chase next. Closed gates come first, in the order their XP
 * thresholds fall: Gear tab (10K XP), Gig Board (14K + two skills), Job Board
 * (40K + 6 gigs), then Capital (Senior job or $500K). With every gate open,
 * walk Skills, then Gigs, Jobs, Gear and Capital in catalog order and stop at
 * the first row that is not owned yet. An earlier unlocked row that was never
 * bought wins over a later row the player already qualifies for. Gear, skills
 * and capital have no stack cap, so the first copy is the teaser step and a
 * second copy does not keep the banner parked. `needs` is never empty.
 * Returns null when every row has been bought at least once.
 */
export function nextUnlock(p: Progression): NextUnlock | null {
  if (!equipmentOpen(p)) {
    return { key: "board:gear", name: "Gear", tab: "G", needs: [xpLeft(p.xpTotal, GEAR_TAB_UNLOCK.minXp)], either: false }
  }

  if (!gigBoardUnlocked(p)) {
    const needs: string[] = []
    if (p.xpTotal < GIG_BOARD_UNLOCK.minXp) needs.push(xpLeft(p.xpTotal, GIG_BOARD_UNLOCK.minXp))
    for (const id of GIG_BOARD_UNLOCK.requireOwnedSkills) {
      if (ownedCount(p.skills, id) === 0) needs.push(`Own ${skillById(id)?.name ?? `skill ${id}`}`)
    }
    return { key: "board:gig", name: "Gig Board", tab: "B", needs, either: false }
  }

  if (!jobBoardUnlocked(p)) {
    const needs: string[] = []
    if (p.xpTotal < JOB_BOARD_UNLOCK.minXp) needs.push(xpLeft(p.xpTotal, JOB_BOARD_UNLOCK.minXp))
    if (p.gigs.length < JOB_BOARD_UNLOCK.minGigsCompleted) needs.push(gigsLeft(p.gigs.length, JOB_BOARD_UNLOCK.minGigsCompleted))
    return { key: "board:job", name: "Job Board", tab: "C", needs, either: false }
  }

  if (!capitalUnlocked(p)) {
    const senior = jobById(CAPITAL_UNLOCK.minJobId)
    const needs = [
      `${senior?.name ?? "Senior SWE"}${senior && p.xpTotal < senior.xpReq ? ` (${xpLeft(p.xpTotal, senior.xpReq)})` : ""}`,
      moneyLeft(p.peakMoney, CAPITAL_UNLOCK.minMoney),
    ]
    return { key: "board:capital", name: "Capital", tab: "D", needs, either: true }
  }

  for (const skill of SKILL_TIERS) {
    if (ownedCount(p.skills, skill.id) > 0) continue
    return skillTarget(p, skill)
  }
  for (const gig of GIGS) {
    if (p.gigs.includes(gig.id)) continue
    return gigTarget(p, gig)
  }
  for (const job of JOB_TIERS) {
    if (p.jobs.includes(job.id)) continue
    return jobTarget(p, job)
  }
  for (const row of GEAR) {
    if (ownedCount(p.equipment, row.id) > 0) continue
    return gearTarget(p, row)
  }
  for (const row of CAPITAL) {
    if (ownedCount(p.owned, row.id) > 0) continue
    return capitalTarget(p, row)
  }

  return null
}

function skillTarget(p: Progression, skill: SkillTier): NextUnlock {
  const needs: string[] = []
  if (p.xpTotal < skill.unlockAtXp) needs.push(xpLeft(p.xpTotal, skill.unlockAtXp))
  else {
    const cost = nextCost(skill.baseXpCost, 0)
    if (!canAfford(study(p), cost)) needs.push(xpShort(study(p), cost))
    else needs.push("to buy it")
  }
  return { key: `skill:${skill.id}`, name: skill.name, tab: "A", needs, either: false }
}

function gigTarget(p: Progression, gig: Gig): NextUnlock {
  const needs: string[] = []
  if (p.xpTotal < gig.xpReq) needs.push(xpLeft(p.xpTotal, gig.xpReq))
  if (p.gigs.length < gig.priorGigs) needs.push(gigsLeft(p.gigs.length, gig.priorGigs))
  const skills = gigSkillGap(p, gig)
  if (skills) needs.push(skills)
  if (needs.length === 0) needs.push("to clear it")
  return { key: `gig:${gig.id}`, name: gig.name, tab: "B", needs, either: false }
}

function jobTarget(p: Progression, job: JobTier): NextUnlock {
  if (p.xpTotal < job.xpReq) {
    return { key: `job:${job.id}`, name: job.name, tab: "C", needs: [xpLeft(p.xpTotal, job.xpReq)], either: false }
  }
  if (job.baseCost > 0 && !canAfford(wallet(p), job.baseCost)) {
    return { key: `job:${job.id}`, name: job.name, tab: "C", needs: [cashShort(wallet(p), job.baseCost)], either: false }
  }
  return { key: `job:${job.id}`, name: job.name, tab: "C", needs: [job.baseCost > 0 ? "to buy it" : "to take it"], either: false }
}

function gearTarget(p: Progression, row: GearItem): NextUnlock {
  const needs: string[] = []
  if (!isGearRevealed(row, p.equipment, p.peakMoney, p.jobs)) {
    if (p.peakMoney < row.unlockMoney) needs.push(moneyLeft(p.peakMoney, row.unlockMoney))
    if (row.unlockJobId > 0 && !p.jobs.includes(row.unlockJobId)) needs.push(jobById(row.unlockJobId)?.name ?? `job ${row.unlockJobId}`)
  }
  if (needs.length === 0) {
    const cost = nextCost(row.baseCost, 0)
    if (!canAfford(wallet(p), cost)) needs.push(cashShort(wallet(p), cost))
    else needs.push("to buy it")
  }
  return { key: `gear:${row.id}`, name: row.name, tab: "G", needs, either: false }
}

function capitalTarget(p: Progression, row: Capital): NextUnlock {
  if (p.peakMoney < row.baseCost) {
    return { key: `capital:${row.id}`, name: row.name, tab: "D", needs: [moneyLeft(p.peakMoney, row.baseCost)], either: false }
  }
  const cost = nextCost(row.baseCost, 0)
  if (!canAfford(wallet(p), cost)) {
    return { key: `capital:${row.id}`, name: row.name, tab: "D", needs: [cashShort(wallet(p), cost)], either: false }
  }
  return { key: `capital:${row.id}`, name: row.name, tab: "D", needs: ["to buy it"], either: false }
}
