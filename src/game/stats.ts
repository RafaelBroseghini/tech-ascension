import { normalizeCatsFound } from "./catRoster.ts"

/** Gap longer than this breaks a click streak and counts toward idle streaks. */
export const CLICK_STREAK_GAP_MS = 3_000

export type GameStats = {
  totalClicks: number
  longestClickStreak: number
  longestIdleMs: number
  /** Every dollar credited (clicks, idle, gigs, events, offline). Spending does not reduce this. */
  lifetimeEarned: number
  moneyFromClicks: number
  moneyFromIdle: number
  /** Wall time while the sim has been ticking (capped per tick like idle). */
  playTimeMs: number
  /** Cats the desk cat has turned into when tapped, in the order they were first seen. */
  catsFound: string[]
}

export type StatsClock = {
  lastClickAt: number | null
  currentClickStreak: number
}

export function emptyStats(): GameStats {
  return {
    totalClicks: 0,
    longestClickStreak: 0,
    longestIdleMs: 0,
    lifetimeEarned: 0,
    moneyFromClicks: 0,
    moneyFromIdle: 0,
    playTimeMs: 0,
    catsFound: [],
  }
}

export function emptyStatsClock(): StatsClock {
  return { lastClickAt: null, currentClickStreak: 0 }
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function normalizeStats(raw: unknown): GameStats {
  const base = emptyStats()
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base
  const row = raw as Record<string, unknown>
  return {
    totalClicks: Math.max(0, Math.floor(finite(row.totalClicks))),
    longestClickStreak: Math.max(0, Math.floor(finite(row.longestClickStreak))),
    longestIdleMs: Math.max(0, finite(row.longestIdleMs)),
    lifetimeEarned: Math.max(0, finite(row.lifetimeEarned)),
    moneyFromClicks: Math.max(0, finite(row.moneyFromClicks)),
    moneyFromIdle: Math.max(0, finite(row.moneyFromIdle)),
    playTimeMs: Math.max(0, finite(row.playTimeMs)),
    catsFound: normalizeCatsFound(row.catsFound),
  }
}

export function creditMoney(stats: GameStats, amount: number, source: "click" | "idle" | "other"): GameStats {
  if (!(amount > 0) || !Number.isFinite(amount)) return stats
  const next = { ...stats, lifetimeEarned: stats.lifetimeEarned + amount }
  if (source === "click") next.moneyFromClicks += amount
  if (source === "idle") next.moneyFromIdle += amount
  return next
}

export function recordClick(stats: GameStats, clock: StatsClock, now: number): { stats: GameStats; clock: StatsClock } {
  let currentClickStreak = clock.currentClickStreak
  let longestIdleMs = stats.longestIdleMs

  if (clock.lastClickAt !== null) {
    const gap = now - clock.lastClickAt
    if (gap > CLICK_STREAK_GAP_MS) {
      longestIdleMs = Math.max(longestIdleMs, gap)
      currentClickStreak = 1
    } else {
      currentClickStreak += 1
    }
  } else {
    currentClickStreak = 1
  }

  const longestClickStreak = Math.max(stats.longestClickStreak, currentClickStreak)
  return {
    stats: { ...stats, totalClicks: stats.totalClicks + 1, longestClickStreak, longestIdleMs },
    clock: { lastClickAt: now, currentClickStreak },
  }
}

/** Updates longest idle while the player has not clicked recently. */
export function touchIdleRecord(stats: GameStats, clock: StatsClock, now: number): GameStats {
  if (clock.lastClickAt === null) return stats
  const idleMs = now - clock.lastClickAt
  if (idleMs <= CLICK_STREAK_GAP_MS || idleMs <= stats.longestIdleMs) return stats
  return { ...stats, longestIdleMs: idleMs }
}

export function formatPlayTime(ms: number): string {
  if (!(ms > 0) || !Number.isFinite(ms)) return "0s"
  const totalSec = Math.floor(ms / 1000)
  const sec = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const min = totalMin % 60
  const hr = Math.floor(totalMin / 60)
  if (hr > 0) return `${hr}h ${min}m`
  if (min > 0) return `${min}m ${sec}s`
  return `${sec}s`
}

export function formatIdleStreak(ms: number): string {
  if (!(ms > 0) || !Number.isFinite(ms)) return "—"
  return formatPlayTime(ms)
}
