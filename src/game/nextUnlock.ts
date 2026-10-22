import { CAPITAL_UNLOCK, GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, SKILL_TIERS, visibleJobs } from "../data/phases.ts"
import type { Gig, JobTier, SkillTier } from "../data/phases.ts"
import { GEAR } from "../data/gear.ts"
import type { GearItem } from "../data/gear.ts"
import { CAPITAL } from "../data/capital.ts"
import type { Capital, Era } from "../data/capital.ts"
import { heldRank, leadOf, leadPickOpen, needsLead, needsPick, pickOpen, specOf } from "./build.ts"
import { LEADERSHIP } from "../data/leadership.ts"
import { SPECIALIZATIONS } from "../data/specializations.ts"
import { canAfford, capitalBase, firstJobAtRank, gearBase, isGearRevealed, nextCost, ownedCount, skillById, skillCost } from "./economy.ts"
import type { Progress } from "./economy.ts"
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

type Progression = Gates & Pick<Progress, "equipment" | "legacy"> & Partial<Pick<Progress, "money" | "xp">>

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
  if (next.key === PICK_KEY) return { tab: "C", row: `spec:${SPECIALIZATIONS[0]!.id}` }
  if (next.key === LEAD_PICK_KEY) return { tab: "C", row: `lead:${LEADERSHIP[0]!.id}` }
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

  if (next.key === "board:capital" && heldRank(p) < CAPITAL_UNLOCK.minJobRank) {
    return { tab: "C", row: `job:${firstJobAtRank(CAPITAL_UNLOCK.minJobRank)?.id ?? CAPITAL_UNLOCK.minJobRank}` }
  }

  return null
}

const xpLeft = () => "more XP"
/** A balance to reach once. Spending afterwards does not close the gate, so this names the goal, not a gap. */
const balanceGoal = () => "a bigger balance"
const gigsLeft = () => "more gigs"
const cashShort = () => "more money"
const xpShort = () => "more XP"

/** True once every skill, gig, job the career can see (its track and its line), gear row, and capital row is owned at least once. A career with no line picked has not finished the ladder. */
export function ownsEverything(p: Pick<Progress, "skills" | "equipment" | "owned" | "jobs" | "gigs" | "build">): boolean {
  for (const skill of SKILL_TIERS) if (ownedCount(p.skills, skill.id) === 0) return false
  for (const gig of GIGS) if (!p.gigs.includes(gig.id)) return false
  if (leadOf(p) === null) return false
  for (const job of visibleJobs(specOf(p), leadOf(p))) if (!p.jobs.includes(job.id)) return false
  for (const row of GEAR) if (ownedCount(p.equipment, row.id) === 0) return false
  for (const row of CAPITAL) if (ownedCount(p.owned, row.id) === 0) return false
  return true
}

const wallet = (p: Progression) => (typeof p.money === "number" && Number.isFinite(p.money) ? p.money : 0)
const study = (p: Progression) => (typeof p.xp === "number" && Number.isFinite(p.xp) ? p.xp : 0)

/** The closed board a tab sits behind, with what is still missing. Null once the tab is open (and always for Skills). */
function boardTarget(p: Progression, tab: ShopTab): NextUnlock | null {
  if (tab === "G" && !equipmentOpen(p)) {
    return { key: "board:gear", name: "Gear", tab: "G", needs: [xpLeft()], either: false }
  }

  if (tab === "B" && !gigBoardUnlocked(p)) {
    const needs: string[] = []
    if (p.xpTotal < GIG_BOARD_UNLOCK.minXp) needs.push(xpLeft())
    for (const id of GIG_BOARD_UNLOCK.requireOwnedSkills) {
      if (ownedCount(p.skills, id) === 0) needs.push(`Own ${skillById(id)?.name ?? `skill ${id}`}`)
    }
    return { key: "board:gig", name: "Gig Board", tab: "B", needs, either: false }
  }

  if (tab === "C" && !jobBoardUnlocked(p)) {
    const needs: string[] = []
    if (p.xpTotal < JOB_BOARD_UNLOCK.minXp) needs.push(xpLeft())
    if (p.gigs.length < JOB_BOARD_UNLOCK.minGigsCompleted) needs.push(gigsLeft())
    return { key: "board:job", name: "Job Board", tab: "C", needs, either: false }
  }

  if (tab === "D" && !capitalUnlocked(p)) {
    const senior = firstJobAtRank(CAPITAL_UNLOCK.minJobRank)
    const gap = !senior ? null : p.xpTotal < senior.xpReq ? xpLeft() : null
    const needs = [
      `${senior?.name ?? "Senior SWE"}${gap ? ` (${gap})` : ""}`,
      balanceGoal(),
    ]
    return { key: "board:capital", name: "Capital", tab: "D", needs, either: true }
  }

  return null
}

/** The first row of a tab that has not been bought yet. Gear, skills and capital count once the first copy is owned. */
function rowTarget(p: Progression, tab: ShopTab): NextUnlock | null {
  if (tab === "A") {
    for (const skill of SKILL_TIERS) if (ownedCount(p.skills, skill.id) === 0) return skillTarget(p, skill)
  }
  if (tab === "B") {
    for (const gig of GIGS) if (!p.gigs.includes(gig.id)) return gigTarget(p, gig)
  }
  if (tab === "C") {
    // The rows above Mid-level wait behind the pick: once the trunk is held, the next step is to pick one. The rows
    // above the tracks wait behind the leadership pick the same way, once the track is held to its top.
    const spec = specOf(p)
    const lead = leadOf(p)
    for (const job of visibleJobs(spec, lead)) {
      if (p.jobs.includes(job.id)) continue
      if (spec === null && needsPick(job)) return pickOpen(p) ? pickTarget() : null
      if (lead === null && needsLead(job)) return leadPickOpen(p) ? leadPickTarget() : null
      return jobTarget(p, job)
    }
  }
  if (tab === "G") {
    for (const row of GEAR) if (ownedCount(p.equipment, row.id) === 0) return gearTarget(p, row)
  }
  if (tab === "D") {
    for (const row of CAPITAL) if (ownedCount(p.owned, row.id) === 0) return capitalTarget(p, row)
  }
  return null
}

