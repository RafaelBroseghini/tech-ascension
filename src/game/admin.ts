import { CAPITAL } from "../data/capital.ts"
import { GOLD_SKILLS } from "../data/gold.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import type { OwnedMap } from "./economy.ts"
import { persistNow, useGame } from "./store.ts"

const SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15 }

/** "1,500", "2.5m", "40k", "3e9" -> a number. Null for anything else or a negative. */
export function parseAmount(text: string): number | null {
  const clean = text.trim().toLowerCase().replace(/[,_\s$]/g, "")
  const match = /^(\d+(?:\.\d+)?(?:e\d+)?)([kmbtq]?)$/.exec(clean)
  if (!match) return null
  const value = Number(match[1]) * (match[2] ? SUFFIX[match[2]]! : 1)
  return Number.isFinite(value) ? value : null
}

export function setMoneyDirect(n: number): void {
  if (!Number.isFinite(n)) return
  useGame.setState({ money: Math.max(0, n) })
  persistNow()
}

/** Spendable XP. Lifetime XP rises to match, never falls. */
export function setXpDirect(n: number): void {
  if (!Number.isFinite(n)) return
  const xp = Math.max(0, n)
  useGame.setState((state) => ({ xp, xpTotal: Math.max(state.xpTotal, xp) }))
  persistNow()
}

/** Raises every row in `rows` to at least one copy. Rows already owned keep their count. */
function withOneOfEach(owned: OwnedMap, rows: readonly { id: number }[]): OwnedMap {
  const next = { ...owned }
  for (const row of rows) if (!next[String(row.id)]) next[String(row.id)] = 1
  return next
}

/**
 * Grants every skill, gold skill, gig, job, gear row and capital row for free, skipping cost and gates. Repeatables get
 * one copy when they had none. Newly taken jobs pay their one-time XP lump. Money and gig lumps are untouched.
 */
export function buyEverything(): void {
  useGame.setState((state) => {
    const newJobs = JOB_TIERS.filter((job) => !state.jobs.includes(job.id))
    const lump = newJobs.reduce((sum, job) => sum + job.xpLump, 0)
    return {
      skills: withOneOfEach(state.skills, SKILL_TIERS),
      equipment: withOneOfEach(state.equipment, EQUIPMENT),
      owned: withOneOfEach(state.owned, CAPITAL),
      gigs: GIGS.map((gig) => gig.id),
      gold: GOLD_SKILLS.map((row) => row.id),
      jobs: JOB_TIERS.map((job) => job.id),
      xp: state.xp + lump,
      xpTotal: state.xpTotal + lump,
      now: Date.now(),
      buyStamp: state.buyStamp + 1,
    }
  })
  persistNow()
}
