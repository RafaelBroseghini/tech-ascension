import {
  CARD_CHIPS,
  CARD_MAX_LEVEL,
  CARD_TIER_SIZE,
  HACK_COOLDOWN_MS,
  HACK_DRAFT_SIZE,
  HACK_HAND_SIZE,
  HACK_LEAGUES,
  HACK_MAX_PERKS,
  HACK_MAX_PLAY,
  HACK_REFACTORS,
  HACK_ROUNDS,
  HACK_SHIPS,
  HANDS,
  JUDGES,
  LEAGUE_PRIZE_STEP,
  LEAGUE_TARGET_GROWTH,
  PERK_WEIGHT,
  PERKS,
  STACK_IDS,
  stackOfSkill,
} from "../data/hackathon.ts"
import type { HandDef, HandId, Judge, Perk, StackId } from "../data/hackathon.ts"
import { SKILL_TIERS } from "../data/phases.ts"
import { ownedCount, skillById } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"

export { HACK_COOLDOWN_MS, HACK_ROUNDS, HANDS, JUDGES, PERKS }

/** A card in play: one skill you hold, frozen at the level it had when the run started. */
export type HackCard = {
  skillId: number
  stack: StackId
  level: number
  /** Band of 13 skills, 1 to 8. Later skills are worth more. */
  tier: number
  chips: number
}

/** `draft`: pick swag. `play`: a round is on. `won` / `lost`: the run is over and waits to be closed. */
export type HackStage = "draft" | "play" | "won" | "lost"

export type HackSort = "stack" | "chips"

/** One beat of the scoring cascade. `chips` and `mult` are the running totals after it. */
export type HackStep =
  | { kind: "base"; chips: number; mult: number }
  | { kind: "card"; card: number; addChips: number; addMult: number; muted: boolean; perks: number[]; chips: number; mult: number }
  | { kind: "perk"; perk: number; addChips: number; addMult: number; x: number; chips: number; mult: number }

export type HackEvaluation = {
  hand: HandId
  /** Positions in the shipped selection that form the hand. Only these score. */
  scoring: number[]
  /** Positions muted by Sunday's judge. They count for the hand but add nothing. */
  muted: number[]
  steps: HackStep[]
  chips: number
  mult: number
  /** The judge zeroes a hand type already shipped this round. */
  repeat: boolean
  score: number
}

export type HackShotCard = { skillId: number; level: number; scoring: boolean; muted: boolean }

/** The last ship, kept for the scoring replay and the run log. */
export type HackShot = {
  seq: number
  hand: HandId
  cards: HackShotCard[]
  steps: HackStep[]
  chips: number
  mult: number
  score: number
  repeat: boolean
  /** Round score before and after this ship, and the round's target. */
  before: number
  after: number
  target: number
  /** Skill ids dealt into the hand after the ship. */
  drawn: number[]
  outcome: "continue" | "cleared" | "won" | "lost"
}

export type HackPrize = { money: number; xp: number }

export type HackRun = {
  /** mulberry32 state. Every shuffle and draft advances it, so a reload deals the same cards. */
  rng: number
  league: number
  judge: number
  /** 0 Friday, 1 Saturday, 2 Sunday. */
  round: number
  stage: HackStage
  /** The deck: skill id → level, frozen at registration. */
  cards: Record<string, number>
  /** Next card is the last element. */
  draw: number[]
  hand: number[]
  /** Shipped and refactored cards this round. */
  pile: number[]
  perks: number[]
  /** Swag on the table while `stage` is `draft`. */
  offer: number[]
  score: number
  ships: number
  refactors: number
  /** Ships made this round. */
  shipped: number
  /** Hand types shipped this round. */
  used: HandId[]
  sort: HackSort
  shot: HackShot | null
  shotSeq: number
  /** Prizes paid so far this run. */
  earned: HackPrize
  /** The latest round prize, for the draft and summary headers. */
  cleared: ({ round: number } & HackPrize) | null
  /** Best single ship this run. */
  best: number
}

