export type Milestone = { id: string; label: string; moneyAt?: number; xpTotalAt?: number }

export const BALANCE_MILESTONES: readonly Milestone[] = [
  { id: "money-1337", moneyAt: 1337, label: "$1,337 — leet bucks" },
  { id: "money-420069", moneyAt: 420_069, label: "$420,069 — nice portfolio" },
  { id: "money-999999", moneyAt: 999_999, label: "$999,999 — one dollar shy of syndicate" },
  { id: "xp-69420", xpTotalAt: 69_420, label: "69,420 lifetime XP — nice grind" },
]

function crossed(before: number, after: number, at: number): boolean {
  return before < at && after >= at
}

/** First milestone newly reached this tick, or null. */
export function firstNewMilestone(
  before: { money: number; xpTotal: number },
  after: { money: number; xpTotal: number },
  seen: ReadonlySet<string>,
): Milestone | null {
  for (const row of BALANCE_MILESTONES) {
    if (seen.has(row.id)) continue
    if (row.moneyAt !== undefined && crossed(before.money, after.money, row.moneyAt)) return row
    if (row.xpTotalAt !== undefined && crossed(before.xpTotal, after.xpTotal, row.xpTotalAt)) return row
  }
  return null
}

export function normalizeSeenMilestones(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const valid = new Set(BALANCE_MILESTONES.map((row) => row.id))
  for (const value of raw) {
    if (typeof value !== "string" || !valid.has(value)) continue
    if (!out.includes(value)) out.push(value)
  }
  return out
}
