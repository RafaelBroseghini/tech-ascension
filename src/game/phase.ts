import { CAPITAL_UNLOCK, GEAR_TAB_UNLOCK, GIG_BOARD_UNLOCK, JOB_BOARD_UNLOCK } from "../data/phases.ts"
import type { Gig, JobTier } from "../data/phases.ts"
import { artFor, EQUIP_ART, GIG_ART, JOB_ART, SKILL_ART } from "../data/art.ts"
import type { Era } from "../data/capital.ts"
import type { EmojiKind } from "../data/emojiAssets.ts"
import { canAfford, capitalById, highestOwnedSkill, highestOwnedCapital, jobById, ownedCount, skillById } from "./economy.ts"
import type { Progress } from "./economy.ts"
import { formatNumber } from "./format.ts"

/** A skill grind, B gigs, C jobs, D capital. Gear is a shop tab, not a phase (see ShopTab). */
export type Phase = "A" | "B" | "C" | "D"

export const PHASES: readonly Phase[] = ["A", "B", "C", "D"]

/** Shop tabs, left to right. "G" (Gear) sits between Jobs and Capital and never becomes the current phase. */
export type ShopTab = Phase | "G"

export const SHOP_TABS: readonly ShopTab[] = ["A", "B", "C", "G", "D"]

export const PHASE_NAME: Record<Phase, string> = {
  A: "Skill grind",
  B: "Gigs",
  C: "Jobs",
  D: "Capital",
}

export type Gates = Pick<Progress, "xpTotal" | "peakMoney" | "skills" | "owned" | "jobs" | "gigs">

/**
 * Gates latch: each one also opens when the player already holds what it leads to (a gig done,
 * a job taken, a capital row owned), so forced progress never sits behind a closed board.
 */
export function gigBoardUnlocked(p: Gates): boolean {
  if (p.gigs.length > 0) return true
  return (
    p.xpTotal >= GIG_BOARD_UNLOCK.minXp &&
    GIG_BOARD_UNLOCK.requireOwnedSkills.every((id) => ownedCount(p.skills, id) > 0)
  )
}

export function jobBoardUnlocked(p: Gates): boolean {
  if (p.jobs.length > 0) return true
  return p.xpTotal >= JOB_BOARD_UNLOCK.minXp && p.gigs.length >= JOB_BOARD_UNLOCK.minGigsCompleted
}

/** The Senior job (id 14) or higher OR $500K held at some point (peakMoney) OR any capital row already owned. */
export function capitalUnlocked(p: Gates): boolean {
  if (p.jobs.some((id) => id >= CAPITAL_UNLOCK.minJobId)) return true
  if (canAfford(p.peakMoney, CAPITAL_UNLOCK.minMoney)) return true
  return Object.values(p.owned).some((count) => count > 0)
}

export function phaseOf(p: Gates): Phase {
  if (capitalUnlocked(p)) return "D"
  if (jobBoardUnlocked(p)) return "C"
  if (gigBoardUnlocked(p)) return "B"
  return "A"
}

export function phaseRank(phase: Phase): number {
  return PHASES.indexOf(phase)
}

/** Fights and cash events start once a gig is cleared, a job is held, or money already exists. */
export function moneyMode(p: Pick<Progress, "peakMoney" | "gigs" | "jobs">): boolean {
  return p.gigs.length > 0 || p.jobs.length > 0 || p.peakMoney > 0
}

/** Click payouts in dollars wait until the first job is taken; gigs and salaries still pay without this. */
export function clickPaysMoney(p: Pick<Progress, "jobs">): boolean {
  return p.jobs.length > 0
}

/** Skills still missing for a gig. One or two are named; a longer set is a count. */
export function gigSkillGap(p: Pick<Gates, "skills">, gig: Gig): string | null {
  const missing = gig.skillIds.filter((id) => ownedCount(p.skills, id) === 0)
  if (missing.length === 0) return null
  if (missing.length <= 2) return missing.map((id) => skillById(id)?.name ?? `skill ${id}`).join(" + ")
  return `${missing.length} skills`
}

export type GigState = "done" | "board-locked" | "locked" | "ready"

export function gigState(p: Gates, gig: Gig): GigState {
  if (p.gigs.includes(gig.id)) return "done"
  if (!gigBoardUnlocked(p)) return "board-locked"
  if (p.xpTotal < gig.xpReq || p.gigs.length < gig.priorGigs || gigSkillGap(p, gig) !== null) return "locked"
  return "ready"
}

export type JobState = "owned" | "board-locked" | "locked" | "ready"

export function jobState(p: Gates, job: JobTier): JobState {
  if (p.jobs.includes(job.id)) return "owned"
  if (!jobBoardUnlocked(p)) return "board-locked"
  if (p.xpTotal < job.xpReq) return "locked"
  return "ready"
}

export function canBuyJob(p: Gates & Pick<Progress, "money">, job: JobTier): boolean {
  return jobState(p, job) === "ready" && canAfford(p.money, job.baseCost)
}