export type HackMeta = {
  /** 0 Campus, 1 City, 2 National, 3 Global, 4 Orbital, then Orbital +1 and up. */
  league: number
  runs: number
  wins: number
  /** Best single ship ever. */
  best: number
  /** Highest league won, or -1. */
  topLeague: number
  /** Registration reopens at this time. 0 means open. */
  nextAt: number
  run: HackRun | null
}

export function freshHackMeta(): HackMeta {
  return { league: 0, runs: 0, wins: 0, best: 0, topLeague: -1, nextAt: 0, run: null }
}

const PERK_BY_ID = new Map<number, Perk>(PERKS.map((perk) => [perk.id, perk]))
const JUDGE_BY_ID = new Map<number, Judge>(JUDGES.map((judge) => [judge.id, judge]))
const HAND_BY_ID = new Map<HandId, HandDef>(HANDS.map((hand) => [hand.id, hand]))
const SKILL_ORDINAL = new Map<number, number>(SKILL_TIERS.map((row, index) => [row.id, index + 1]))

export const perkById = (id: number): Perk | undefined => PERK_BY_ID.get(id)
export const judgeById = (id: number): Judge | undefined => JUDGE_BY_ID.get(id)
export const handById = (id: HandId): HandDef => HAND_BY_ID.get(id) as HandDef

// ---------- leagues, targets, prizes ----------

export function leagueName(league: number): string {
  const top = HACK_LEAGUES.length - 1
  if (league <= top) return HACK_LEAGUES[Math.max(0, league)] ?? "Campus"
  return `${HACK_LEAGUES[top]} +${league - top}`
}

/** Two significant figures, so a target reads like a poster number (1,700, not 1,688). */
export function niceRound(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) return 0
  const step = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 1)
  return Math.round(value / step) * step
}

export function roundTarget(league: number, round: number, judgeId: number): number {
  const def = HACK_ROUNDS[round] ?? HACK_ROUNDS[HACK_ROUNDS.length - 1]
  if (!def) return 0
  const rule = round === HACK_ROUNDS.length - 1 ? judgeById(judgeId)?.rule : undefined
  const x = rule?.kind === "target" ? rule.x : 1
  return niceRound(def.target * LEAGUE_TARGET_GROWTH ** Math.max(0, league) * x)
}

/** Prizes grow a quarter per league, up to ×2 at Orbital. The prize itself is priced in hackathonEconomy.ts. */
export function prizeScale(league: number): number {
  return 1 + LEAGUE_PRIZE_STEP * Math.min(Math.max(0, league), HACK_LEAGUES.length - 1)
}

// ---------- registration ----------

/** Registration is open: no run in progress and the cooldown is over. */
export function hackReady(meta: Pick<HackMeta, "run" | "nextAt">, now: number): boolean {
  return meta.run === null && now >= meta.nextAt
}

// ---------- cards ----------

export function levelForCopies(copies: number): number {
  if (!(copies >= 1)) return 1
  return Math.min(CARD_MAX_LEVEL, 1 + Math.floor(Math.log2(copies)))
}

export function tierOfSkill(skillId: number): number {
  const ordinal = SKILL_ORDINAL.get(skillId) ?? skillId
  return Math.max(1, Math.ceil(ordinal / CARD_TIER_SIZE))
}

export function cardOf(skillId: number, level: number): HackCard {
  const tier = tierOfSkill(skillId)
  const lvl = Math.min(CARD_MAX_LEVEL, Math.max(1, Math.floor(level)))
  return {
    skillId,
    stack: stackOfSkill(skillId),
    level: lvl,
    tier,
    chips: CARD_CHIPS.base + CARD_CHIPS.perTier * tier + CARD_CHIPS.perLevel * (lvl - 1),
  }
}

/** The deck a run would deal right now: every skill held, at the level its copies give. */
export function deckOf(skills: OwnedMap): Record<string, number> {
  const cards: Record<string, number> = {}
  for (const row of SKILL_TIERS) {
    const copies = ownedCount(skills, row.id)
    if (copies > 0) cards[String(row.id)] = levelForCopies(copies)
  }
  return cards
}

