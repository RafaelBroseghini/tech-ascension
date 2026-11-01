import { LEGACY_PERKS, PERK, PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import type { LegacyPerk } from "../data/legacy.ts"
import { GIG_BOARD_UNLOCK, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { jobById, skillCost } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"

/**
 * The Exit and Legacy rules (docs/PRESTIGE.md). Pure: the store reads and writes them, the save keeps `LegacyState`
 * as its optional `legacy` block.
 */
export type LegacyState = {
  /** Careers started, counting the one under way. 1 on a new save. */
  runs: number
  /** Spendable Prestige. Buying a perk spends it. */
  prestige: number
  /** Every Prestige ever earned. Never falls; it drives the permanent bonus. */
  prestigeTotal: number
  /** What earlier careers earned (`stats.lifetimeEarned` of each, summed). */
  earnedAllRuns: number
  /** Legacy perk ids owned. */
  perks: string[]
}

export function freshLegacy(): LegacyState {
  return { runs: 1, prestige: 0, prestigeTotal: 0, earnedAllRuns: 0, perks: [] }
}

const PERK_BY_ID = new Map<string, LegacyPerk>(LEGACY_PERKS.map((perk) => [perk.id, perk]))

export const legacyPerkById = (id: string): LegacyPerk | undefined => PERK_BY_ID.get(id)

/** Lifetime Prestige that this much total earnings would have paid: floor(cbrt(earned / PRESTIGE_EARN_SCALE)). */
export function prestigeTotalFor(earned: number): number {
  if (!Number.isFinite(earned) || earned <= 0) return 0
  // The nudge keeps an exact cube from landing one rung low in floating point.
  return Math.max(0, Math.floor(Math.cbrt(earned / PRESTIGE_EARN_SCALE) + 1e-9))
}

/** Prestige from earnings: the rungs climbed since the last Exit. */
export function earningsPrestige(legacy: LegacyState, runEarned: number): number {
  return Math.max(0, prestigeTotalFor(legacy.earnedAllRuns + Math.max(0, runEarned)) - legacy.prestigeTotal)
}

/**
 * The Exit is open on every later career, and on the first once it would pay at least 1 Prestige. It latches: earnings
 * only rise within a career (`stats.lifetimeEarned` never falls, and only an Exit zeroes it, with `runs` going up).
 */
export function exitOpen(legacy: LegacyState, runEarned: number): boolean {
  return legacy.runs > 1 || earningsPrestige(legacy, runEarned) >= 1
}

/** The Exit can be taken: it is open and pays at least one Prestige. */
export function canExit(legacy: LegacyState, runEarned: number): boolean {
  return exitOpen(legacy, runEarned) && earningsPrestige(legacy, runEarned) >= 1
}

/** The perk before this one in its track, or undefined for the first. */
function previousPerk(perk: LegacyPerk): LegacyPerk | undefined {
  const track = LEGACY_PERKS.filter((row) => row.track === perk.track)
  return track[track.indexOf(perk) - 1]
}

/** Known, not owned, the earlier perk of its track owned, and enough spendable Prestige. */
export function canBuyPerk(legacy: LegacyState, id: string): boolean {
  const perk = legacyPerkById(id)
  if (!perk || legacy.perks.includes(perk.id)) return false
  const before = previousPerk(perk)
  if (before && !legacy.perks.includes(before.id)) return false
  return legacy.prestige >= perk.cost
}

/** Clamps a saved block: unknown perk ids dropped, numbers finite and >= 0, `prestigeTotal >= prestige`, `runs >= 1`. */
export function normalizeLegacy(raw: unknown): LegacyState {
  const base = freshLegacy()
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base
  const row = raw as Record<string, unknown>
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0)
  const prestige = Math.floor(num(row.prestige))
  const perks = Array.isArray(row.perks) ? [...new Set(row.perks.filter((id): id is string => typeof id === "string" && PERK_BY_ID.has(id)))] : []
  return {
    runs: Math.max(1, Math.floor(num(row.runs))),
    prestige,
    prestigeTotal: Math.max(prestige, Math.floor(num(row.prestigeTotal))),
    earnedAllRuns: num(row.earnedAllRuns),
    perks: LEGACY_PERKS.filter((perk) => perks.includes(perk.id)).map((perk) => perk.id),
  }
}

/** A saved block is only written once there is something in it. */
export function isFreshLegacy(legacy: LegacyState): boolean {
  return legacy.runs === 1 && legacy.prestige === 0 && legacy.prestigeTotal === 0 && legacy.earnedAllRuns === 0 && legacy.perks.length === 0
}

/** What the Network perks put into a new career. Every field is a floor or a list to merge, never a spend. */
export type StartingGrant = {
  skills: OwnedMap
  gigs: number[]
  jobs: number[]
  /** Lifetime XP at least this much, so the gates of everything granted read consistently. */
  xpTotal: number
  /** Spendable XP paid on top (the internship's one-time lump). */
  xp: number
  money: number
}

/**
 * The start of a new career under the perks held, in track order (each perk includes the ones before it):
 * - `network.skills`: skills 1 to 10, one copy each.
 * - `network.gigBoard`: Portfolio site live and React (skills 15 and 16) and 14,000 lifetime XP, which is exactly what
 *   the Gig Board's gate reads, so the board is open by the same latch every career uses.
 * - `network.gigs`: gigs 1 to 6 cleared. Their lump sums are not paid.
 * - `network.internship`: job 1 held and its XP lump paid once.
 * - `network.seed`: $1,000,000 held; `peakMoney` follows it, so capital opens. It is not earnings.
 * Lifetime XP is set to the most any granted gate needs, so nothing granted sits behind a gate it has not passed.
 */
export function startingGrant(perks: readonly string[]): StartingGrant {
  const grant: StartingGrant = { skills: {}, gigs: [], jobs: [], xpTotal: 0, xp: 0, money: 0 }
  const has = (id: string) => perks.includes(id)
  let skillXp = 0
  const addSkills = (ids: readonly number[]) => {
    for (const id of ids) {
      const row = SKILL_TIERS.find((skill) => skill.id === id)
      if (!row) continue
      grant.skills[String(id)] = 1
      // Lifetime XP covers what buying it cost and the XP that reveals it.
      skillXp += skillCost(row, 0)
      grant.xpTotal = Math.max(grant.xpTotal, row.unlockAtXp)
    }
  }
  if (has("network.skills")) addSkills(Array.from({ length: PERK.skills }, (_, i) => i + 1))
  if (has("network.gigBoard")) {
    addSkills(GIG_BOARD_UNLOCK.requireOwnedSkills)
    grant.xpTotal = Math.max(grant.xpTotal, GIG_BOARD_UNLOCK.minXp)
  }
  if (has("network.gigs")) {
    for (const gig of GIGS.slice(0, PERK.gigsCleared)) {
      grant.gigs.push(gig.id)
      grant.xpTotal = Math.max(grant.xpTotal, gig.xpReq)
    }
  }
  if (has("network.internship")) {
    const job = jobById(JOB_TIERS[0]?.id ?? 1)
    if (job) {
      grant.jobs.push(job.id)
      grant.xpTotal = Math.max(grant.xpTotal, job.xpReq)
      grant.xp += job.xpLump
    }
  }
  if (has("network.seed")) grant.money = PERK.seedMoney
  grant.xpTotal = Math.max(grant.xpTotal, skillXp) + grant.xp
  return grant
}

/** The slice of a career `mergeGrant` adds to. */
export type GrantTarget = {
  skills: OwnedMap
  gigs: readonly number[]
  jobs: readonly number[]
  xp: number
  xpTotal: number
  money: number
  peakMoney: number
}

/**
 * Adds a grant to a career without taking anything away: skills, gigs and jobs are unions (a skill already held keeps its
 * copies, a gig already cleared pays nothing), lifetime XP rises to the grant's floor, the internship's XP lump is
 * paid only when the job is newly held, and the seed money is added. A new career is merged into an empty one; a perk
 * bought mid-career is merged into the career as it stands.
 */
export function mergeGrant(target: GrantTarget, grant: StartingGrant): GrantTarget & { gigs: number[]; jobs: number[] } {
  const skills: OwnedMap = { ...target.skills }
  for (const [id, count] of Object.entries(grant.skills)) if (!(skills[id] > 0)) skills[id] = count
  const gigs = [...new Set([...target.gigs, ...grant.gigs])].sort((a, b) => a - b)
  const jobs = [...new Set([...target.jobs, ...grant.jobs])].sort((a, b) => a - b)
  // The lump belongs to the internship: it is paid only if the job was not held already.
  const lump = jobs.length > target.jobs.length ? grant.xp : 0
  const money = target.money + grant.money
  return {
    skills,
    gigs,
    jobs,
    xp: target.xp + lump,
    xpTotal: Math.max(target.xpTotal, grant.xpTotal - grant.xp) + lump,
    money,
    peakMoney: Math.max(target.peakMoney, money),
  }
}

/** What the headline card says about the career just closed. */
export type HeadlineFacts = { handle: string; earned: number }

/** The Exit's headline, by what the career earned: "@quiet-otter takes the severance and a very large mug". */
export function exitHeadline(f: HeadlineFacts): string {
  const handle = `@${f.handle}`
  if (f.earned < 1e12) return `${handle} takes the severance and a very large mug`
  if (f.earned < 1e14) return `${handle} retires to a standing desk and a quiet calendar`
  return `${handle} leaves a legacy, an endowed chair and a very long wiki`
}

/** The card shown after an Exit. Not saved. */
export type ExitCard = {
  /** The career that ended (1 for the first). */
  run: number
  headline: string
  /** Prestige paid. */
  prestigeEarned: number
  /** The permanent multiplier after this Exit. */
  mult: number
}
