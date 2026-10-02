const SUFFIXES: readonly { exp: number; suffix: string }[] = [
  { exp: 33, suffix: "Dc" },
  { exp: 30, suffix: "No" },
  { exp: 27, suffix: "Oc" },
  { exp: 24, suffix: "Sp" },
  { exp: 21, suffix: "Sx" },
  { exp: 18, suffix: "Qi" },
  { exp: 15, suffix: "Qa" },
  { exp: 12, suffix: "T" },
  { exp: 9, suffix: "B" },
  { exp: 6, suffix: "M" },
  { exp: 3, suffix: "K" },
]

function trimFixed(value: number, digits: number): string {
  const fixed = value.toFixed(digits)
  if (!fixed.includes(".")) return fixed
  return fixed.replace(/\.?0+$/, "")
}

/**
 * Roguelike score feel: whole numbers keep their raw digits (with thousands separators) until
 * they pass this, and only then abbreviate. `formatNumber(v, 1000)` is the tight Cookie-style form.
 */
export const RAW_DIGITS_BELOW = 1e7

/** The hero balance has the room for more digits: it stays fully comma-separated up to $999,999,999,999. */
export const HERO_RAW_DIGITS_BELOW = 1e12

function groupDigits(whole: number): string {
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/** Cookie-style abbreviation for tight spots: 1.5K, 12M. */
export function formatCompact(value: number): string {
  return formatNumber(value, 1000)
}

/**
 * Raw digits below `rawBelow` (default 10,000,000), then K / M / B / T / Qa / Qi / Sx / Sp / Oc / No / Dc.
 * Scientific notation is only a last resort past 1e36.
 * Display only — stored values stay as JS numbers.
 */
export function formatNumber(value: number, rawBelow: number = RAW_DIGITS_BELOW): string {
  if (!Number.isFinite(value)) return "—"
  const sign = value < 0 ? "-" : ""
  const n = Math.abs(value)

  if (n < 1000) {
    const digits = n < 10 ? 2 : n < 100 ? 1 : 0
    let text = trimFixed(n, digits)
    if (Number(text) >= 1000) text = "999"
    return sign + text
  }

  if (n < rawBelow) return sign + groupDigits(Math.floor(n))

  if (n >= 1e36) return sign + n.toExponential(2).replace("+", "")

  for (let i = 0; i < SUFFIXES.length; i++) {
    const { exp, suffix } = SUFFIXES[i]!
    const base = 10 ** exp
    if (n < base) continue
    const scaled = n / base
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
    const text = trimFixed(scaled, digits)
    if (Number(text) >= 1000) {
      const next = SUFFIXES[i - 1]
      return sign + (next ? `1${next.suffix}` : "999.9" + suffix)
    }
    return sign + text + suffix
  }

  return sign + n.toExponential(2).replace("+", "")
}

export function formatMultiplier(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "1"
  const digits = value >= 10 ? 0 : 1
  return trimFixed(value, digits)
}