export function runCard(run: Pick<HackRun, "cards">, skillId: number): HackCard {
  return cardOf(skillId, run.cards[String(skillId)] ?? 1)
}

export function stackCounts(skillIds: readonly number[]): Record<StackId, number> {
  const out = { front: 0, back: 0, ops: 0, data: 0, craft: 0 } as Record<StackId, number>
  for (const id of skillIds) out[stackOfSkill(id)] += 1
  return out
}

// ---------- rng ----------

/** mulberry32 over the run's own state. Mutates `run.rng`. */
function nextRandom(run: { rng: number }): number {
  const a = (run.rng + 0x6d2b79f5) | 0
  run.rng = a >>> 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function shuffleInPlace(run: { rng: number }, list: number[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(run) * (i + 1))
    const held = list[i] as number
    list[i] = list[j] as number
    list[j] = held
  }
}

function cloneRun(run: HackRun): HackRun {
  return {
    ...run,
    cards: { ...run.cards },
    draw: [...run.draw],
    hand: [...run.hand],
    pile: [...run.pile],
    perks: [...run.perks],
    offer: [...run.offer],
    used: [...run.used],
    earned: { ...run.earned },
    cleared: run.cleared ? { ...run.cleared } : null,
  }
}

// ---------- round shape ----------

function judgeRule(run: Pick<HackRun, "judge" | "round">) {
  if (run.round !== HACK_ROUNDS.length - 1) return null
  return judgeById(run.judge)?.rule ?? null
}

function perkTotal(perks: readonly number[], kind: "ships" | "refactors" | "handSize"): number {
  let total = 0
  for (const id of perks) {
    const effect = perkById(id)?.effect
    if (effect?.kind === kind) total += effect.add
  }
  return total
}

export function handSizeOf(run: Pick<HackRun, "perks" | "judge" | "round">): number {
  const rule = judgeRule(run)
  return HACK_HAND_SIZE + perkTotal(run.perks, "handSize") + (rule?.kind === "handSize" ? rule.add : 0)
}

export function shipsOf(run: Pick<HackRun, "perks">): number {
  return HACK_SHIPS + perkTotal(run.perks, "ships")
}

export function refactorsOf(run: Pick<HackRun, "perks" | "judge" | "round">): number {
  if (judgeRule(run)?.kind === "noRefactors") return 0
  return HACK_REFACTORS + perkTotal(run.perks, "refactors")
}

export function targetOf(run: Pick<HackRun, "league" | "round" | "judge">): number {
  return roundTarget(run.league, run.round, run.judge)
}

/** Stack order, then chips high to low; or chips first. Ties fall back to the skill id so the order is stable. */
export function sortHand(run: Pick<HackRun, "cards" | "sort">, hand: readonly number[]): number[] {
  const rank = (id: number) => STACK_IDS.indexOf(stackOfSkill(id))
  return [...hand].sort((a, b) => {
    const ca = runCard(run, a)
    const cb = runCard(run, b)
    if (run.sort === "chips") return cb.chips - ca.chips || rank(a) - rank(b) || a - b
    return rank(a) - rank(b) || cb.chips - ca.chips || a - b
  })
}

/** Fill the hand up to its size, shuffling the pile back in when the draw runs dry. Returns what was dealt. */
function drawUp(run: HackRun): number[] {
  const size = handSizeOf(run)
  const dealt: number[] = []
  while (run.hand.length < size) {
    if (run.draw.length === 0) {
      if (run.pile.length === 0) break
      run.draw = run.pile
      run.pile = []
      shuffleInPlace(run, run.draw)
    }
    const card = run.draw.pop()
    if (card === undefined) break
    run.hand.push(card)
    dealt.push(card)
  }
  run.hand = sortHand(run, run.hand)
  return dealt
}

/** Shuffle the whole deck and deal a fresh round. */
function dealRound(run: HackRun): void {
  run.draw = Object.keys(run.cards).map(Number).sort((a, b) => a - b)
  shuffleInPlace(run, run.draw)
  run.hand = []
  run.pile = []
  run.score = 0
  run.ships = shipsOf(run)
  run.refactors = refactorsOf(run)
  run.shipped = 0
  run.used = []
  run.stage = "play"
  drawUp(run)
}

