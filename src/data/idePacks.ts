import type { Era } from "./capital.ts"

/** A stretch of the career by stage art id. The status bar names the band the desk is in. */
export type IdeBand = {
  label: string
  era: Era
  /** The band starts at this art id and runs to the next band's `fromTier - 1`. */
  fromTier: number
}

export const IDE_BANDS: readonly IdeBand[] = [
  { label: "High school", era: "early", fromTier: 0 },
  { label: "College", era: "early", fromTier: 7 },
  { label: "Bootcamp", era: "early", fromTier: 13 },
  { label: "Internship", era: "mid", fromTier: 19 },
  { label: "Junior SWE", era: "mid", fromTier: 23 },
  { label: "Mid-level", era: "mid", fromTier: 27 },
  { label: "Senior SWE", era: "mid", fromTier: 31 },
  { label: "Staff", era: "upper", fromTier: 34 },
  { label: "Principal", era: "upper", fromTier: 37 },
  { label: "Distinguished", era: "upper", fromTier: 41 },
  { label: "Foundry", era: "q3", fromTier: 45 },
  { label: "Frontier lab", era: "q3", fromTier: 50 },
  { label: "Orbital", era: "end", fromTier: 54 },
  { label: "Mars", era: "end", fromTier: 59 },
]

/** The band for an art id (0 = nothing bought yet). */
export function bandForTier(tierId: number): IdeBand {
  let pick = IDE_BANDS[0] as IdeBand
  for (const band of IDE_BANDS) if (band.fromTier <= tierId) pick = band
  return pick
}

/** The band an era shows while the shop only browses it: its first one. */
export function previewBandForEra(era: Era): IdeBand {
  return IDE_BANDS.find((band) => band.era === era) ?? (IDE_BANDS[0] as IdeBand)
}
