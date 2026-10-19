import { idleParts, idlePerSec } from "./economy.ts"
import type { Progress } from "./economy.ts"
import { modFactors, modsOf } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import { servingOf } from "./globe/load.ts"
import { hirePayrollOf } from "./globe/hires.ts"
import { burnOf, forkOffer, productRevenueOf, runwayOf } from "./globe/track.ts"
import type { ForkOffer, FounderState } from "./globe/track.ts"
import { perkEffects } from "./perks.ts"
import { totalUsers } from "./globe/world.ts"
import type { CompanyState } from "./globe/growth.ts"

/** What the money picture reads: the balance, what is owned, the fork and the company's users. */
export type OutlookSlice = Pick<Progress, "money" | "equipment" | "owned" | "jobs" | "gigs"> & {
  founder: FounderState
  company: Pick<CompanyState, "users" | "incidents">
  foreverMult: number
  tempMults: TempMults
  /** The Legacy block: the perks that cut the burn and lift revenue, and the Prestige total behind the permanent bonus. */
  legacy: { readonly perks: readonly string[]; readonly prestigeTotal: number }
}

export interface Outlook {
  /** The burn running now, $/s: the team and office of a founder who has not run out, with the hires' salaries in. 0 otherwise. */
  readonly burn: number
  /** The hires' salaries now, $/s: paid on the ladder, and by a founder until the burn stops. */
  readonly payroll: number
  /** Income minus burn and salaries, $/s, on the track the career is on. */
  readonly net: number
  /** Seconds until the balance is gone at today's numbers, or null when the money does not run down. */
  readonly runwaySec: number | null
  /** The trade of quitting at this moment, as the fork's modal shows it. */
  readonly offer: ForkOffer
}

/** One place for the numbers the fork shows: the harness, the modal, the fork button and the company view all read this. */
export function founderOutlook(s: OutlookSlice, at: number): Outlook {
  const fx = modFactors(modsOf(s), at, at)
  const serving = servingOf(s.company.users, s.company.incidents, s.equipment)
  const users = totalUsers(s.company.users)
  const asLadder = { ...s, founder: undefined }
  const idleWithSalary = idlePerSec(asLadder) * fx.cps
  const salary = idleParts(asLadder).jobs * fx.cps
  const offer = forkOffer({ idle: idleWithSalary, salary, revenue: serving.revenuePerSec, lostPerSec: serving.lostPerSec, users, money: s.money, founder: s.founder, perks: s.legacy.perks })
  const burning = s.founder.track === "founder" && !s.founder.broke
  const payroll = s.founder.track === "ladder" || !s.founder.broke ? hirePayrollOf(s.founder.hires) : 0
  const burn = burning ? burnOf(users, perkEffects(s.legacy.perks).burn) + payroll : 0
  const income = idlePerSec(s) * fx.cps + productRevenueOf(serving.revenuePerSec, s.founder, s.legacy.perks) - serving.lostPerSec
  const net = income - (burning ? burn : payroll)
  return { burn, payroll, net, runwaySec: burning ? runwayOf(s.money, net) : null, offer }
}

/** A runway as a short chip: "45s", "12m", "3h 10m". */
export function runwayShort(sec: number): string {
  if (sec < 60) return `${Math.max(1, Math.floor(sec))}s`
  const minutes = Math.round(sec / 60)
  if (minutes < 90) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours >= 48) return `${Math.floor(hours / 24)}d`
  return minutes % 60 === 0 || hours >= 10 ? `${hours}h` : `${hours}h ${minutes % 60}m`
}

/** A runway in words, for a line of copy: "less than a minute", "12 minutes", "3 hours". */
export function runwayWords(sec: number): string {
  const minutes = Math.round(sec / 60)
  if (sec < 60) return "less than a minute"
  if (minutes === 1) return "1 minute"
  if (minutes < 120) return `${minutes} minutes`
  const hours = Math.round(minutes / 60)
  return hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`
}