function weightedPick(run: { rng: number }, pool: readonly Perk[]): Perk | null {
  const weight = (perk: Perk) => (perk.rare ? PERK_WEIGHT.rare : PERK_WEIGHT.common)
  const total = pool.reduce((sum, perk) => sum + weight(perk), 0)
  if (pool.length === 0 || !(total > 0)) return null
  let roll = nextRandom(run) * total
  for (const perk of pool) {
    if (roll < weight(perk)) return perk
    roll -= weight(perk)
  }
  return pool[pool.length - 1] ?? null
}

function draftOffer(run: HackRun): number[] {
  const pool = PERKS.filter((perk) => !run.perks.includes(perk.id))
  const offer: number[] = []
  while (offer.length < HACK_DRAFT_SIZE) {
    const pick = weightedPick(run, pool.filter((perk) => !offer.includes(perk.id)))
    if (!pick) break
    offer.push(pick.id)
  }
  return offer
}

// ---------- run lifecycle ----------

export type StartInput = { league: number; skills: OwnedMap; seed: number }

/** Register: freeze the deck, draw Sunday's judge and lay out the first swag. Null when the deck is empty. */
export function startRun({ league, skills, seed }: StartInput): HackRun | null {
  const cards = deckOf(skills)
  if (Object.keys(cards).length === 0) return null
  const run: HackRun = {
    rng: seed >>> 0,
    league: Math.max(0, Math.floor(league)),
    judge: JUDGES[0]?.id ?? 1,
    round: 0,
    stage: "draft",
    cards,
    // The deck waits in the draw pile until the first deal shuffles it, so every card always has a place.
    draw: Object.keys(cards).map(Number).sort((a, b) => a - b),
    hand: [],
    pile: [],
    perks: [],
    offer: [],
    score: 0,
    ships: 0,
    refactors: 0,
    shipped: 0,
    used: [],
    sort: "stack",
    shot: null,
    shotSeq: 0,
    earned: { money: 0, xp: 0 },
    cleared: null,
    best: 0,
  }
  run.judge = JUDGES[Math.floor(nextRandom(run) * JUDGES.length)]?.id ?? run.judge
  run.offer = draftOffer(run)
  return run
}

/** Take swag `slot` from the table and deal the round. Null outside a draft or for an empty slot. */
export function pickPerk(run: HackRun, slot: number): HackRun | null {
  if (run.stage !== "draft") return null
  const perkId = run.offer[slot]
  if (perkId === undefined || run.perks.length >= HACK_MAX_PERKS) return null
  const next = cloneRun(run)
  next.perks.push(perkId)
  next.offer = []
  dealRound(next)
  return next
}

function validSelection(run: HackRun, indices: readonly number[], max: number): number[] | null {
  const unique = [...new Set(indices)]
  if (unique.length === 0 || unique.length !== indices.length || unique.length > max) return null
  if (!unique.every((i) => Number.isInteger(i) && i >= 0 && i < run.hand.length)) return null
  return unique.sort((a, b) => a - b)
}

function classify(cards: readonly HackCard[]): { hand: HandId; scoring: number[] } {
  const groups = new Map<StackId, number[]>()
  cards.forEach((card, index) => {
    const list = groups.get(card.stack) ?? []
    list.push(index)
    groups.set(card.stack, list)
  })
  // Bigger groups first; equal groups keep the hand's left-to-right order.
  const sorted = [...groups.values()].sort((a, b) => b.length - a.length || (a[0] ?? 0) - (b[0] ?? 0))
  const first = sorted[0] ?? []
  const second = sorted[1] ?? []
  const n = cards.length
  if (n === 5 && first.length === 5) return { hand: "specialist", scoring: first }
  if (n === 5 && sorted.length === 5) return { hand: "fullstack", scoring: [0, 1, 2, 3, 4] }
  if (first.length >= 4) return { hand: "platform", scoring: first.slice(0, 4) }
  if (first.length === 3 && second.length >= 2) return { hand: "tiger", scoring: [...first, ...second].sort((a, b) => a - b) }
  if (first.length === 3) return { hand: "squad", scoring: first }
  if (first.length === 2 && second.length === 2) return { hand: "review", scoring: [...first, ...second].sort((a, b) => a - b) }
  if (first.length === 2) return { hand: "pair", scoring: first }
  let best = 0
  cards.forEach((card, index) => {
    if (card.chips > (cards[best]?.chips ?? 0)) best = index
  })
  return { hand: "hotfix", scoring: n > 0 ? [best] : [] }
}

