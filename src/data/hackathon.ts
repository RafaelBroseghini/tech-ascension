/**
 * Weekend hackathon: a roguelike card run played with your own career. Every skill you hold is a card;
 * its stack is the suit, its place in the skill table and the copies you own set its chips. A run is
 * three rounds (Friday, Saturday, Sunday). Each ship scores chips × mult, and a round is won once its
 * target is reached. Sponsor swag (perks) is drafted before every round, and Sunday has a judge with a
 * twist. The rules live in src/game/hackathon.ts; this file is the drop-in table.
 *
 * Numbers come from a greedy-player simulation: a fresh Campus deck wins about every Campus run and
 * plateaus around National, a late-career deck reaches Global and sometimes Orbital.
 */

export type StackId = "front" | "back" | "ops" | "data" | "craft"

export type Stack = {
  id: StackId
  name: string
  /** Editor palette color. Every theme sets these vars, so the suits follow the saved theme. */
  color: string
}

/** Suit order: the hand sorts by it and the deck readout lists it left to right. */
export const STACKS: readonly Stack[] = [
  { id: "front", name: "Frontend", color: "var(--ide-blue)" },
  { id: "back", name: "Backend", color: "var(--ide-green)" },
  { id: "ops", name: "Ops", color: "var(--ide-peach)" },
  { id: "data", name: "Data & AI", color: "var(--ide-mauve)" },
  { id: "craft", name: "Craft", color: "var(--ide-rosewater)" },
]

export const STACK_IDS: readonly StackId[] = STACKS.map((stack) => stack.id)

const STACK_BY_ID = new Map<StackId, Stack>(STACKS.map((stack) => [stack.id, stack]))

export function stackById(id: StackId): Stack {
  return STACK_BY_ID.get(id) ?? (STACKS[STACKS.length - 1] as Stack)
}

const SKILL_STACK_ROWS: Record<StackId, readonly number[]> = {
  front: [5, 13, 14, 15, 16, 17, 22, 23, 24, 36, 43, 44, 45, 47, 79, 80, 81],
  back: [11, 19, 25, 26, 27, 28, 31, 32, 33, 34, 35, 37, 38, 39, 40, 41, 42, 46, 62, 71, 77, 78, 87, 102],
  ops: [8, 9, 10, 12, 20, 29, 54, 55, 56, 57, 58, 59, 60, 67, 68, 69, 70, 72, 73, 74, 75, 82, 83, 104],
  data: [6, 7, 18, 30, 49, 50, 51, 76, 97, 98, 99, 100, 101, 103],
  craft: [1, 2, 3, 4, 21, 48, 52, 53, 61, 63, 64, 65, 66, 84, 85, 86, 88, 89, 90, 91, 92, 93, 94, 95, 96],
}

/** Skill id → stack. A skill this table does not know yet plays as Craft. */
export const SKILL_STACK: Readonly<Record<number, StackId>> = Object.fromEntries(
  STACK_IDS.flatMap((stack) => SKILL_STACK_ROWS[stack].map((id) => [id, stack])),
)

export function stackOfSkill(skillId: number): StackId {
  return SKILL_STACK[skillId] ?? "craft"
}

/** Card chips: `base + perTier × tier + perLevel × (level − 1)`. Tier is the skill's band of 13 rows (1 to 8). */
export const CARD_CHIPS = { base: 3, perTier: 2, perLevel: 3 } as const
export const CARD_TIER_SIZE = 13
/** Level is 1 + floor(log2(copies owned)), so 1, 2, 4, 8 and 16 copies are levels 1 to 5. */
export const CARD_MAX_LEVEL = 5

export type HandId = "hotfix" | "pair" | "review" | "squad" | "tiger" | "fullstack" | "platform" | "specialist"

export type HandDef = {
  id: HandId
  name: string
  /** One line for the hand guide. */
  rule: string
  chips: number
  mult: number
  /** Stack groups the guide draws as colored dots; Full stack is five different colors. */
  pattern: readonly number[]
}

/** Strongest first, the order the guide lists them. Only the cards that form the hand score. */
export const HANDS: readonly HandDef[] = [
  { id: "specialist", name: "Specialist", rule: "Five cards from one stack", chips: 60, mult: 5, pattern: [5] },
  { id: "platform", name: "Platform team", rule: "Four cards from one stack", chips: 50, mult: 4, pattern: [4] },
  { id: "fullstack", name: "Full stack", rule: "Five cards, all five stacks", chips: 40, mult: 4, pattern: [1, 1, 1, 1, 1] },
  { id: "tiger", name: "Tiger team", rule: "Three from one stack, two from another", chips: 35, mult: 3, pattern: [3, 2] },
  { id: "squad", name: "Squad", rule: "Three cards from one stack", chips: 30, mult: 3, pattern: [3] },
  { id: "review", name: "Code review", rule: "Two pairs from two stacks", chips: 20, mult: 2, pattern: [2, 2] },
  { id: "pair", name: "Pair programming", rule: "Two cards from one stack", chips: 10, mult: 2, pattern: [2] },
  { id: "hotfix", name: "Hotfix", rule: "Your best single card", chips: 5, mult: 1, pattern: [1] },
]

