import { hireBonusOf, hirePayrollOf, parseHires } from "./hires.ts"
import type { Hires } from "./hires.ts"
import { WIN_MULT } from "./world.ts"

/** The ladder keeps the day job and builds the product on nights and weekends. A founder quits and builds it full-time. */
export type Track = "ladder" | "founder"

/** What the fork keeps in the save. `equityCut` is always `BRIDGE_CUT` times `bridges`; it is stored so the revenue line reads on its own. */
export interface FounderState {
  readonly track: Track
  /** Latched once the fork's modal has shown. From then on the red button is always on screen. */
  readonly offered: boolean
  /** Bridges raised, at most `MAX_BRIDGES`. */
  readonly bridges: number
  /** The share of product revenue given up for good, from bridges. */
  readonly equityCut: number
  /** The users needed before quitting is allowed again, after a return to a job. Null when nothing blocks it. */
  readonly requitAt: number | null
  /** True while the out-of-runway choice is open. The burn is stopped until it is answered. */
  readonly broke: boolean
  /** Heads hired of each kind (`HIRES`), by id. A founder keeps them but hires no more. */
  readonly hires: Hires
}

export const FRESH_FOUNDER: FounderState = { track: "ladder", offered: false, bridges: 0, equityCut: 0, requitAt: null, broke: false, hires: {} }

/** Users the product needs, with a job held, before the fork opens. */
export const FORK_USERS = 1000

/** Growth on nights and weekends, and with the days given to it. */
export const LADDER_GROWTH = 0.25
export const FOUNDER_GROWTH = 2

/** What a founder's served users pay, as a multiple of the ladder's. */
export const FOUNDER_REVENUE = 3

export const MAX_BRIDGES = 3
/** Revenue given up for good with each bridge. */
export const BRIDGE_CUT = 0.1
/** A bridge pays this many minutes of burn. */
export const BRIDGE_MINUTES = 30
/** Away, the balance never drops below this many minutes of burn. */
export const AWAY_FLOOR_MINUTES = 1

/** The win pays more when the company was built full-time. */
export const WIN_MULT_FOUNDER = 1.5

/** Dollars a second a team and an office cost with nobody yet: the floor of the burn. */
export const BURN_BASE = 60
/** Dollars a second the team grows by for each square root of a user. A company's costs grow slower than its crowd, so a big one turns a profit. */
export const BURN_ROOT = 1.2

/** The burn in $/s a founder carries at this many users. */
export function burnOf(users: number): number {
  return BURN_BASE + BURN_ROOT * Math.sqrt(Math.max(0, users))
}

export const growthMultOf = (track: Track): number => (track === "founder" ? FOUNDER_GROWTH : LADDER_GROWTH)

/** Product revenue multiplier: ×3 as a founder, and what bridges gave up on either track. */
export const revenueMultOf = (f: Pick<FounderState, "track" | "equityCut">): number => (f.track === "founder" ? FOUNDER_REVENUE : 1) * (1 - f.equityCut)

export const winMultOf = (track: Track): number => (track === "founder" ? WIN_MULT_FOUNDER : WIN_MULT)

/** What the growth model reads from the fork. */
export interface TrackFacts {
  readonly track: Track
  /** The whole growth multiplier: the track's, plus what the hires add. */
  readonly growthMult: number
  /** The part of `growthMult` the hires add. */
  readonly hireBonus: number
  readonly revenueMult: number
  /** True while the burn runs: a founder who has not run out. */
  readonly burning: boolean
  /** Dollars a second the hires cost now. Paid on the ladder always, and by a founder until the run-out choice stops the burn. */
  readonly payroll: number
}

export function trackFactsOf(f: FounderState): TrackFacts {
  const hireBonus = hireBonusOf(f.hires)
  const paying = f.track === "ladder" || !f.broke
  return {
    track: f.track,
    growthMult: growthMultOf(f.track) + hireBonus,
    hireBonus,
    revenueMult: revenueMultOf(f),
    burning: f.track === "founder" && !f.broke,
    payroll: paying ? hirePayrollOf(f.hires) : 0,
  }
}

/** Dollars a second the served users pay once the track's multiplier and the equity given up are in. */
export const productRevenueOf = (baseRevenuePerSec: number, f: Pick<FounderState, "track" | "equityCut">): number => baseRevenuePerSec * revenueMultOf(f)

/** The fork is open once the product has its users and a job is held. */
export const forkOpen = (users: number, jobs: readonly number[]): boolean => users >= FORK_USERS && jobs.length > 0

/** Whether quitting is allowed now: on the ladder, the fork open, and past the users a return asked for. */
export function canGoFullTime(f: FounderState, users: number, jobs: readonly number[]): boolean {
  return f.track === "ladder" && forkOpen(users, jobs) && (f.requitAt === null || users >= f.requitAt)
}