/**
 * Score a selection without playing it. Order of play: the hand's base, then each scoring card left to right
 * with the swag it triggers, then flat swag in slot order, then multiplying swag in slot order.
 */
export function evaluate(run: HackRun, indices: readonly number[]): HackEvaluation | null {
  const picked = validSelection(run, indices, HACK_MAX_PLAY)
  if (!picked) return null
  const cards = picked.map((i) => runCard(run, run.hand[i] as number))
  const { hand, scoring } = classify(cards)
  const def = handById(hand)
  const rule = judgeRule(run)
  const mutedStack = rule?.kind === "mute" ? rule.stack : null
  const perks = run.perks.map((id) => perkById(id)).filter((perk): perk is Perk => Boolean(perk))
  let chips = def.chips
  let mult = def.mult
  const steps: HackStep[] = [{ kind: "base", chips, mult }]
  const muted: number[] = []
  for (const index of scoring) {
    const card = cards[index] as HackCard
    if (card.stack === mutedStack) {
      muted.push(index)
      steps.push({ kind: "card", card: index, addChips: 0, addMult: 0, muted: true, perks: [], chips, mult })
      continue
    }
    let addChips = card.chips
    let addMult = 0
    const fired: number[] = []
    for (const perk of perks) {
      const effect = perk.effect
      if (effect.kind === "stackMult" && effect.stack === card.stack) {
        addMult += effect.add
        fired.push(perk.id)
      } else if (effect.kind === "cardChips") {
        addChips += effect.add
        fired.push(perk.id)
      } else if (effect.kind === "levelChips" && card.level >= effect.minLevel) {
        addChips += effect.add
        fired.push(perk.id)
      }
    }
    chips += addChips
    mult += addMult
    steps.push({ kind: "card", card: index, addChips, addMult, muted: false, perks: fired, chips, mult })
  }
  const held = run.hand.length - picked.length
  const distinct = new Set(cards.map((card) => card.stack)).size
  for (const perk of perks) {
    const effect = perk.effect
    let addChips = 0
    let addMult = 0
    if (effect.kind === "chips") addChips = effect.add
    else if (effect.kind === "mult") addMult = effect.add
    else if (effect.kind === "handMult" && effect.hand === hand) addMult = effect.add
    else if (effect.kind === "distinctMult") addMult = effect.add * distinct
    else if (effect.kind === "heldMult") addMult = effect.add * held
    if (addChips === 0 && addMult === 0) continue
    chips += addChips
    mult += addMult
    steps.push({ kind: "perk", perk: perk.id, addChips, addMult, x: 1, chips, mult })
  }
  for (const perk of perks) {
    const effect = perk.effect
    let x = 1
    if (effect.kind === "handX" && effect.hand === hand) x = effect.x
    else if (effect.kind === "firstX" && run.shipped === 0) x = effect.x
    else if (effect.kind === "lastX" && run.ships === 1) x = effect.x
    else if (effect.kind === "smallX" && cards.length <= effect.maxCards) x = effect.x
    if (x === 1) continue
    mult *= x
    steps.push({ kind: "perk", perk: perk.id, addChips: 0, addMult: 0, x, chips, mult })
  }
  const repeat = rule?.kind === "noRepeat" && run.used.includes(hand)
  return { hand, scoring, muted, steps, chips, mult, repeat, score: repeat ? 0 : Math.floor(chips * mult) }
}

export type ShipResult = { run: HackRun; shot: HackShot }