/** The Gear tab opens at GEAR_TAB_UNLOCK lifetime XP, independent of the boards. Owning gear keeps it open, so forced progress never hides it. */
export function equipmentOpen(p: Pick<Progress, "xpTotal" | "equipment">): boolean {
  return p.xpTotal >= GEAR_TAB_UNLOCK.minXp || Object.values(p.equipment).some((count) => count > 0)
}

export type Stage = {
  /** Code-overlay id (see src/data/art.ts). The picture on screen comes from `source`, not this id. */
  artId: number
  name: string
  /** Era for boosts, fights and the stage accent. Only owned capital rows move it past "early". */
  era: Era
  /** Catalog row whose sprite file, if one exists, is the stage picture. */
  source: { kind: EmojiKind; id: number }
}

/** The stage shows the furthest thing the player holds: capital, then job, then gig, then skill. */
export function stageOf(p: Pick<Progress, "skills" | "owned" | "jobs" | "gigs">): Stage | null {
  const tier = highestOwnedCapital(p.owned)
  if (tier) return { artId: tier.artId, name: tier.name, era: tier.era, source: { kind: "capital", id: tier.id } }
  const jobId = Math.max(0, ...p.jobs)
  if (jobId > 0) return { artId: artFor(JOB_ART, jobId), name: jobById(jobId)?.name ?? "Engineer", era: "early", source: { kind: "job", id: jobId } }
  const gigId = Math.max(0, ...p.gigs)
  if (gigId > 0) return { artId: artFor(GIG_ART, gigId), name: "Freelancer", era: "early", source: { kind: "gig", id: gigId } }
  const skill = highestOwnedSkill(p.skills)
  if (skill) return { artId: artFor(SKILL_ART, skill.id), name: skill.name, era: "early", source: { kind: "skill", id: skill.id } }
  return null
}

export function eraOf(p: Pick<Progress, "owned">): Era {
  return highestOwnedCapital(p.owned)?.era ?? "early"
}

/** Art ids of everything owned, for the click waterfall. */
export function ownedArtIds(p: Pick<Progress, "skills" | "equipment" | "owned" | "jobs" | "gigs">): number[] {
  const ids = new Set<number>()
  for (const [key, count] of Object.entries(p.owned)) if (count > 0) ids.add(capitalById(Number(key))?.artId ?? 0)
  for (const [key, count] of Object.entries(p.skills)) if (count > 0) ids.add(artFor(SKILL_ART, Number(key)))
  for (const [key, count] of Object.entries(p.equipment)) if (count > 0) ids.add(artFor(EQUIP_ART, Number(key)))
  for (const id of p.jobs) ids.add(artFor(JOB_ART, id))
  for (const id of p.gigs) ids.add(artFor(GIG_ART, id))
  ids.delete(0)
  return [...ids]
}

export type Requirement = { text: string; met: boolean }

export function gigBoardRequirements(p: Gates): Requirement[] {
  return [
    { text: `${formatNumber(GIG_BOARD_UNLOCK.minXp)} lifetime XP (${formatNumber(Math.floor(p.xpTotal))})`, met: p.xpTotal >= GIG_BOARD_UNLOCK.minXp },
    ...GIG_BOARD_UNLOCK.requireOwnedSkills.map((id) => ({
      text: `Own ${skillById(id)?.name ?? `skill ${id}`}`,
      met: ownedCount(p.skills, id) > 0,
    })),
  ]
}

export function gearRequirements(p: Pick<Progress, "xpTotal">): Requirement[] {
  return [{ text: `${formatNumber(GEAR_TAB_UNLOCK.minXp)} lifetime XP (${formatNumber(Math.floor(p.xpTotal))})`, met: p.xpTotal >= GEAR_TAB_UNLOCK.minXp }]
}

export function jobBoardRequirements(p: Gates): Requirement[] {
  return [
    { text: `${formatNumber(JOB_BOARD_UNLOCK.minXp)} lifetime XP (${formatNumber(Math.floor(p.xpTotal))})`, met: p.xpTotal >= JOB_BOARD_UNLOCK.minXp },
    { text: `${JOB_BOARD_UNLOCK.minGigsCompleted} gigs cleared (${p.gigs.length})`, met: p.gigs.length >= JOB_BOARD_UNLOCK.minGigsCompleted },
  ]
}

/** Either path opens capital, so the two lines are alternatives. */
export function capitalRequirements(p: Gates): Requirement[] {
  return [
    { text: `A senior job (${jobById(CAPITAL_UNLOCK.minJobId)?.name ?? "Senior SWE"} or higher)`, met: p.jobs.some((id) => id >= CAPITAL_UNLOCK.minJobId) },
    { text: `or hold $${formatNumber(CAPITAL_UNLOCK.minMoney)} at once`, met: canAfford(p.peakMoney, CAPITAL_UNLOCK.minMoney) },
  ]
}
