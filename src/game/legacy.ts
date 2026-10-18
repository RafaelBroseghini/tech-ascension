import { ENDING_BONUS, LEGACY_PERKS, HALL_OF_FAME, PERK, PRESTIGE_EARN_SCALE } from "../data/legacy.ts"
import type { HallEnding, LegacyPerk } from "../data/legacy.ts"
import { GIG_BOARD_UNLOCK, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { HOME_REGION_ID } from "../data/regions.ts"
import { jobById, skillCost } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { isEnding, productRole } from "./globe/hires.ts"
import type { Ending } from "./globe/hires.ts"
import { totalUsers } from "./globe/world.ts"
import { perkEffects } from "./perks.ts"

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
  /** The Hall of Fame: endings a career has won the world with, in the Hall's order. */
  endings: HallEnding[]
}

export function freshLegacy(): LegacyState {
  return { runs: 1, prestige: 0, prestigeTotal: 0, earnedAllRuns: 0, perks: [], endings: [] }
}

const PERK_BY_ID = new Map<string, LegacyPerk>(LEGACY_PERKS.map((perk) => [perk.id, perk]))

export const legacyPerkById = (id: string): LegacyPerk | undefined => PERK_BY_ID.get(id)

/** Lifetime Prestige that this much total earnings would have paid: floor(cbrt(earned / PRESTIGE_EARN_SCALE)). */
export function prestigeTotalFor(earned: number): number {
  if (!Number.isFinite(earned) || earned <= 0) return 0
  // The nudge keeps an exact cube from landing one rung low in floating point.
  return Math.max(0, Math.floor(Math.cbrt(earned / PRESTIGE_EARN_SCALE) + 1e-9))
}

/** How a career's product ended, as the Exit reads it. */
export type ExitWin = { won: boolean; ending?: Ending | undefined }

/**
 * Prestige earned from earnings so far: the total less the one-time ending bonuses in it. The bonus is paid on top of the
 * earnings, so it does not count as a rung of the earnings ladder.
 */
export const earningsTotal = (legacy: Pick<LegacyState, "prestigeTotal" | "endings">): number => Math.max(0, legacy.prestigeTotal - legacy.endings.length * ENDING_BONUS)

/** Prestige from earnings alone: the rungs climbed since the last Exit. */
export function earningsPrestige(legacy: LegacyState, runEarned: number): number {
  return Math.max(0, prestigeTotalFor(legacy.earnedAllRuns + Math.max(0, runEarned)) - earningsTotal(legacy))
}

/** The Hall of Fame bonus: `ENDING_BONUS` when the career won with an ending not yet recorded, else 0. */
export function endingBonus(legacy: Pick<LegacyState, "endings">, win?: ExitWin | null): number {
  return win?.won && win.ending && !legacy.endings.includes(win.ending) ? ENDING_BONUS : 0
}

/** Prestige this Exit would pay in all: the earnings part and the ending bonus. */
export function prestigeOnExit(legacy: LegacyState, runEarned: number, win?: ExitWin | null): number {
  return earningsPrestige(legacy, runEarned) + endingBonus(legacy, win)
}

/**
 * The Exit is open on every later career, and on the first once it would pay at least 1 Prestige. It latches: earnings
 * only rise within a career (`stats.lifetimeEarned` never falls, and only an Exit zeroes it, with `runs` going up), and
 * a win stays won.
 */
export function exitOpen(legacy: LegacyState, runEarned: number, win?: ExitWin | null): boolean {
  return legacy.runs > 1 || prestigeOnExit(legacy, runEarned, win) >= 1
}

