/**
 * The per-kind rules as they were written before the tree, kept word for word as a test oracle: `treeEquivalence.test.ts`
 * runs these and the tree side by side over whole careers (every build and origin) and fails on the first row that
 * differs. Nothing in the game imports this file.
 */
import { CAPITAL_UNLOCK, GEAR_TAB_UNLOCK, GIG_BOARD_UNLOCK, JOB_BOARD_UNLOCK, SKILL_TIERS } from "../../data/phases.ts"
import type { Equip, Gig, JobTier, SkillTier } from "../../data/phases.ts"
import type { Capital } from "../../data/capital.ts"
import { LEAD_OPEN_RANK } from "../../data/leadership.ts"
import { canAfford, ownedCount } from "../economy.ts"
import { heldRank, leadOf, needsLead, needsPick, originOf, rowVisible, seniorUsersShort, specOf } from "../build.ts"
import { gigBoardXp, gigTagMin, gigXpReq, jobBoardGigs, jobXpReq } from "../origin.ts"
import type { Gates } from "../phase.ts"

export function gigBoardUnlocked(p: Gates): boolean {
  if (p.gigs.length > 0) return true
  return p.xpTotal >= gigBoardXp(originOf(p)) && GIG_BOARD_UNLOCK.requireOwnedSkills.every((id) => ownedCount(p.skills, id) > 0)
}

export function jobBoardUnlocked(p: Gates): boolean {
  if (p.jobs.length > 0) return true
  return p.xpTotal >= JOB_BOARD_UNLOCK.minXp && p.gigs.length >= jobBoardGigs(originOf(p))
}

export function capitalUnlocked(p: Gates): boolean {
  if (heldRank(p) >= CAPITAL_UNLOCK.minJobRank) return true
  if (canAfford(p.peakMoney, CAPITAL_UNLOCK.minMoney)) return true
  return Object.values(p.owned).some((count) => count > 0)
}

export function equipmentOpen(p: { xpTotal: number; equipment: Record<string, number> }): boolean {
  return p.xpTotal >= GEAR_TAB_UNLOCK.minXp || Object.values(p.equipment).some((count) => count > 0)
}

export type OracleGigState = "done" | "board-locked" | "locked" | "ready"

export function gigState(p: Gates, gig: Gig): OracleGigState {
  if (p.gigs.includes(gig.id)) return "done"
  if (!gigBoardUnlocked(p)) return "board-locked"
  if (p.xpTotal < gigXpReq(originOf(p), gig)) return "locked"
  for (const need of gig.needs) {
    const have = SKILL_TIERS.filter((skill) => skill.tags.includes(need.tag) && ownedCount(p.skills, skill.id) > 0).length
    if (have < gigTagMin(originOf(p), specOf(p), need.tag, need.min)) return "locked"
  }
  return "ready"
}

export type OracleJobState = "owned" | "board-locked" | "hidden" | "pick" | "lead" | "locked" | "users" | "ready"

export function jobState(p: Gates, job: JobTier): OracleJobState {
  if (p.jobs.includes(job.id)) return "owned"
  if (!jobBoardUnlocked(p)) return "board-locked"
  if (!rowVisible(job, specOf(p), leadOf(p))) return "hidden"
  if (needsPick(job) && specOf(p) === null) return "pick"
  if (needsLead(job) && leadOf(p) === null) return "lead"
  if (p.xpTotal < jobXpReq(originOf(p), job)) return "locked"
  if (job.rank === LEAD_OPEN_RANK && seniorUsersShort({ jobs: p.jobs, build: p.build, company: p.company }) > 0) return "users"
  return "ready"
}

export function isRevealed(tier: Capital, owned: Record<string, number>, peakMoney: number): boolean {
  return ownedCount(owned, tier.id) > 0 || canAfford(peakMoney, tier.baseCost)
}

export function isSkillRevealed(row: SkillTier, skills: Record<string, number>, xpTotal: number): boolean {
  return ownedCount(skills, row.id) > 0 || xpTotal >= row.unlockAtXp
}

export function isGearRevealed(row: Equip, equipment: Record<string, number>, peakMoney: number, jobs: readonly number[], peakRank = 0): boolean {
  if (ownedCount(equipment, row.id) > 0) return true
  const rank = Math.max(jobs.reduce((best, id) => Math.max(best, jobRankOf(id)), 0), peakRank)
  return canAfford(peakMoney, row.unlockMoney) && (row.unlockJobRank === 0 || rank >= row.unlockJobRank)
}

import { jobRank as jobRankOf } from "../../data/phases.ts"
