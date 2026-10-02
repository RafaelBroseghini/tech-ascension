import { CAPITAL_UNLOCK, GIG_BOARD_UNLOCK, JOB_BOARD_UNLOCK } from "../data/phases.ts"
import type { Gig, JobTier } from "../data/phases.ts"
import { EQUIP_ART, GIG_ART, JOB_ART, SKILL_ART } from "../data/art.ts"
import type { Era } from "../data/tiers.ts"
import { canAfford, highestOwnedSkill, highestOwnedTier, jobById, ownedCount, skillById } from "./economy.ts"
import type { Progress } from "./economy.ts"
import { formatNumber } from "./format.ts"

/** A skill grind, B gigs, C job + equipment, D capital. */
export type Phase = "A" | "B" | "C" | "D"

export const PHASES: readonly Phase[] = ["A", "B", "C", "D"]

export const PHASE_NAME: Record<Phase, string> = {
  A: "Skill grind",
  B: "Gigs",
  C: "Jobs + gear",
  D: "Capital",
}

type Gates = Pick<Progress, "xpTotal" | "peakMoney" | "skills" | "owned" | "jobs" | "gigs">

/**
 * Gates latch: each one also opens when the player already holds what it leads to (a gig done,
 * a job taken, a capital tier owned), so forced progress never sits behind a closed board.
 */
export function gigBoardUnlocked(p: Gates): boolean {
  if (p.gigs.length > 0) return true
  return (
    p.xpTotal >= GIG_BOARD_UNLOCK.minXp &&
    GIG_BOARD_UNLOCK.requireOwnedTier.every((id) => ownedCount(p.skills, id) > 0)
  )
}

export function jobBoardUnlocked(p: Gates): boolean {
  if (p.jobs.length > 0) return true
  return p.xpTotal >= JOB_BOARD_UNLOCK.minXp && p.gigs.length >= JOB_BOARD_UNLOCK.minGigsCompleted
}

/** Senior job (id >= 7) OR $500K held at some point (peakMoney) OR any capital tier already owned. */
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

/** Clicks pay money once the first gig is cleared (or money otherwise exists). Before that they pay XP only. */
export function moneyMode(p: Pick<Progress, "peakMoney" | "gigs" | "jobs">): boolean {
  return p.gigs.length > 0 || p.jobs.length > 0 || p.peakMoney > 0
}

export type GigState = "done" | "board-locked" | "locked" | "ready"

export function gigState(p: Gates, gig: Gig): GigState {
  if (p.gigs.includes(gig.id)) return "done"
  if (!gigBoardUnlocked(p)) return "board-locked"
  if (p.xpTotal < gig.xpReq || p.gigs.length < gig.priorGigs) return "locked"
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

export function equipmentOpen(p: Gates): boolean {
  return jobBoardUnlocked(p)
}

export type Stage = {
  /** Sprite and code-overlay id (see src/data/art.ts). 0 is the opening scene. */
  artId: number
  name: string
  /** Era for boosts, fights and the stage accent. Only owned capital tiers move it past "early". */
  era: Era
}

/** The stage shows the furthest thing the player holds: capital, then job, then gig, then skill. */
export function stageOf(p: Pick<Progress, "skills" | "owned" | "jobs" | "gigs">): Stage | null {
  const tier = highestOwnedTier(p.owned)
  if (tier) return { artId: tier.id, name: tier.name, era: tier.era }
  const jobId = Math.max(0, ...p.jobs)
  if (jobId > 0) return { artId: JOB_ART[jobId - 1] ?? 1, name: JOB_STAGE_NAME[jobId - 1] ?? "Engineer", era: "early" }
  const gigId = Math.max(0, ...p.gigs)
  if (gigId > 0) return { artId: GIG_ART[gigId - 1] ?? 1, name: "Freelancer", era: "early" }
  const skill = highestOwnedSkill(p.skills)
  if (skill) return { artId: SKILL_ART[skill.id - 1] ?? 1, name: skill.name, era: "early" }
  return null
}

const JOB_STAGE_NAME: readonly string[] = [
  "Intern",
  "Junior engineer",
  "Reviewer",
  "On-call engineer",
  "Mid-level engineer",
  "Systems designer",
  "Senior engineer",
  "Staff engineer",
]

export function eraOf(p: Pick<Progress, "owned">): Era {
  return highestOwnedTier(p.owned)?.era ?? "early"
}

/** Art ids of everything owned, for the click waterfall. */
export function ownedArtIds(p: Pick<Progress, "skills" | "equipment" | "owned" | "jobs" | "gigs">): number[] {
  const ids = new Set<number>()
  for (const [key, count] of Object.entries(p.owned)) if (count > 0 && Number(key) > 0) ids.add(Number(key))
  for (const [key, count] of Object.entries(p.skills)) if (count > 0) ids.add(SKILL_ART[Number(key) - 1] ?? 0)
  for (const [key, count] of Object.entries(p.equipment)) if (count > 0) ids.add(EQUIP_ART[Number(key) - 1] ?? 0)
  for (const id of p.jobs) ids.add(JOB_ART[id - 1] ?? 0)
  for (const id of p.gigs) ids.add(GIG_ART[id - 1] ?? 0)
  ids.delete(0)
  return [...ids]
}

export type Requirement = { text: string; met: boolean }

export function gigBoardRequirements(p: Gates): Requirement[] {
  return [
    { text: `${formatNumber(GIG_BOARD_UNLOCK.minXp)} lifetime XP (${formatNumber(Math.floor(p.xpTotal))})`, met: p.xpTotal >= GIG_BOARD_UNLOCK.minXp },
    ...GIG_BOARD_UNLOCK.requireOwnedTier.map((id) => ({
      text: `Own ${skillById(id)?.name ?? `skill ${id}`}`,
      met: ownedCount(p.skills, id) > 0,
    })),
  ]
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
