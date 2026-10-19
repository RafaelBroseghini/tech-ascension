import { CAPITAL } from "../data/capital.ts"
import { PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import type { Era } from "../data/capital.ts"
import { BASE_CLICK_KIT, BASE_THEMES, FEATURES } from "../data/features.ts"
import type { FeatureId, FeatureRow, FeatureTrigger } from "../data/features.ts"
import { GOLD_SKILLS } from "../data/gold.ts"
import { bandForTier } from "../data/idePacks.ts"
import { GEAR_TAB_UNLOCK, GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, CAPITAL_UNLOCK } from "../data/phases.ts"
import { canAfford, equipById, gearBase, isGearRevealed, jobById, nextCost, ownedCount, skillById, skillCost } from "./economy.ts"
import type { Progress } from "./economy.ts"
import { formatNumber } from "./format.ts"
import { goldSectionOpen, hoverRate } from "./gold.ts"
import { prestigeTotalFor } from "./legacy.ts"
import { ownsEverything } from "./nextUnlock.ts"
import { capitalUnlocked, equipmentOpen, gigBoardUnlocked, jobBoardUnlocked, moneyMode, stageOf } from "./phase.ts"

/** What the gates read: progress, the 10x dev skills, and the two things progress alone cannot say. */
export type FeatureProgress = Progress & {
  gold: readonly number[]
  /** Times the player came back after a break. */
  returns: number
  /** Time the game has been played, for the cat's fallback. */
  playTimeMs: number
  /** Careers started (`legacy.runs`); the Exit stays open on every later one. Omitted means the first. */
  runs?: number
  /** This career's lifetime earnings (`stats.lifetimeEarned`); the first career's Exit opens once they would pay a Prestige. Omitted means 0. */
  earned?: number
  /** The product has won the world: the Exit opens on the first career with the ending's bonus. */
  won?: boolean
}

const BY_ID = new Map<string, FeatureRow>(FEATURES.map((row) => [row.id, row]))

export function featureById(id: string): FeatureRow | undefined {
  return BY_ID.get(id)
}

export function isFeatureId(id: unknown): id is FeatureId {
  return typeof id === "string" && BY_ID.has(id)
}

/** A cosmetic waits on its picker. Everything else is a feature of its own. */
export function isCosmetic(row: FeatureRow): boolean {
  return row.parent !== undefined
}

const ERA_RANK: Record<Era, number> = { early: 0, mid: 1, upper: 2, q3: 3, end: 4 }

function reachedEra(p: Pick<Progress, "owned">, era: Era): boolean {
  return CAPITAL.some((row) => ownedCount(p.owned, row.id) > 0 && ERA_RANK[row.era] >= ERA_RANK[era])
}

/** True once progress alone opens the trigger. Gates latch the way the shop's do: progress never goes back. */
export function triggerMet(trigger: FeatureTrigger, p: FeatureProgress): boolean {
  switch (trigger.kind) {
    case "skill":
      return ownedCount(p.skills, trigger.id) > 0
    case "gear":
      return ownedCount(p.equipment, trigger.id) > 0
    case "firstGig":
      return p.gigs.length > 0
    case "firstJob":
      return p.jobs.length > 0
    case "money":
      return moneyMode(p)
    case "board":
      if (trigger.board === "gear") return equipmentOpen(p)
      if (trigger.board === "gigs") return gigBoardUnlocked(p)
      if (trigger.board === "jobs") return jobBoardUnlocked(p)
      return capitalUnlocked(p)
    case "gold":
      return goldSectionOpen(p)
    case "hover":
      return hoverRate(p.gold, ownsEverything(p)) > 0
    case "art":
      return (stageOf(p)?.artId ?? 0) >= trigger.tier
    case "era":
      return reachedEra(p, trigger.era)
    case "exit":
      return (p.runs ?? 1) > 1 || p.won === true || prestigeTotalFor(p.earned ?? 0) >= 1
  }
}

/** Every row progress has opened, in table order. */
export function openFeatureIds(p: FeatureProgress): FeatureId[] {
  return FEATURES.filter((row) => triggerMet(row.trigger, p)).map((row) => row.id)
}

/** Every row in the table: what admin mode shows. */
export const ALL_FEATURE_IDS: readonly FeatureId[] = FEATURES.map((row) => row.id)

/** The words for a trigger in a tease: "Linux CLI basics", "your first job", "come back after a break". */
export function triggerLabel(trigger: FeatureTrigger): string {
  switch (trigger.kind) {
    case "skill":
      return skillById(trigger.id)?.name ?? `skill ${trigger.id}`
    case "gear":
      return equipById(trigger.id)?.name ?? `gear ${trigger.id}`
    case "firstGig":
      return "your first gig"
    case "firstJob":
      return "your first job"
    case "money":
      return "your first dollar"
    case "board":
      if (trigger.board === "gear") return `${formatNumber(GEAR_TAB_UNLOCK.minXp)} lifetime XP`
      if (trigger.board === "gigs") return "the Gig Board"
      if (trigger.board === "jobs") return "the Job Board"
      return "a senior job or a $500,000 balance"
    case "gold":
      return `${formatNumber(firstGoldXp())} lifetime XP`
    case "hover":
      return "Hover Tap, a 10x dev skill"
    case "art":
      return `the ${bandForTier(trigger.tier).label} stage`
    case "era":
      return `the ${trigger.era === "q3" ? "scale" : trigger.era} era`
    case "exit":
      return "earning enough for your first Prestige, or winning the world"
  }
}

function firstGoldXp(): number {
  return Math.min(...GOLD_SKILLS.map((row) => row.unlockXp))
}

function ratio(have: number, need: number): number {
  if (!(need > 0)) return 1
  return Math.max(0, Math.min(1, have / need))
}

/** How close a trigger is, 0 to 1, and the shortest useful phrase for what is left. */
export type TriggerProgress = { fill: number; left: string }

const xpLeft = () => "more lifetime XP"

function gigBoardProgress(p: FeatureProgress): TriggerProgress {
  const skills = GIG_BOARD_UNLOCK.requireOwnedSkills.filter((id) => ownedCount(p.skills, id) > 0).length
  const xpFill = ratio(p.xpTotal, GIG_BOARD_UNLOCK.minXp)
  const skillFill = ratio(skills, GIG_BOARD_UNLOCK.requireOwnedSkills.length)
  if (xpFill <= skillFill) return { fill: xpFill, left: xpLeft() }
  const missing = GIG_BOARD_UNLOCK.requireOwnedSkills.find((id) => ownedCount(p.skills, id) === 0)
  return { fill: skillFill, left: `learn ${skillById(missing ?? 0)?.name ?? "a skill"}` }
}

function jobBoardProgress(p: FeatureProgress): TriggerProgress {
  const xpFill = ratio(p.xpTotal, JOB_BOARD_UNLOCK.minXp)
  const gigFill = ratio(p.gigs.length, JOB_BOARD_UNLOCK.minGigsCompleted)
  if (xpFill <= gigFill) return { fill: xpFill, left: xpLeft() }
  return { fill: gigFill, left: "more gigs" }
}

function firstGigProgress(p: FeatureProgress): TriggerProgress {
  if (!gigBoardUnlocked(p)) return { fill: gigBoardProgress(p).fill * 0.9, left: gigBoardProgress(p).left }
  const gig = GIGS[0]
  if (!gig) return { fill: 1, left: "" }
  const skills = gig.skillIds.filter((id) => ownedCount(p.skills, id) > 0).length
  const xpFill = ratio(p.xpTotal, gig.xpReq)
  const skillFill = ratio(skills, gig.skillIds.length)
  if (xpFill >= 1 && skillFill >= 1) return { fill: 0.99, left: "clear it on the Gig Board" }
  return xpFill <= skillFill
    ? { fill: 0.9 + xpFill * 0.09, left: xpLeft() }
    : { fill: 0.9 + skillFill * 0.09, left: "more skills" }
}

function firstJobProgress(p: FeatureProgress): TriggerProgress {
  if (!jobBoardUnlocked(p)) return { fill: jobBoardProgress(p).fill * 0.9, left: jobBoardProgress(p).left }
  const job = JOB_TIERS[0]
  if (!job) return { fill: 1, left: "" }
  if (p.xpTotal < job.xpReq) return { fill: 0.9 + ratio(p.xpTotal, job.xpReq) * 0.09, left: xpLeft() }
  return { fill: 0.99, left: "take it on the Job Board" }
}

function skillProgress(p: FeatureProgress, id: number): TriggerProgress {
  const row = skillById(id)
  if (!row) return { fill: 0, left: "" }
  if (p.xpTotal < row.unlockAtXp) return { fill: ratio(p.xpTotal, row.unlockAtXp) * 0.5, left: xpLeft() }
  const cost = skillCost(row, 0)
  if (canAfford(p.xp, cost)) return { fill: 1, left: "ready to learn" }
  return { fill: 0.5 + ratio(p.xp, cost) * 0.5, left: "more XP" }
}

function gearProgress(p: FeatureProgress, id: number): TriggerProgress {
  const row = equipById(id)
  if (!row) return { fill: 0, left: "" }
  if (!equipmentOpen(p)) return { fill: ratio(p.xpTotal, GEAR_TAB_UNLOCK.minXp) * 0.4, left: xpLeft() }
  if (!isGearRevealed(row, p.equipment, p.peakMoney, p.jobs)) {
    const job = row.unlockJobId > 0 && !p.jobs.includes(row.unlockJobId) ? jobById(row.unlockJobId) : undefined
    if (job) return { fill: 0.4, left: `the ${job.name} job` }
    return { fill: 0.4 + ratio(p.peakMoney, row.unlockMoney) * 0.3, left: "a bigger balance" }
  }
  const cost = nextCost(gearBase(row, p), 0)
  if (canAfford(p.money, cost)) return { fill: 1, left: "ready to buy" }
  return { fill: 0.7 + ratio(p.money, cost) * 0.3, left: "more money" }
}

function hoverProgress(p: FeatureProgress): TriggerProgress {
  const row = GOLD_SKILLS.find((gold) => gold.effect.kind === "hoverRate")
  if (!row) return { fill: 0, left: "" }
  if (p.xpTotal < row.unlockXp) return { fill: ratio(p.xpTotal, row.unlockXp) * 0.5, left: xpLeft() }
  if (canAfford(p.xp, row.cost)) return { fill: 1, left: "ready to claim" }
  return { fill: 0.5 + ratio(p.xp, row.cost) * 0.5, left: "more XP" }
}

function capitalProgress(p: FeatureProgress): TriggerProgress {
  const senior = jobById(CAPITAL_UNLOCK.minJobId)
  const byJob = senior ? ratio(p.xpTotal, senior.xpReq) * 0.95 : 0
  const byMoney = ratio(p.peakMoney, CAPITAL_UNLOCK.minMoney)
  return byMoney >= byJob
    ? { fill: byMoney, left: "a bigger balance" }
    : { fill: byJob, left: senior ? `the ${senior.name} job` : "a senior job" }
}

/** How close a closed row is. Open rows read full. */
export function triggerProgress(trigger: FeatureTrigger, p: FeatureProgress): TriggerProgress {
  if (triggerMet(trigger, p)) return { fill: 1, left: "" }
  switch (trigger.kind) {
    case "skill":
      return skillProgress(p, trigger.id)
    case "gear":
      return gearProgress(p, trigger.id)
    case "firstGig":
    case "money":
      return firstGigProgress(p)
    case "firstJob":
      return firstJobProgress(p)
    case "board":
      if (trigger.board === "gear") return { fill: ratio(p.xpTotal, GEAR_TAB_UNLOCK.minXp), left: xpLeft() }
      if (trigger.board === "gigs") return gigBoardProgress(p)
      if (trigger.board === "jobs") return jobBoardProgress(p)
      return capitalProgress(p)
    case "gold":
      return { fill: ratio(p.xpTotal, firstGoldXp()), left: xpLeft() }
    case "hover":
      return hoverProgress(p)
    case "art":
    case "era":
      return { fill: 0, left: "" }
    case "exit": {
      return { fill: ratio(p.earned ?? 0, PRESTIGE_EARN_SCALE) * 0.9, left: "more earnings" }
    }
  }
}

/** A closed row the timeline teases: its name, what opens it, and how close it is. */
export type FeatureTease = {
  id: FeatureId
  name: string
  blurb: string
  /** "Linux CLI basics", "your first job". */
  via: string
  fill: number
  /** "more XP", "more gigs". */
  left: string
  /** The cat: shown as ??? until it arrives. */
  mystery: boolean
}

function teaseOf(row: FeatureRow, p: FeatureProgress): FeatureTease {
  const progress = triggerProgress(row.trigger, p)
  return {
    id: row.id,
    name: row.name,
    blurb: row.blurb,
    via: triggerLabel(row.trigger),
    fill: progress.fill,
    left: progress.left,
    mystery: row.id === "cat",
  }
}

/** The next closed rows in table order, skipping cosmetics. `open` is what is already unlocked. */
export function upNext(p: FeatureProgress, open: ReadonlySet<string>, count = 3): FeatureTease[] {
  const out: FeatureTease[] = []
  for (const row of FEATURES) {
    if (out.length >= count) break
    if (isCosmetic(row) || row.admin || open.has(row.id) || triggerMet(row.trigger, p)) continue
    out.push(teaseOf(row, p))
  }
  return out
}

/**
 * The one closed row that stands in its future place as a dim outline. Only rows with a slot on screen qualify,
 * and boards have their own dashed tab, so the screen never holds more than one outline.
 */
export function nextGhost(p: FeatureProgress, open: ReadonlySet<string>): FeatureTease | null {
  for (const row of FEATURES) {
    if (isCosmetic(row) || row.admin || row.size === "phase" || open.has(row.id) || triggerMet(row.trigger, p)) continue
    if (row.ghost === false) continue
    return teaseOf(row, p)
  }
  return null
}

/** The shop rows that open something: `skill:5` -> Career log and GitHug profile. A row can open a feature and a cosmetic at once. */
export function rowUnlocks(rowKey: string): FeatureRow[] {
  const [kind, raw] = rowKey.split(":")
  const id = Number(raw)
  return FEATURES.filter((row) => {
    if (kind === "skill") return row.trigger.kind === "skill" && row.trigger.id === id
    if (kind === "gear") return row.trigger.kind === "gear" && row.trigger.id === id
    return false
  })
}

/** Editor themes this career may pick: the base pair plus every theme row opened. */
export function themeChoices(open: ReadonlySet<string>): string[] {
  const ids = new Set(BASE_THEMES)
  for (const id of open) if (id.startsWith("theme:")) ids.add(id.slice("theme:".length))
  return [...ids]
}

/** Click kits this career may pick: the starting kit plus every kit row opened. */
export function clickKitChoices(open: ReadonlySet<string>): string[] {
  const ids = new Set([BASE_CLICK_KIT])
  for (const id of open) if (id.startsWith("kit:")) ids.add(id.slice("kit:".length))
  return [...ids]
}

/** Music styles this career may pick. Empty until music opens. */
export function musicChoices(open: ReadonlySet<string>): string[] {
  const ids: string[] = []
  for (const id of open) if (id.startsWith("music:")) ids.push(id.slice("music:".length))
  return ids
}