/**
 * The next thing to chase. With a `tab`, it is that panel's own next step: the closed board the tab sits behind
 * (what it still needs), or else the first row of that tab not bought yet. Null when the whole tab is done.
 * Each shop banner asks for its own tab, so Gigs never advertises a skill and Capital never advertises a gig.
 *
 * Without a `tab`, it is the one thing to chase across the whole game. The first skill that has not been bought
 * yet wins, even while Gear or a board is still thousands of XP away. Once every skill is owned, closed gates
 * come first, in the order their XP thresholds fall: Gear tab (10K XP), Gig Board (14K + two skills), Job Board
 * (40K + 6 gigs), then Capital (Senior job or $500K). With every gate open, walk Gigs, Jobs, Gear and Capital in
 * catalog order and stop at the first row that is not owned yet. An earlier unlocked row that was never bought
 * wins over a later row the player already qualifies for. Gear, skills and capital have no stack cap, so the
 * first copy is the teaser step and a second copy does not keep the banner parked. `needs` is never empty.
 * Returns null when every row has been bought at least once.
 */
export function nextUnlock(p: Progression, tab?: ShopTab): NextUnlock | null {
  if (tab) return boardTarget(p, tab) ?? rowTarget(p, tab)

  const skill = rowTarget(p, "A")
  if (skill) return skill
  for (const board of ["G", "B", "C", "D"] as const) {
    const closed = boardTarget(p, board)
    if (closed) return closed
  }
  for (const rows of ["B", "C", "G", "D"] as const) {
    const row = rowTarget(p, rows)
    if (row) return row
  }
  return null
}

/** Mid-level SWE is held and nothing is picked: any one of the specializations is the next step. */
export const PICK_KEY = "spec:pick"

function pickTarget(): NextUnlock {
  return { key: PICK_KEY, name: "Pick a specialization", tab: "C", needs: SPECIALIZATIONS.map((row) => row.name), either: true }
}

/** A Senior job is held and no line is picked: either one is the next step. */
export const LEAD_PICK_KEY = "lead:pick"

function leadPickTarget(): NextUnlock {
  return { key: LEAD_PICK_KEY, name: "Pick a leadership line", tab: "C", needs: LEADERSHIP.map((row) => row.name), either: true }
}

function skillTarget(p: Progression, skill: SkillTier): NextUnlock {
  const needs: string[] = []
  if (p.xpTotal < skill.unlockAtXp) needs.push(xpLeft())
  else {
    const cost = skillCost(skill, 0)
    if (!canAfford(study(p), cost)) needs.push(xpShort())
    else needs.push("to buy it")
  }
  return { key: `skill:${skill.id}`, name: skill.name, tab: "A", needs, either: false }
}

function gigTarget(p: Progression, gig: Gig): NextUnlock {
  const needs: string[] = []
  if (p.xpTotal < gig.xpReq) needs.push(xpLeft())
  if (p.gigs.length < gig.priorGigs) needs.push(gigsLeft())
  const skills = gigSkillGap(p, gig)
  if (skills) needs.push(skills)
  if (needs.length === 0) needs.push("to clear it")
  return { key: `gig:${gig.id}`, name: gig.name, tab: "B", needs, either: false }
}

function jobTarget(p: Progression, job: JobTier): NextUnlock {
  if (p.xpTotal < job.xpReq) {
    return { key: `job:${job.id}`, name: job.name, tab: "C", needs: [xpLeft()], either: false }
  }
  if (job.xpCost > 0 && !canAfford(study(p), job.xpCost)) {
    return { key: `job:${job.id}`, name: job.name, tab: "C", needs: [xpLeft()], either: false }
  }
  return { key: `job:${job.id}`, name: job.name, tab: "C", needs: ["to take it"], either: false }
}

function gearTarget(p: Progression, row: GearItem): NextUnlock {
  const needs: string[] = []
  if (!isGearRevealed(row, p.equipment, p.peakMoney, p.jobs, p.build?.peakRank)) {
    if (p.peakMoney < row.unlockMoney) needs.push(balanceGoal())
    if (row.unlockJobRank > 0 && heldRank(p) < row.unlockJobRank) needs.push(firstJobAtRank(row.unlockJobRank)?.name ?? `job ${row.unlockJobRank}`)
  }
  if (needs.length === 0) {
    const cost = nextCost(gearBase(row, p), 0)
    if (!canAfford(wallet(p), cost)) needs.push(cashShort())
    else needs.push("to buy it")
  }
  return { key: `gear:${row.id}`, name: row.name, tab: "G", needs, either: false }
}

/** A capital row opens at its own price, so the only thing to say is how much cash is missing. */
function capitalTarget(p: Progression, row: Capital): NextUnlock {
  const cost = nextCost(capitalBase(row, p), 0)
  if (!canAfford(wallet(p), cost)) {
    return { key: `capital:${row.id}`, name: row.name, tab: "D", needs: [cashShort()], either: false }
  }
  return { key: `capital:${row.id}`, name: row.name, tab: "D", needs: ["to buy it"], either: false }
}