export type PerkEffect =
  | { kind: "chips"; add: number }
  | { kind: "mult"; add: number }
  /** Each scored card of this stack adds mult. */
  | { kind: "stackMult"; stack: StackId; add: number }
  /** Each scored card adds chips. */
  | { kind: "cardChips"; add: number }
  /** Each scored card at this level or above adds chips. */
  | { kind: "levelChips"; minLevel: number; add: number }
  | { kind: "handMult"; hand: HandId; add: number }
  | { kind: "handX"; hand: HandId; x: number }
  /** The first ship of each round. */
  | { kind: "firstX"; x: number }
  /** The last ship of each round. */
  | { kind: "lastX"; x: number }
  /** Mult for each different stack among the cards shipped. */
  | { kind: "distinctMult"; add: number }
  /** Mult for each card left in hand. */
  | { kind: "heldMult"; add: number }
  /** Ships of `maxCards` cards or fewer. */
  | { kind: "smallX"; maxCards: number; x: number }
  | { kind: "ships"; add: number }
  | { kind: "refactors"; add: number }
  | { kind: "handSize"; add: number }

export type Perk = {
  id: number
  name: string
  blurb: string
  /** Rare swag shows up a third as often. */
  rare: boolean
  effect: PerkEffect
}

/** Sponsor swag. Drafted one of three before every round; three per run. */
export const PERKS: readonly Perk[] = [
  { id: 1, name: "Energy drink", blurb: "+4 mult on every ship.", rare: false, effect: { kind: "mult", add: 4 } },
  { id: 2, name: "Rubber duck", blurb: "+30 chips on every ship.", rare: false, effect: { kind: "chips", add: 30 } },
  { id: 3, name: "Design system kit", blurb: "Each scored Frontend card: +3 mult.", rare: false, effect: { kind: "stackMult", stack: "front", add: 3 } },
  { id: 4, name: "Index cheat sheet", blurb: "Each scored Backend card: +3 mult.", rare: false, effect: { kind: "stackMult", stack: "back", add: 3 } },
  { id: 5, name: "Pager on vibrate", blurb: "Each scored Ops card: +3 mult.", rare: false, effect: { kind: "stackMult", stack: "ops", add: 3 } },
  { id: 6, name: "GPU credits", blurb: "Each scored Data & AI card: +3 mult.", rare: false, effect: { kind: "stackMult", stack: "data", add: 3 } },
  { id: 7, name: "Good headphones", blurb: "Each scored Craft card: +3 mult.", rare: false, effect: { kind: "stackMult", stack: "craft", add: 3 } },
  { id: 8, name: "Cold pizza", blurb: "+1 ship every round.", rare: true, effect: { kind: "ships", add: 1 } },
  { id: 9, name: "Forty open tabs", blurb: "+2 refactors every round.", rare: false, effect: { kind: "refactors", add: 2 } },
  { id: 10, name: "Ultrawide monitor", blurb: "+1 card in hand.", rare: true, effect: { kind: "handSize", add: 1 } },
  { id: 11, name: "Full-stack hoodie", blurb: "Full stack ships: ×3 mult.", rare: true, effect: { kind: "handX", hand: "fullstack", x: 3 } },
  { id: 12, name: "Conference lanyard", blurb: "Pair programming ships: +10 mult.", rare: false, effect: { kind: "handMult", hand: "pair", add: 10 } },
  { id: 13, name: "Morning coffee", blurb: "First ship of each round: ×2 mult.", rare: false, effect: { kind: "firstX", x: 2 } },
  { id: 14, name: "Demo magic", blurb: "Last ship of each round: ×3 mult.", rare: true, effect: { kind: "lastX", x: 3 } },
  { id: 15, name: "Monorepo", blurb: "Each scored card: +10 chips.", rare: false, effect: { kind: "cardChips", add: 10 } },
  { id: 16, name: "Sticker sheet", blurb: "+2 mult for each different stack shipped.", rare: false, effect: { kind: "distinctMult", add: 2 } },
  { id: 17, name: "Git stash", blurb: "+2 mult for each card left in hand.", rare: false, effect: { kind: "heldMult", add: 2 } },
  { id: 18, name: "Senior mentor", blurb: "Scored cards at level 3 or more: +15 chips.", rare: false, effect: { kind: "levelChips", minLevel: 3, add: 15 } },
  { id: 19, name: "War room", blurb: "Tiger team ships: ×2 mult.", rare: true, effect: { kind: "handX", hand: "tiger", x: 2 } },
  { id: 20, name: "Small PRs", blurb: "Ships of three cards or fewer: ×2 mult.", rare: true, effect: { kind: "smallX", maxCards: 3, x: 2 } },
]