/**
 * Ship up to five cards. The round ends the moment its target is reached: Friday and Saturday open the next
 * draft, Sunday wins the run. Out of ships below the target loses it. Prizes are the store's job.
 */
export function shipCards(run: HackRun, indices: readonly number[]): ShipResult | null {
  if (run.stage !== "play" || run.ships <= 0) return null
  const picked = validSelection(run, indices, HACK_MAX_PLAY)
  const result = picked ? evaluate(run, picked) : null
  if (!picked || !result) return null
  const next = cloneRun(run)
  const target = targetOf(run)
  const played = picked.map((i) => run.hand[i] as number)
  next.hand = run.hand.filter((_, i) => !picked.includes(i))
  next.pile.push(...played)
  next.ships -= 1
  next.shipped += 1
  if (!next.used.includes(result.hand)) next.used.push(result.hand)
  next.score = run.score + result.score
  next.best = Math.max(run.best, result.score)
  let outcome: HackShot["outcome"] = "continue"
  let drawn: number[] = []
  if (next.score >= target) outcome = run.round >= HACK_ROUNDS.length - 1 ? "won" : "cleared"
  else if (next.ships <= 0) outcome = "lost"
  else drawn = drawUp(next)
  if (outcome === "cleared") {
    next.round = run.round + 1
    next.stage = "draft"
    next.offer = next.perks.length < HACK_MAX_PERKS ? draftOffer(next) : []
  } else if (outcome === "won") next.stage = "won"
  else if (outcome === "lost") next.stage = "lost"
  next.shotSeq = run.shotSeq + 1
  const shot: HackShot = {
    seq: next.shotSeq,
    hand: result.hand,
    cards: played.map((skillId, position) => ({
      skillId,
      level: runCard(run, skillId).level,
      scoring: result.scoring.includes(position),
      muted: result.muted.includes(position),
    })),
    steps: result.steps,
    chips: result.chips,
    mult: result.mult,
    score: result.score,
    repeat: result.repeat,
    before: run.score,
    after: next.score,
    target,
    drawn,
    outcome,
  }
  next.shot = shot
  return { run: next, shot }
}

/** Toss up to five cards and draw as many. Costs a refactor. */
export function refactorCards(run: HackRun, indices: readonly number[]): HackRun | null {
  if (run.stage !== "play" || run.refactors <= 0) return null
  const picked = validSelection(run, indices, HACK_MAX_PLAY)
  if (!picked) return null
  const next = cloneRun(run)
  next.pile.push(...picked.map((i) => run.hand[i] as number))
  next.hand = run.hand.filter((_, i) => !picked.includes(i))
  next.refactors -= 1
  drawUp(next)
  return next
}

export function setHandSort(run: HackRun, sort: HackSort): HackRun {
  if (run.sort === sort) return run
  const next = cloneRun(run)
  next.sort = sort
  next.hand = sortHand(next, next.hand)
  return next
}

/** Cards still in the draw pile, by stack, for the deck readout. */
export function drawCounts(run: Pick<HackRun, "draw">): Record<StackId, number> {
  return stackCounts(run.draw)
}

/** Close a finished run into the career: wins move the league up, the cooldown starts now. */
export function settleRun(meta: HackMeta, run: HackRun, now: number): HackMeta {
  const won = run.stage === "won"
  return {
    ...meta,
    league: won ? meta.league + 1 : meta.league,
    wins: won ? meta.wins + 1 : meta.wins,
    topLeague: won ? Math.max(meta.topLeague, run.league) : meta.topLeague,
    best: Math.max(meta.best, run.best),
    nextAt: now + HACK_COOLDOWN_MS,
    run,
  }
}

// ---------- save ----------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function count(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 0
  return Math.min(max, Math.max(0, n))
}

function money(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0
}

function idList(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null
  const out: number[] = []
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item)) return null
    out.push(item)
  }
  return out
}

const STAGES: readonly HackStage[] = ["draft", "play", "won", "lost"]
const HAND_IDS = new Set<string>(HANDS.map((hand) => hand.id))

