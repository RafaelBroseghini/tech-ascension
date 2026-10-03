import { EVENT_MEAN_WAIT_MS, EVENTS, eventsForEra } from "../data/events.ts"
import type { EventOffer, EventRequires, EventResource, GameEvent } from "../data/events.ts"
import type { Era } from "../data/capital.ts"
import { sampleWaitMs } from "./boosts.ts"
import { formatNumber } from "./format.ts"
import type { TempTarget } from "./mods.ts"

export { EVENT_MEAN_WAIT_MS, EVENTS }

/** Jobs held, gigs cleared, and gear owned. Missing lists count as empty. */
export type EventOwned = {
  jobs?: readonly number[]
  gigs?: readonly number[]
  equipment?: Readonly<Record<string, number>>
}

function numberList(value: unknown): readonly number[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is number => typeof id === "number" && Number.isFinite(id))
}

function gearCopies(equipment: Readonly<Record<string, number>> | undefined): number {
  if (!equipment) return 0
  let total = 0
  for (const count of Object.values(equipment)) if (count > 0) total += count
  return total
}

/**
 * True when every filled `requires` field holds. No `requires` is always eligible.
 * Fields AND together. A list matches if the player has any one of its ids.
 * A missing or empty field does not block the row.
 */
export function eventRequiresMet(event: { requires?: EventRequires }, owned: EventOwned = {}): boolean {
  const req = event.requires
  if (!req) return true
  const jobs = owned.jobs ?? []
  const gigs = owned.gigs ?? []
  const equipment = owned.equipment ?? {}
  if (typeof req.minJobId === "number" && Number.isFinite(req.minJobId)) {
    const highest = jobs.reduce((max, id) => (id > max ? id : max), 0)
    if (highest < req.minJobId) return false
  }
  const jobIds = numberList(req.jobIds)
  if (jobIds.length > 0 && !jobIds.some((id) => jobs.includes(id))) return false
  if (typeof req.minGigs === "number" && Number.isFinite(req.minGigs) && gigs.length < req.minGigs) return false
  const gigIds = numberList(req.gigIds)
  if (gigIds.length > 0 && !gigIds.some((id) => gigs.includes(id))) return false
  if (typeof req.minGearOwned === "number" && Number.isFinite(req.minGearOwned) && gearCopies(equipment) < req.minGearOwned) return false
  const gearIds = numberList(req.gearIds)
  if (gearIds.length > 0 && !gearIds.some((id) => (equipment[String(id)] ?? 0) > 0)) return false
  return true
}

/** The table row type. `data/events.ts` is a drop-in file: swap it and nothing here changes. */
export type EventDef = GameEvent

/** A blocked roll (fight or open modal) fires this long after the block lifts, so it never lands on top of it. */
export const EVENT_AFTER_BLOCK_MS = 5_000

const EVENT_BY_ID = new Map<number, EventDef>(EVENTS.map((event) => [event.id, event]))

export function eventById(id: number): EventDef | undefined {
  return EVENT_BY_ID.get(id)
}

export function offerTouchesMoney(offer: EventOffer): boolean {
  return offer.kind === "trade" || offer.resource === "money"
}

function touchesMoney(event: EventDef): boolean {
  return offerTouchesMoney(event.offer)
}

/**
 * Roll pool: `any` or the player's era, minus events the player does not qualify for, minus events
 * that move money before any money exists. Ownership defaults to empty, so a required row never
 * fires unless the caller passes jobs, gigs, and gear.
 */
export function eligibleEvents(era: Era, paying: boolean, owned: EventOwned = {}): EventDef[] {
  const pool = eventsForEra(era).filter((event) => eventRequiresMet(event, owned))
  return paying ? pool : pool.filter((event) => !touchesMoney(event))
}

export function pickEvent(pool: readonly EventDef[], rand: number): EventDef | null {
  const total = pool.reduce((sum, event) => sum + event.weight, 0)
  if (pool.length === 0 || !(total > 0)) return null
  let roll = Math.min(Math.max(rand, 0), 0.999999999) * total
  for (const event of pool) {
    if (roll < event.weight) return event
    roll -= event.weight
  }
  return pool[pool.length - 1] ?? null
}

export type EventLine = { text: string; tone: "good" | "bad" }

/** What the player is earning right now. Idle wins when it beats a steady click rate. */
export type EarningRates = {
  cps: number
  click: number
  xpPerSec: number
  xpPerClick: number
}

/** Clicks per second used when that beats idle income. */
export const EVENT_CLICKS_PER_SEC = 0.5

/** A stake is at least this share of the balance you hold, so a large pile is never a rounding error. */
export const EVENT_PILE_SHARE = 0.01

export const TARGET_LABEL: Record<TempTarget, string> = {
  click: "Click income",
  cps: "Idle $/s",
  xpPerSec: "Idle XP/s",
}

/** Event multipliers are small (x1.015), so keep up to three decimals. */
export function formatMult(value: number): string {
  return String(Number(value.toFixed(3)))
}

export function earningPerSec(resource: EventResource, rates: EarningRates): number {
  const idle = resource === "money" ? rates.cps : rates.xpPerSec
  const click = resource === "money" ? rates.click : rates.xpPerClick
  return Math.max(0, idle, click * EVENT_CLICKS_PER_SEC)
}

