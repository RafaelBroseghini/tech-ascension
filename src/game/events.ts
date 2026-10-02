import { EVENT_MEAN_WAIT_MS, EVENTS, eventsForEra } from "../data/events.ts"
import type { EventEffect, GameEvent } from "../data/events.ts"
import type { Era } from "../data/capital.ts"
import { sampleWaitMs } from "./boosts.ts"
import { formatNumber } from "./format.ts"
import { clampForever } from "./mods.ts"
import type { EventMods, TempMults, TempTarget } from "./mods.ts"

export { EVENT_MEAN_WAIT_MS, EVENTS }

/** The table row type. `data/events.ts` is a drop-in file: swap it and nothing here changes. */
export type EventDef = GameEvent

/** A blocked roll (fight or open modal) fires this long after the block lifts, so it never lands on top of it. */
export const EVENT_AFTER_BLOCK_MS = 5_000

const EVENT_BY_ID = new Map<number, EventDef>(EVENTS.map((event) => [event.id, event]))

export function eventById(id: number): EventDef | undefined {
  return EVENT_BY_ID.get(id)
}

function touchesMoney(event: EventDef): boolean {
  return event.effects.some((effect) => effect.kind === "money" || effect.kind === "moneyPct")
}

/**
 * Roll pool: `any` or the player's era, minus events that move money before any money exists.
 * Clicks pay dollars from the first one, so cash events can roll once that balance is above zero.
 */
export function eligibleEvents(era: Era, paying: boolean): EventDef[] {
  const pool = eventsForEra(era)
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

/** The slice of game state an event reads and writes. */
export type EventState = EventMods & {
  money: number
  xp: number
  xpTotal: number
}

export type EventPatch = Pick<EventState, "money" | "xp" | "xpTotal" | "foreverMult" | "temp">

export type EventApplied = { patch: EventPatch; lines: EventLine[] }

export const TARGET_LABEL: Record<TempTarget, string> = {
  click: "Click income",
  cps: "Idle $/s",
  xpPerSec: "Idle XP/s",
}

/** Event multipliers are small (x1.015), so keep up to three decimals. */
export function formatMult(value: number): string {
  return String(Number(value.toFixed(3)))
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  return seconds >= 120 ? `${Math.round(seconds / 60)} min` : `${seconds}s`
}

/**
 * Applies every effect of one event. Safe by construction: the balance and spendable XP floor at 0
 * (a penalty can never put the player in debt), lifetime XP only ever rises (phase gates latch),
 * the permanent multiplier is clamped, and a timed multiplier replaces the one on its target.
 * Lines report what actually changed, so a penalty that bit nothing is left out.
 */
export function applyEvent(state: EventState, event: EventDef, now: number): EventApplied {
  let { money, xp, xpTotal, foreverMult } = state
  let temp: TempMults = { ...state.temp }
  const lines: EventLine[] = []

  const apply = (effect: EventEffect) => {
    switch (effect.kind) {
      case "money": {
        const next = Math.max(0, money + effect.delta)
        const change = next - money
        money = next
        if (change !== 0) lines.push({ text: `${change > 0 ? "+" : "-"}$${formatNumber(Math.abs(change))}`, tone: change > 0 ? "good" : "bad" })
        return
      }
      case "moneyPct": {
        const next = Math.max(0, money * (1 + effect.pct))
        const change = next - money
        money = next
        if (Math.abs(change) >= 0.005)
          lines.push({
            text: `${change > 0 ? "+" : "-"}$${formatNumber(Math.abs(change))} (${effect.pct > 0 ? "+" : "-"}${formatNumber(Math.abs(effect.pct) * 100)}% of your cash)`,
            tone: change > 0 ? "good" : "bad",
          })
        return
      }
      case "xp": {
        const next = Math.max(0, xp + effect.delta)
        const change = next - xp
        xp = next
        if (change > 0) xpTotal += change
        if (change !== 0) lines.push({ text: `${change > 0 ? "+" : "-"}${formatNumber(Math.abs(change))} XP`, tone: change > 0 ? "good" : "bad" })
        return
      }
      case "foreverMult": {
        const next = clampForever(foreverMult * effect.mult)
        if (next === foreverMult) return
        foreverMult = next
        lines.push({ text: `All income x${formatMult(effect.mult)} for good`, tone: effect.mult >= 1 ? "good" : "bad" })
        return
      }
      case "tempMult": {
        temp = { ...temp, [effect.target]: { mult: effect.mult, endsAt: now + effect.ms } }
        lines.push({ text: `${TARGET_LABEL[effect.target]} x${formatMult(effect.mult)} for ${formatDuration(effect.ms)}`, tone: effect.mult >= 1 ? "good" : "bad" })
        return
      }
    }
  }
  for (const effect of event.effects) apply(effect)

  return { patch: { money, xp, xpTotal, foreverMult, temp }, lines }
}

export type EventContext = { era: Era; paying: boolean; blocked: boolean }

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
  const fire = pickEvent(eligibleEvents(ctx.era, ctx.paying), rng())
  if (!fire) return { nextEventAt: now + sampleWaitMs(EVENT_MEAN_WAIT_MS, rng()), fire: null }
  return { nextEventAt: null, fire }
}