/** A saved run, checked card by card. Anything that does not add up drops the run, never the career. */
export function normalizeRun(raw: unknown): HackRun | null {
  if (!isRecord(raw)) return null
  const stage = STAGES.find((value) => value === raw.stage)
  const judge = judgeById(count(raw.judge))
  if (!stage || !judge || !isRecord(raw.cards)) return null
  const cards: Record<string, number> = {}
  for (const [key, level] of Object.entries(raw.cards)) {
    if (!skillById(Number(key))) return null
    cards[key] = Math.min(CARD_MAX_LEVEL, Math.max(1, count(level)))
  }
  const draw = idList(raw.draw)
  const hand = idList(raw.hand)
  const pile = idList(raw.pile)
  const perks = idList(raw.perks)
  const offer = idList(raw.offer)
  if (!draw || !hand || !pile || !perks || !offer) return null
  // Every card of the deck sits in exactly one place.
  const placed = [...draw, ...hand, ...pile]
  const deck = Object.keys(cards).map(Number)
  if (deck.length === 0 || placed.length !== deck.length || new Set(placed).size !== deck.length) return null
  if (!placed.every((id) => cards[String(id)] !== undefined)) return null
  if (perks.length > HACK_MAX_PERKS || !perks.every((id) => perkById(id)) || new Set(perks).size !== perks.length) return null
  if (offer.length > HACK_DRAFT_SIZE || !offer.every((id) => perkById(id) && !perks.includes(id))) return null
  const used = Array.isArray(raw.used) ? raw.used.filter((id): id is HandId => typeof id === "string" && HAND_IDS.has(id)) : []
  const earned = isRecord(raw.earned) ? raw.earned : {}
  const cleared = isRecord(raw.cleared) ? raw.cleared : null
  const run: HackRun = {
    rng: count(raw.rng, 0xffffffff),
    league: count(raw.league, 1_000),
    judge: judge.id,
    round: count(raw.round, HACK_ROUNDS.length - 1),
    stage,
    cards,
    draw,
    hand: sortHand({ cards, sort: raw.sort === "chips" ? "chips" : "stack" }, hand),
    pile,
    perks,
    offer: stage === "draft" ? offer : [],
    score: count(raw.score),
    ships: count(raw.ships, 99),
    refactors: count(raw.refactors, 99),
    shipped: count(raw.shipped, 99),
    used: [...new Set(used)],
    sort: raw.sort === "chips" ? "chips" : "stack",
    shot: null,
    shotSeq: count(raw.shotSeq),
    earned: { money: money(earned.money), xp: money(earned.xp) },
    cleared: cleared ? { round: count(cleared.round, HACK_ROUNDS.length - 1), money: money(cleared.money), xp: money(cleared.xp) } : null,
    best: count(raw.best),
  }
  if (run.stage === "play" && (run.hand.length === 0 || run.ships === 0)) return null
  // A draft always has swag on the table; a full swag bar goes straight to the round.
  if (run.stage === "draft" && run.offer.length === 0) {
    if (run.perks.length >= HACK_MAX_PERKS) dealRound(run)
    else run.offer = draftOffer(run)
  }
  return run
}

export function normalizeHackMeta(raw: unknown): HackMeta {
  const fresh = freshHackMeta()
  if (!isRecord(raw)) return fresh
  const topLeague = typeof raw.topLeague === "number" && Number.isFinite(raw.topLeague) ? Math.max(-1, Math.floor(raw.topLeague)) : -1
  return {
    league: count(raw.league, 1_000),
    runs: count(raw.runs),
    wins: count(raw.wins),
    best: count(raw.best),
    topLeague: Math.min(topLeague, 1_000),
    nextAt: count(raw.nextAt),
    run: normalizeRun(raw.run),
  }
}

/** True when the meta still matches a career that never touched a hackathon, so the save can omit it. */
export function isFreshHackMeta(meta: HackMeta): boolean {
  return meta.runs === 0 && meta.run === null && meta.nextAt === 0 && meta.league === 0 && meta.wins === 0 && meta.best === 0
}