/** Minutes of current income, or 1% of what you hold, whichever is larger. */
export function eventStake(resource: EventResource, minutes: number, rates: EarningRates, balance: number): number {
  if (!(minutes > 0) || !Number.isFinite(minutes)) return 0
  const fromRate = minutes * 60 * earningPerSec(resource, rates)
  const fromPile = Math.max(0, balance) * EVENT_PILE_SHARE
  const raw = Math.max(fromRate, fromPile)
  if (!(raw > 0) || !Number.isFinite(raw)) return 0
  return Math.max(1, Math.floor(raw))
}

export type EventPreview = {
  lines: EventLine[]
  gain: number
  loss: number
  canAccept: boolean
}

function otherResource(resource: EventResource): EventResource {
  return resource === "money" ? "xp" : "money"
}

function held(resource: EventResource, money: number, xp: number): number {
  return resource === "money" ? money : xp
}

function stakeLine(resource: EventResource, amount: number, tone: "good" | "bad"): EventLine {
  const sign = tone === "good" ? "+" : "-"
  const text = resource === "money" ? `${sign}$${formatNumber(amount)}` : `${sign}${formatNumber(amount)} XP`
  return { text, tone }
}

/**
 * The numbers Yes would apply right now. A gift only gains. A trade gains one resource and
 * spends the other, capped at what you hold. Yes is refused when the gain is nothing, or when
 * a trade's cost rounds to nothing, so a choice can never be a pure deduction.
 */
export function previewOffer(offer: EventOffer, rates: EarningRates, money: number, xp: number): EventPreview {
  const gainResource = offer.kind === "gift" ? offer.resource : offer.gain
  const gain = eventStake(gainResource, offer.minutes, rates, held(gainResource, money, xp))
  const lines: EventLine[] = []
  if (gain > 0) lines.push(stakeLine(gainResource, gain, "good"))
  let loss = 0
  if (offer.kind === "trade") {
    const loseResource = otherResource(offer.gain)
    const priced = eventStake(loseResource, offer.minutes, rates, held(loseResource, money, xp))
    loss = Math.min(priced, Math.max(0, held(loseResource, money, xp)))
    if (loss > 0) lines.push(stakeLine(loseResource, loss, "bad"))
  }
  const canAccept = gain > 0 && (offer.kind === "gift" || loss > 0)
  return { lines, gain, loss, canAccept }
}

export type EventResolution = {
  money: number
  xp: number
  xpTotal: number
  lines: EventLine[]
  applied: boolean
}

/** Applies Yes. Lifetime XP only rises. Spendable XP and money floor at 0. A refused choice changes nothing. */
export function resolveOffer(money: number, xp: number, xpTotal: number, offer: EventOffer, rates: EarningRates): EventResolution {
  const preview = previewOffer(offer, rates, money, xp)
  if (!preview.canAccept) return { money, xp, xpTotal, lines: preview.lines, applied: false }
  let nextMoney = money
  let nextXp = xp
  let nextTotal = xpTotal
  const gainResource = offer.kind === "gift" ? offer.resource : offer.gain
  if (gainResource === "money") nextMoney += preview.gain
  else {
    nextXp += preview.gain
    nextTotal += preview.gain
  }
  if (offer.kind === "trade") {
    if (offer.gain === "money") nextXp = Math.max(0, nextXp - preview.loss)
    else nextMoney = Math.max(0, nextMoney - preview.loss)
  }
  return { money: nextMoney, xp: nextXp, xpTotal: nextTotal, lines: preview.lines, applied: true }
}

export type EventContext = { era: Era; paying: boolean; blocked: boolean; owned?: EventOwned }

export type EventAdvance = {
  nextEventAt: number | null
  fire: EventDef | null
}

/**
 * Advance the single event slot. Unscheduled -> schedule `EVENT_MEAN_WAIT_MS` out (same clamped
 * exponential as boosts and enemies). Due -> fire, unless blocked by a fight or an open modal, in
 * which case it slips to `EVENT_AFTER_BLOCK_MS` after the block lifts. After a fire the slot stays
 * unscheduled until the store dismisses the modal, so two events never overlap or queue up.
 * `rng` is called only when a wait or an event is rolled.
 */
export function advanceEventClock(nextEventAt: number | null, ctx: EventContext, now: number, rng: () => number): EventAdvance {
  if (ctx.blocked) {
    if (nextEventAt === null) return { nextEventAt: null, fire: null }
    return { nextEventAt: Math.max(nextEventAt, now + EVENT_AFTER_BLOCK_MS), fire: null }
  }
  const dueAt = nextEventAt ?? now + sampleWaitMs(EVENT_MEAN_WAIT_MS, rng())
  if (now < dueAt) return { nextEventAt: dueAt, fire: null }
  const fire = pickEvent(eligibleEvents(ctx.era, ctx.paying, ctx.owned), rng())
  if (!fire) return { nextEventAt: now + sampleWaitMs(EVENT_MEAN_WAIT_MS, rng()), fire: null }
  return { nextEventAt: null, fire }
}