/** The Exit can be taken: it is open and pays at least one Prestige. */
export function canExit(legacy: LegacyState, runEarned: number, win?: ExitWin | null): boolean {
  return exitOpen(legacy, runEarned, win) && prestigeOnExit(legacy, runEarned, win) >= 1
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

/** Clamps a saved block: unknown perk ids and endings dropped, numbers finite and >= 0, `prestigeTotal >= prestige`, `runs >= 1`. */
export function normalizeLegacy(raw: unknown): LegacyState {
  const base = freshLegacy()
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base
  const row = raw as Record<string, unknown>
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0)
  const prestige = Math.floor(num(row.prestige))
  const perks = Array.isArray(row.perks) ? [...new Set(row.perks.filter((id): id is string => typeof id === "string" && PERK_BY_ID.has(id)))] : []
  const endings = Array.isArray(row.endings) ? row.endings.filter(isEnding) : []
  return {
    runs: Math.max(1, Math.floor(num(row.runs))),
    prestige,
    prestigeTotal: Math.max(prestige, Math.floor(num(row.prestigeTotal))),
    earnedAllRuns: num(row.earnedAllRuns),
    perks: LEGACY_PERKS.filter((perk) => perks.includes(perk.id)).map((perk) => perk.id),
    endings: HALL_OF_FAME.filter((entry) => endings.includes(entry.id)).map((entry) => entry.id),
  }
}

/** A saved block is only written once there is something in it. */
export function isFreshLegacy(legacy: LegacyState): boolean {
  return legacy.runs === 1 && legacy.prestige === 0 && legacy.prestigeTotal === 0 && legacy.earnedAllRuns === 0 && legacy.perks.length === 0 && legacy.endings.length === 0
}

/**
 * Users the product starts with under Early adopters, at the home region. Top-up, not a gift on top: a career that
 * already has this many users keeps them.
 */
export function withStartUsers(users: Readonly<Record<string, number>>, perks: readonly string[]): Record<string, number> {
  const want = perkEffects(perks).startUsers
  const have = totalUsers(users)
  if (have >= want) return { ...users }
  return { ...users, [HOME_REGION_ID]: (users[HOME_REGION_ID] ?? 0) + (want - have) }
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

/** What the headline card says about how the product ended. */
export type HeadlineFacts = { handle: string; product: string; users: number; won: boolean; ending?: Ending | undefined }

/** "@quiet-otter sells Otterly, the app seven billion people use". The first three rows are by users; a win reads by its ending. */
export function exitHeadline(f: HeadlineFacts): string {
  const handle = `@${f.handle}`
  if (f.won) {
    if (f.ending === "sponsor") return `${f.product} sold; its team thanks their executive sponsor`
    if (f.ending === "nightOwl") return `${handle} sells the side project seven billion people use. Get some sleep.`
    return `${handle} sells ${f.product}, the app seven billion people use`
  }
  if (f.users < 1_000_000) return `${handle} acqui-hired; ${f.product} sunset 'to focus on the core'`
  if (f.users < 1_000_000_000) return `${f.product} acquired; ${handle} stays on as 'advisor'`
  return `${f.product} sold in a blockbuster deal`
}

/** A product sold in an earlier career, as the résumé lists it. */
export type PastProduct = { product: string; role: string; meta: string }

/**
 * The products of earlier careers, newest first, from the journal's `exit` entries: "Founder, Otterly" (or the sponsor
 * line) for one that won the world, "Side project, Otterly" for one sold before that.
 */
export function pastProductsOf(entries: readonly { type: string; data?: Readonly<Record<string, number | string | boolean>> | undefined }[]): PastProduct[] {
  const out: PastProduct[] = []
  for (const entry of entries) {
    if (entry.type !== "exit" || typeof entry.data?.product !== "string") continue
    const product = entry.data.product
    const users = typeof entry.data.users === "number" ? entry.data.users : 0
    const ending = isEnding(entry.data.ending) ? entry.data.ending : null
    const won = entry.data.won === true
    out.push({
      product,
      role: won ? productRole(ending, product) : `Side project, ${product}`,
      meta: won ? "Sold · seven billion users" : `Sold · ${users.toLocaleString("en-US")} users`,
    })
  }
  return out.reverse()
}

/** The card shown after an Exit. Not saved. */
export type ExitCard = {
  /** The career that ended (1 for the first). */
  run: number
  headline: string
  /** Prestige paid in all, ending bonus included. */
  prestigeEarned: number
  /** The ending recorded in the Hall of Fame by this Exit, or null. */
  newEnding: HallEnding | null
  /** The bonus it paid (0 with no new ending). */
  endingBonus: number
  /** The permanent multiplier after this Exit. */
  mult: number
}
