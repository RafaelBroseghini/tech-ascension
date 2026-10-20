/**
 * Prestige: the Exit sells the career's product for Prestige, Prestige gives a permanent bonus, and spendable Prestige
 * buys Legacy perks. The design is in docs/PRESTIGE.md; the rules are in src/game/legacy.ts and src/game/perks.ts. The
 * three knobs `PRESTIGE_EARN_SCALE`, `PRESTIGE_MULT_PER` and `ENDING_BONUS` are tuned with the pace model
 * (`npm run pace -- exit`). Prestige prices are not purchase prices of the economy, so `PURCHASE_COST_SCALE` does not
 * touch them.
 */

/** Earnings (all careers together) that pay the first Prestige. Prestige total is the cube root of earnings over this, floored. */
export const PRESTIGE_EARN_SCALE = 5e11

/** Each Prestige adds this much to every income and XP stream, and to product growth: the multiplier is `1 + PRESTIGE_MULT_PER * prestigeTotal`. */
export const PRESTIGE_MULT_PER = 0.03

/** Prestige paid, once per ending ever, on the Exit of a career that won the world with it. */
export const ENDING_BONUS = 5

/** The two ways to win the world (`Ending` in src/game/globe/hires.ts), in the Hall of Fame's order. */
export const HALL_OF_FAME = [
  { id: "nightOwl", name: "Night owl", blurb: "Nights and weekends, mostly your own growth." },
  { id: "sponsor", name: "Executive sponsor", blurb: "Mostly the growth your hires added." },
] as const

export type HallEnding = (typeof HALL_OF_FAME)[number]["id"]

export type LegacyTrack = "network" | "founder" | "capital"

export type LegacyPerk = {
  /** `track.name`, the id the save and the harness use. */
  id: string
  track: LegacyTrack
  name: string
  /** What it does, one line, ready to show under the name. */
  blurb: string
  /** Spendable Prestige. Each perk waits on the one before it in its track. */
  cost: number
}

export const TRACKS: readonly { id: LegacyTrack; name: string; line: string }[] = [
  { id: "network", name: "Network", line: "A head start in the early game" },
  { id: "founder", name: "Founder", line: "The product" },
  { id: "capital", name: "Capital", line: "Idle income" },
]

const NOW = "Now, and at the start of every career: "

/** Numbers a perk reads. The rules use these, the blurbs print them, so a change shows in both. */
export const PERK = {
  skills: 10,
  gigsCleared: 6,
  seedMoney: 1_000_000,
  startUsers: 1000,
  growth: 1.5,
  revenue: 1.5,
  offlineHours: 4,
  capitalCost: 0.9,
  gearCost: 0.9,
  salaries: 2,
  capitalIncome: 1.5,
} as const

export const LEGACY_PERKS: readonly LegacyPerk[] = [
  { id: "network.skills", track: "network", name: "Study group", blurb: `${NOW}skills 1 to ${PERK.skills} learned.`, cost: 1 },
  { id: "network.gigBoard", track: "network", name: "Open portfolio", blurb: `${NOW}Portfolio site live and React learned, and the Gig Board open.`, cost: 2 },
  { id: "network.gigs", track: "network", name: "Repeat clients", blurb: `${NOW}gigs 1 to ${PERK.gigsCleared} cleared (their lump sums are not paid).`, cost: 4 },
  { id: "network.internship", track: "network", name: "Return offer", blurb: `${NOW}the internship held.`, cost: 7 },
  { id: "network.seed", track: "network", name: "Seed money", blurb: `${NOW}$1,000,000 held, so capital is open at once.`, cost: 12 },

  { id: "founder.users", track: "founder", name: "Early adopters", blurb: `${NOW}${PERK.startUsers.toLocaleString("en-US")} users on the product, so it has a crowd on day one.`, cost: 2 },
  { id: "founder.growth", track: "founder", name: "Viral loop", blurb: `${NOW}product growth ×${PERK.growth}.`, cost: 11 },
  { id: "founder.revenue", track: "founder", name: "Platform", blurb: `${NOW}product revenue ×${PERK.revenue}.`, cost: 16 },

  { id: "capital.offline", track: "capital", name: "Long weekend", blurb: `${NOW}time away pays ${PERK.offlineHours} hours longer, on top of Time away.`, cost: 2 },
  { id: "capital.capitalCost", track: "capital", name: "Volume discount", blurb: `${NOW}capital rows cost ${Math.round((1 - PERK.capitalCost) * 100)}% less.`, cost: 4 },
  { id: "capital.gearCost", track: "capital", name: "Bulk hardware", blurb: `${NOW}gear rows cost ${Math.round((1 - PERK.gearCost) * 100)}% less.`, cost: 7 },
  { id: "capital.salaries", track: "capital", name: "Raise season", blurb: `${NOW}salaries and retainers ×${PERK.salaries}.`, cost: 11 },
  { id: "capital.capitalIncome", track: "capital", name: "Compounding", blurb: `${NOW}capital rows earn ×${PERK.capitalIncome}.`, cost: 16 },
]
