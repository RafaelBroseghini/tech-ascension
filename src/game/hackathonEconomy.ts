import { HACK_ROUNDS, HACK_UNLOCK } from "../data/hackathon.ts"
import { SKILL_TIERS } from "../data/phases.ts"
import { ownedCount } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { eventStake } from "./events.ts"
import type { EarningRates } from "./events.ts"
import { prizeScale } from "./hackathon.ts"
import type { HackMeta, HackPrize } from "./hackathon.ts"
import { gigBoardUnlocked } from "./phase.ts"
import type { Gates } from "./phase.ts"

/*
 * Where the hackathon meets the rest of the game: when it opens (the Gig Board) and what it pays (event stakes).
 * Kept apart from the rules in hackathon.ts, which the save layer loads before the app, so the boot chunk never
 * pulls in the phase gates or the event table.
 */

export function ownedSkillCount(skills: OwnedMap): number {
  let count = 0
  for (const row of SKILL_TIERS) if (ownedCount(skills, row.id) > 0) count += 1
  return count
}

/** Opens with the Gig Board and a deck of `HACK_UNLOCK.minSkills` skills. Latches once a run was played. */
export function hackUnlocked(p: Gates, meta: Pick<HackMeta, "runs" | "run">): boolean {
  if (meta.runs > 0 || meta.run) return true
  return gigBoardUnlocked(p) && ownedSkillCount(p.skills) >= HACK_UNLOCK.minSkills
}

/**
 * What winning `round` pays right now: minutes of current income, same stakes as an event (at least 1% of the
 * pile). A money prize pays XP until money exists.
 */
export function roundPrize(round: number, league: number, rates: EarningRates, balance: { money: number; xp: number }, paying: boolean): HackPrize {
  const def = HACK_ROUNDS[round]
  if (!def) return { money: 0, xp: 0 }
  const minutes = def.prizeMinutes * prizeScale(league)
  if (def.prize === "money" && paying) return { money: eventStake("money", minutes, rates, balance.money), xp: 0 }
  return { money: 0, xp: eventStake("xp", minutes, rates, balance.xp) }
}
