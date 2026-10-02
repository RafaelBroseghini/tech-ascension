import { CAPITAL_UNLOCK, GEAR_TAB_UNLOCK, GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { GEAR } from "../data/gear.ts"
import { CAPITAL } from "../data/capital.ts"
import { isGearRevealed, isRevealed, jobById, ownedCount, skillById } from "./economy.ts"
import type { Progress } from "./economy.ts"
import { formatNumber } from "./format.ts"
import { capitalUnlocked, equipmentOpen, gigBoardUnlocked, gigState, jobBoardUnlocked, jobState } from "./phase.ts"
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

type Progression = Gates & Pick<Progress, "equipment">

const xpLeft = (have: number, need: number) => `${formatNumber(Math.ceil(need - have))} more XP`
const moneyLeft = (have: number, need: number) => `$${formatNumber(Math.ceil(need - have))} more held`
const gigsLeft = (have: number, need: number) => `${need - have} more ${need - have === 1 ? "gig" : "gigs"}`

/**
 * The one thing to chase next, so the player always knows what is missing. The closed gates come first,
 * in the order their XP thresholds fall: Gear tab (8K XP), Gig Board (12K + two skills), Job Board
 * (35K + 5 gigs), then Capital (Senior job or $500K). With everything open it is the locked row (gig,
 * job or skill) that needs the least XP, then the cheapest hidden gear row, then the cheapest hidden
 * capital row. Returns null when nothing is left to unlock.
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

  const rows: { gap: number; target: NextUnlock }[] = []
  const consider = (gap: number, target: NextUnlock) => rows.push({ gap, target })
  for (const gig of GIGS) {
    if (gigState(p, gig) !== "locked") continue
    const needs: string[] = []
    if (p.xpTotal < gig.xpReq) needs.push(xpLeft(p.xpTotal, gig.xpReq))
    if (p.gigs.length < gig.priorGigs) needs.push(gigsLeft(p.gigs.length, gig.priorGigs))
    consider(Math.max(0, gig.xpReq - p.xpTotal), { key: `gig:${gig.id}`, name: gig.name, tab: "B", needs, either: false })
  }
  for (const job of JOB_TIERS) {
    if (jobState(p, job) !== "locked") continue
    consider(job.xpReq - p.xpTotal, { key: `job:${job.id}`, name: job.name, tab: "C", needs: [xpLeft(p.xpTotal, job.xpReq)], either: false })
  }
  for (const skill of SKILL_TIERS) {
    if (ownedCount(p.skills, skill.id) > 0 || p.xpTotal >= skill.unlockAtXp) continue
    consider(skill.unlockAtXp - p.xpTotal, { key: `skill:${skill.id}`, name: skill.name, tab: "A", needs: [xpLeft(p.xpTotal, skill.unlockAtXp)], either: false })
  }
  const nearest = rows.reduce<(typeof rows)[number] | null>((best, row) => (!best || row.gap < best.gap ? row : best), null)
  if (nearest) return nearest.target

  const gear = GEAR.filter((row) => !isGearRevealed(row, p.equipment, p.peakMoney, p.jobs)).sort((a, b) => a.unlockMoney - b.unlockMoney)[0]
  if (gear) {
    const needs: string[] = []
    if (p.peakMoney < gear.unlockMoney) needs.push(moneyLeft(p.peakMoney, gear.unlockMoney))
    if (gear.unlockJobId > 0 && !p.jobs.includes(gear.unlockJobId)) needs.push(jobById(gear.unlockJobId)?.name ?? `job ${gear.unlockJobId}`)
    return { key: `gear:${gear.id}`, name: gear.name, tab: "G", needs, either: false }
  }

  const capital = CAPITAL.filter((row) => !isRevealed(row, p.owned, p.peakMoney)).sort((a, b) => a.baseCost - b.baseCost)[0]
  if (capital) return { key: `capital:${capital.id}`, name: capital.name, tab: "D", needs: [moneyLeft(p.peakMoney, capital.baseCost)], either: false }

  return null
}
