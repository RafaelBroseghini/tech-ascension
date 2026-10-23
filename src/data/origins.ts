import type { Tag } from "./tags.ts"

/**
 * Where a career starts. Picked once on the start card, after the handle, and kept for the career: each origin makes a
 * kind of skill cheaper, opens one part of the early game sooner and charges for it somewhere else. The numbers are
 * proposals (docs/BUILDS.md); the rules are in src/game/origin.ts. A career with no origin (an agent's `keepProfile`, an
 * old save) plays the plain ladder.
 */
export type OriginId = "college" | "bootcamp" | "dropout"

/** What an origin changes. A factor of 1, a missing field, changes nothing. */
export type OriginEffects = {
  /** Skills with any of these tags cost this much of their price (0.8 is a fifth off, 1.25 a quarter more). */
  skillPrice?: readonly { tags: readonly Tag[]; mult: number }[]
  /** Idle XP a second, flat, from the first day (lectures). */
  xpPerSec?: number
  /** Every gig asks this much of its lifetime XP requirement. */
  gigXp?: number
  /** Gigs ask this many fewer owned skills (never fewer than one) of each of these tags. */
  gigTags?: { tags: readonly Tag[]; minus: number }
  /** The Gig Board opens at this share of its lifetime XP. */
  gigBoardXp?: number
  /** The Job Board needs this many cleared gigs instead of the plain six. */
  jobBoardGigs?: number
  /** A gig pays this much of its lump. */
  gigPay?: number
  /** The users each cleared gig seeds (the product's start). */
  seeds?: number
  /** Jobs of this rank or higher ask this much of their lifetime XP requirement. */
  jobXp?: { fromRank: number; mult: number }
}

export type Origin = {
  id: OriginId
  name: string
  /** One line for the start card. */
  blurb: string
  /** What it gives, and what it costs, as the card reads them. */
  upside: string
  cost: string
  /** The specializations it leans toward: a hint, never a lock. */
  leans: string
  effects: OriginEffects
}

/** Skills about theory and skills about the web, which the origins price against each other. */
export const THEORY_TAGS: readonly Tag[] = ["data", "ai", "security"]
export const WEB_TAGS: readonly Tag[] = ["frontend", "backend"]

export const ORIGINS: readonly Origin[] = [
  {
    id: "college",
    name: "College",
    blurb: "Lectures, office hours, one very long thesis.",
    upside: "Theory skills a fifth cheaper, a little XP every second from the lectures, and gigs ask one theory skill fewer.",
    cost: "Gigs ask 30% more XP: the campus job fair is not a client.",
    leans: "AI, Backend, Security",
    effects: { skillPrice: [{ tags: THEORY_TAGS, mult: 0.8 }], xpPerSec: 0.5, gigXp: 1.3, gigTags: { tags: THEORY_TAGS, minus: 1 } },
  },
  {
    id: "bootcamp",
    name: "Bootcamp",
    blurb: "Twelve weeks, one capstone, a lot of LinkedOut posts.",
    upside: "Web skills a fifth cheaper, the Gig Board opens sooner, gigs ask one web skill fewer, and four gigs open the Job Board.",
    cost: "Theory skills cost a quarter more: nobody covered that week.",
    leans: "Frontend, Forward deployed",
    effects: { skillPrice: [{ tags: WEB_TAGS, mult: 0.8 }, { tags: THEORY_TAGS, mult: 1.25 }], gigBoardXp: 0.7, jobBoardGigs: 4, gigTags: { tags: WEB_TAGS, minus: 1 } },
  },
  {
    id: "dropout",
    name: "Dropout",
    blurb: "A founder's DM, a half-finished degree, a lot of confidence.",
    upside: "Gigs pay 30% more, and each one brings half as many users again.",
    cost: "Jobs from Mid-level SWE up ask 25% more XP: \"degree or equivalent experience\".",
    leans: "Forward deployed, Frontend",
    effects: { gigPay: 1.3, seeds: 1.5, jobXp: { fromRank: 7, mult: 1.25 } },
  },
]

const BY_ID = new Map<OriginId, Origin>(ORIGINS.map((row) => [row.id, row]))

export const originById = (id: OriginId): Origin => BY_ID.get(id) as Origin

export function isOriginId(value: unknown): value is OriginId {
  return typeof value === "string" && BY_ID.has(value as OriginId)
}