export type JudgeRule =
  /** Cards of this stack still form hands but score nothing. */
  | { kind: "mute"; stack: StackId }
  | { kind: "target"; x: number }
  | { kind: "handSize"; add: number }
  | { kind: "noRefactors" }
  /** A hand type scores once per round; a repeat scores nothing. */
  | { kind: "noRepeat" }

export type Judge = {
  id: number
  name: string
  /** What they say on the poster. */
  quote: string
  /** The rule, in one line. */
  blurb: string
  rule: JudgeRule
}

/** Sunday's judge. One is drawn per run and named from the start, so the swag can be drafted around it. */
export const JUDGES: readonly Judge[] = [
  { id: 1, name: "The Backend Purist", quote: "Real engineers don't center divs.", blurb: "Frontend cards score nothing.", rule: { kind: "mute", stack: "front" } },
  { id: 2, name: "The Serverless Evangelist", quote: "Servers are a code smell.", blurb: "Backend cards score nothing.", rule: { kind: "mute", stack: "back" } },
  { id: 3, name: "The PaaS Founder", quote: "Just push to main and pray.", blurb: "Ops cards score nothing.", rule: { kind: "mute", stack: "ops" } },
  { id: 4, name: "The AI Skeptic", quote: "It's autocomplete with a marketing budget.", blurb: "Data & AI cards score nothing.", rule: { kind: "mute", stack: "data" } },
  { id: 5, name: "The Growth Hacker", quote: "Soft skills don't convert.", blurb: "Craft cards score nothing.", rule: { kind: "mute", stack: "craft" } },
  { id: 6, name: "The VC", quote: "Show me the hockey stick.", blurb: "Sunday's target is 1.5× higher.", rule: { kind: "target", x: 1.5 } },
  { id: 7, name: "The CTO", quote: "Keep the scope tight.", blurb: "One card fewer in hand.", rule: { kind: "handSize", add: -1 } },
  { id: 8, name: "The Staff Engineer", quote: "It was fine as written.", blurb: "No refactors on Sunday.", rule: { kind: "noRefactors" } },
  { id: 9, name: "The PM", quote: "Show me something new.", blurb: "Each hand type scores once; repeats score nothing.", rule: { kind: "noRepeat" } },
]

export type HackRoundDef = {
  name: string
  /** Campus target. Later leagues multiply it by `LEAGUE_TARGET_GROWTH ^ league`. */
  target: number
  /** Minutes of current income paid when the round is won (same stake rules as events). */
  prizeMinutes: number
  /** XP, or money once money exists (before the first gig a money prize pays XP). */
  prize: "xp" | "money"
}

export const HACK_ROUNDS: readonly HackRoundDef[] = [
  { name: "Friday kickoff", target: 500, prizeMinutes: 3, prize: "xp" },
  { name: "Saturday crunch", target: 800, prizeMinutes: 5, prize: "money" },
  { name: "Sunday demo", target: 1300, prizeMinutes: 8, prize: "money" },
]

/** A win moves you up one league; a loss keeps you where you are. Past Orbital the ladder keeps counting. */
export const HACK_LEAGUES: readonly string[] = ["Campus", "City", "National", "Global", "Orbital"]
export const LEAGUE_TARGET_GROWTH = 1.5
/** Prizes grow a quarter per league, up to ×2 at Orbital. */
export const LEAGUE_PRIZE_STEP = 0.25

export const HACK_HAND_SIZE = 7
export const HACK_MAX_PLAY = 5
export const HACK_SHIPS = 4
export const HACK_REFACTORS = 3
export const HACK_DRAFT_SIZE = 3
export const HACK_MAX_PERKS = 3
/** Rare swag weighs 1 in the draft, common swag 3. */
export const PERK_WEIGHT = { common: 3, rare: 1 } as const

/** Registration reopens this long after a run ends. */
export const HACK_COOLDOWN_MS = 20 * 60 * 1000

/** Hackathons open with the Gig Board, once you hold enough skills to fill a deck. */
export const HACK_UNLOCK = { minSkills: 12 } as const
