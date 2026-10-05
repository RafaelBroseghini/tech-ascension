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
