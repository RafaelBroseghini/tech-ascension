import type { Era } from "./capital.ts"

/**
 * The career timeline: every piece of the desk that is earned instead of being there from the start, what opens
 * it, and how loud its reveal is. A drop-in table; the gates live in src/game/features.ts.
 *
 * Rows are in the order a career usually meets them. The order is the tease order: the first closed row with a
 * slot on screen shows there as a dim outline, and the career log's Up next lists the first closed rows.
 */

/** What opens a row. Ids point at the live tables (skills, gear, stage art tiers, capital eras). */
export type FeatureTrigger =
  | { kind: "skill"; id: number }
  | { kind: "gear"; id: number }
  /** The first gig cleared. */
  | { kind: "firstGig" }
  /** The first job taken. */
  | { kind: "firstJob" }
  /** The first dollar: a gig, a job or a balance. */
  | { kind: "money" }
  /** A shop board opening (the same gates the shop tabs use). */
  | { kind: "board"; board: "gear" | "gigs" | "jobs" | "capital" }
  /** The 10x dev section of the Skills tab, which opens with its first row in reach. */
  | { kind: "gold" }
  /** Hover clicking: a hover 10x dev skill, or every catalog row. */
  | { kind: "hover" }
  /** The stage art reaching a tier for the first time (`stageOf(p).artId`). */
  | { kind: "art"; tier: number }
  /** The first capital row of an era. */
  | { kind: "era"; era: Era }
  /** A quarter of an hour at the desk (`CAT_DESK_MS`, tab open counts, in front or behind), or coming back after a break, whichever is first. */
  | { kind: "settled" }

/**
 * How loud the reveal is. `big` gets the centred UNLOCKED slam, confetti and a card; `standard` lights up where it
 * lives with a card beside it; `small` is a toast and a glow. `phase` rows already have their own pop (the boards
 * that change the phase), so the timeline only logs them.
 */
export type FeatureSize = "big" | "standard" | "small" | "phase"

export type FeatureId =
  | "studio"
  | "careerLog"
  | "githug"
  | "linkedout"
  | "tenx"
  | "boardGear"
  | "boardGigs"
  | "money"
  | "rosters"
  | "boardJobs"
  | "metrics"
  | "clickKits"
  | "themes"
  | "hoverClick"
  | "music"
  | "boardCapital"
  | "cat"
  | `kit:${string}`
  | `theme:${string}`
  | `music:${string}`

export type FeatureRow = {
  id: FeatureId
  /** Short name for cards, toasts, the career log and the JSON output. */
  name: string
  /** One line: what it is for. Shown on the reveal card and the ghost's tooltip. */
  blurb: string
  size: FeatureSize
  trigger: FeatureTrigger
  /**
   * A cosmetic (a click sound, an editor theme, a music style) waits on its picker. While the picker is closed it
   * unlocks quietly and arrives with the picker; once the picker is open it gets its own small reveal.
   */
  parent?: FeatureId
  /** The reveal button's label. Rows without one get a plain "Got it". */
  action?: string
  /** False for rows with no place on screen to stand in for (the cat is a surprise). Defaults to true. */
  ghost?: boolean
}