/** Why the red button is shut, for its tooltip: the users still needed, or null when it is open. */
export function usersNeeded(f: FounderState, users: number): number | null {
  return f.track === "ladder" && f.requitAt !== null && users < f.requitAt ? Math.ceil(f.requitAt) : null
}

export function goFullTime(f: FounderState): FounderState {
  return { ...f, track: "founder", offered: true, requitAt: null, broke: false }
}

/** Runway in seconds at a net income, or null when the net is not negative (the money does not run down). */
export function runwayOf(money: number, net: number): number | null {
  if (!(net < 0)) return null
  return Math.max(0, money) / -net
}

/** The trade the fork's modal shows, from the real model at this moment. */
export interface ForkOffer {
  /** Salary given up, $/s. */
  readonly salary: number
  /** Product revenue now, and as a founder. */
  readonly revenueNow: number
  readonly revenueFounder: number
  readonly burn: number
  /** Income a second as a founder, after the burn. */
  readonly net: number
  readonly runwaySec: number | null
}

/**
 * The trade at this moment. `idle` is idle $/s with the salaries in, `salary` the part of it that is salary, `revenue` and
 * `lostPerSec` come from serving the users as they are.
 */
export function forkOffer(facts: { idle: number; salary: number; revenue: number; lostPerSec: number; users: number; money: number; founder: FounderState }): ForkOffer {
  const burn = burnOf(facts.users) + hirePayrollOf(facts.founder.hires)
  const asFounder = { track: "founder" as const, equityCut: facts.founder.equityCut }
  const revenueFounder = productRevenueOf(facts.revenue, asFounder)
  const net = facts.idle - facts.salary + revenueFounder - facts.lostPerSec - burn
  return {
    salary: facts.salary,
    revenueNow: productRevenueOf(facts.revenue, { track: "ladder", equityCut: facts.founder.equityCut }),
    revenueFounder,
    burn,
    net,
    runwaySec: runwayOf(facts.money, net),
  }
}

/** A bridge: cash worth `BRIDGE_MINUTES` of burn, a tenth of the revenue given up, and the choice closed. Null when it is refused. */
export function raiseBridge(f: FounderState, users: number): { founder: FounderState; cash: number } | null {
  if (f.track !== "founder" || !f.broke || f.bridges >= MAX_BRIDGES) return null
  const bridges = f.bridges + 1
  return { founder: { ...f, bridges, equityCut: BRIDGE_CUT * bridges, broke: false }, cash: burnOf(users) * BRIDGE_MINUTES * 60 }
}

/**
 * Back to a job. The track returns to the ladder and the next quit waits for twice today's users. `dropRung` (the run-out
 * way back) gives up the highest job held, one rung down; a lone first job has nothing under it and stays.
 */
export function returnToLadder(f: FounderState, users: number, jobs: readonly number[], dropRung: boolean): { founder: FounderState; jobs: number[] } | null {
  if (f.track !== "founder") return null
  const top = jobs.reduce((best, id) => Math.max(best, id), 0)
  const kept = dropRung && jobs.length > 1 ? jobs.filter((id) => id !== top) : [...jobs]
  return { founder: { ...f, track: "ladder", requitAt: Math.ceil(2 * users), broke: false }, jobs: kept }
}

/**
 * What a stretch of burn does to a balance. `raw` is the balance after the stretch's income and the burn. A live tick stops
 * at 0; time away stops at the smaller of the balance it left with and one minute of burn. Running out sets `broke`.
 */
export function settleBurn(start: number, raw: number, burnPerSec: number, away: boolean): { money: number; broke: boolean } {
  const floor = away ? Math.min(Math.max(0, start), burnPerSec * AWAY_FLOOR_MINUTES * 60) : 0
  return { money: Math.max(raw, floor), broke: raw <= 0 }
}

/** A saved founder block, checked: anything malformed is dropped, so a bad block never breaks a load. */
export function parseFounder(input: unknown): FounderState | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined
  const raw = input as Record<string, unknown>
  if (raw.track !== "ladder" && raw.track !== "founder") return undefined
  const bridges = typeof raw.bridges === "number" && Number.isInteger(raw.bridges) ? Math.max(0, Math.min(MAX_BRIDGES, raw.bridges)) : 0
  const cut = typeof raw.equityCut === "number" && Number.isFinite(raw.equityCut) ? raw.equityCut : 0
  const requitAt = typeof raw.requitAt === "number" && Number.isFinite(raw.requitAt) && raw.requitAt > 0 ? raw.requitAt : null
  return {
    track: raw.track,
    offered: raw.offered === true || raw.track === "founder",
    bridges,
    equityCut: Math.max(0, Math.min(BRIDGE_CUT * bridges, cut)),
    requitAt: raw.track === "ladder" ? requitAt : null,
    broke: raw.track === "founder" && raw.broke === true,
    hires: parseHires(raw.hires),
  }
}