export const FEATURES: readonly FeatureRow[] = [
  {
    id: "studio",
    name: "Studio",
    blurb: "Your whiteboard for job interviews.",
    size: "big",
    trigger: { kind: "skill", id: 1 },
    ghost: false,
  },
  {
    id: "careerLog",
    name: "Career log",
    blurb: "Your career, commit by commit. Up next shows what unlocks soon.",
    size: "big",
    trigger: { kind: "skill", id: 10 },
    action: "Open it",
  },
  {
    id: "githug",
    name: "GitHug profile",
    blurb: "A green square for every day you ship something, the repos you pinned, and a star for the real one.",
    size: "standard",
    trigger: { kind: "skill", id: 10 },
    action: "View it",
  },
  {
    id: "linkedout",
    name: "LinkedOut profile",
    blurb: "Your profile writes itself from what you learn and where you work.",
    size: "standard",
    trigger: { kind: "skill", id: 15 },
    action: "View it",
  },
  {
    id: "tenx",
    name: "10x dev skills",
    blurb: "Perks, not income: bulk buys, hover clicking, longer time away.",
    size: "standard",
    trigger: { kind: "gold" },
    action: "Show me",
  },
  {
    id: "boardGear",
    name: "Gear",
    blurb: "Desk and homelab upgrades that pay per click and per second.",
    size: "standard",
    trigger: { kind: "board", board: "gear" },
    action: "Show me",
  },
  {
    id: "boardGigs",
    name: "Gig Board",
    blurb: "Clients with small jobs and your first dollars.",
    size: "phase",
    trigger: { kind: "board", board: "gigs" },
  },
  {
    id: "money",
    name: "Dollars",
    blurb: "Gigs pay cash. Clicks keep paying XP until your first job.",
    size: "small",
    trigger: { kind: "money" },
  },
  {
    id: "rosters",
    name: "Rosters",
    blurb: "Everything you own, laid out like a character select.",
    size: "standard",
    trigger: { kind: "firstGig" },
    action: "Open it",
  },
  {
    id: "boardJobs",
    name: "Job Board",
    blurb: "Salaries, and jobs that teach while they pay.",
    size: "phase",
    trigger: { kind: "board", board: "jobs" },
  },
  {
    id: "metrics",
    name: "Metrics",
    blurb: "Your manager tracks the numbers now. So can you.",
    size: "standard",
    trigger: { kind: "firstJob" },
    action: "Open it",
  },
  {
    id: "clickKits",
    name: "Click sounds",
    blurb: "Pick how your clicks sound. More kits come with new gear.",
    size: "small",
    trigger: { kind: "gear", id: 1 },
  },
  {
    id: "themes",
    name: "Editor themes",
    blurb: "Repaint the desk. A new theme arrives as your career climbs.",
    size: "small",
    trigger: { kind: "gear", id: 11 },
  },
  {
    id: "hoverClick",
    name: "Hover click",
    blurb: "Rest the pointer on the emoji and it clicks for you.",
    size: "standard",
    trigger: { kind: "hover" },
    action: "Turn it on",
  },
  {
    id: "music",
    name: "Music",
    blurb: "Something to code to. A new style arrives with each era.",
    size: "standard",
    trigger: { kind: "gear", id: 10 },
    action: "Play it",
  },
  {
    id: "boardCapital",
    name: "Capital",
    blurb: "Funds, equity and firms. The long climb.",
    size: "phase",
    trigger: { kind: "board", board: "capital" },
  },
  {
    id: "cat",
    name: "Desk cat",
    blurb: "A cat wandered onto your desk and decided to stay. Tap it to meet another.",
    size: "big",
    trigger: { kind: "settled" },
    ghost: false,
  },

  // Cosmetics. Each waits on its picker (`parent`).
  { id: "kit:felt", name: "Felt clicks", blurb: "A softer click.", size: "small", trigger: { kind: "gear", id: 4 }, parent: "clickKits" },
  { id: "kit:pillow", name: "Pillow clicks", blurb: "The quietest click.", size: "small", trigger: { kind: "gear", id: 9 }, parent: "clickKits" },
  { id: "kit:marimba", name: "Marimba clicks", blurb: "Every click a note.", size: "small", trigger: { kind: "gear", id: 13 }, parent: "clickKits" },
  { id: "theme:dracula", name: "Dracula", blurb: "An editor theme.", size: "small", trigger: { kind: "gear", id: 11 }, parent: "themes" },
  { id: "theme:solarized-light", name: "Solarized Light", blurb: "An editor theme.", size: "small", trigger: { kind: "art", tier: 19 }, parent: "themes" },
  { id: "theme:tokyo-night", name: "Tokyo Night", blurb: "An editor theme.", size: "small", trigger: { kind: "art", tier: 23 }, parent: "themes" },
  { id: "theme:monokai", name: "Monokai", blurb: "An editor theme.", size: "small", trigger: { kind: "art", tier: 27 }, parent: "themes" },
  { id: "theme:gruvbox", name: "Gruvbox", blurb: "An editor theme.", size: "small", trigger: { kind: "art", tier: 31 }, parent: "themes" },
  { id: "theme:github-light", name: "GitHub Light", blurb: "An editor theme.", size: "small", trigger: { kind: "art", tier: 34 }, parent: "themes" },
  { id: "theme:gruvbox-light", name: "Gruvbox Light", blurb: "An editor theme.", size: "small", trigger: { kind: "art", tier: 37 }, parent: "themes" },
  { id: "theme:synthwave", name: "Synthwave '84", blurb: "An editor theme.", size: "small", trigger: { kind: "art", tier: 50 }, parent: "themes" },
  { id: "music:cozy", name: "Cozy", blurb: "A music style.", size: "small", trigger: { kind: "gear", id: 10 }, parent: "music" },
  { id: "music:lofi", name: "Lofi", blurb: "A music style.", size: "small", trigger: { kind: "era", era: "mid" }, parent: "music" },
  { id: "music:synth", name: "Synth", blurb: "A music style.", size: "small", trigger: { kind: "era", era: "upper" }, parent: "music" },
  { id: "music:edm", name: "EDM", blurb: "A music style.", size: "small", trigger: { kind: "era", era: "end" }, parent: "music" },
]

/** Editor themes every career has from the start: one dark, one light, so the editor is always readable. */
export const BASE_THEMES: readonly string[] = ["mocha", "latte"]

/** The click sound every career starts with. */
export const BASE_CLICK_KIT = "thock"

/**
 * The cat moves in after this long at the desk: clicking, idling, or with the tab left open in the background. A
 * break of 10 minutes or more (`RETURN_BREAK_MS`) brings it sooner, waiting on the desk when you come back.
 */
export const CAT_DESK_MS = 15 * 60 * 1000
