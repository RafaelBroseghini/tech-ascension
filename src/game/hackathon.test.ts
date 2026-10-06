import { describe, expect, it } from "vitest"
import {
  CARD_CHIPS,
  HACK_COOLDOWN_MS,
  HACK_LEAGUES,
  HACK_ROUNDS,
  HANDS,
  JUDGES,
  PERKS,
  SKILL_STACK,
  STACKS,
  stackOfSkill,
} from "../data/hackathon.ts"
import type { HandId, StackId } from "../data/hackathon.ts"
import { SKILL_TIERS } from "../data/phases.ts"
import {
  cardOf,
  deckOf,
  evaluate,
  freshHackMeta,
  hackReady,
  handSizeOf,
  isFreshHackMeta,
  leagueName,
  levelForCopies,
  niceRound,
  normalizeHackMeta,
  normalizeRun,
  pickPerk,
  prizeScale,
  refactorCards,
  refactorsOf,
  roundTarget,
  setHandSort,
  settleRun,
  shipCards,
  startRun,
  targetOf,
  tierOfSkill,
} from "./hackathon.ts"
import type { HackRun } from "./hackathon.ts"
import { hackUnlocked, roundPrize } from "./hackathonEconomy.ts"

/** Skills by stack, low ids first, for building exact hands. */
const BY_STACK: Record<StackId, number[]> = { front: [], back: [], ops: [], data: [], craft: [] }
for (const row of SKILL_TIERS) BY_STACK[stackOfSkill(row.id)].push(row.id)

function pickIds(spec: Partial<Record<StackId, number>>): number[] {
  const ids: number[] = []
  for (const [stack, n] of Object.entries(spec) as [StackId, number][]) ids.push(...BY_STACK[stack].slice(0, n))
  return ids
}

/** A run in play with this exact hand, every card at level 1, and the rest of the table set by `extra`. */
function table(hand: number[], extra: Partial<HackRun> = {}): HackRun {
  const cards: Record<string, number> = {}
  for (const id of hand) cards[String(id)] = 1
  const spare = SKILL_TIERS.map((row) => row.id).filter((id) => !hand.includes(id)).slice(0, 20)
  for (const id of spare) cards[String(id)] = 1
  return {
    rng: 7,
    league: 0,
    judge: 6,
    round: 0,
    stage: "play",
    cards,
    draw: spare,
    hand: [...hand],
    pile: [],
    perks: [],
    offer: [],
    score: 0,
    ships: 4,
    refactors: 3,
    shipped: 0,
    used: [],
    sort: "stack",
    shot: null,
    shotSeq: 0,
    earned: { money: 0, xp: 0 },
    cleared: null,
    best: 0,
    ...extra,
  }
}

const all = (run: HackRun) => run.hand.map((_, index) => index)
const chipsOf = (ids: number[]) => ids.reduce((sum, id) => sum + cardOf(id, 1).chips, 0)
const BANNED =
  /\b(stack ?overflow|freecodecamp|youtube|github|kaggle|pytorch|tensorflow|y combinator|yc|raspberry pi|mac mini|docker|kubernetes|hacker news|leetcode|upwork|discord|linkedin|wordpress|figma|shopify|stripe|redis|graphql|postgres|chrome|red bull|monster|pagerduty|aws|nvidia)\b/i

describe("hackathon table", () => {
  it("puts every skill in exactly one of five stacks", () => {
    expect(new Set(STACKS.map((stack) => stack.id)).size).toBe(5)
    for (const row of SKILL_TIERS) expect(SKILL_STACK[row.id]).toBeDefined()
    expect(Object.keys(SKILL_STACK)).toHaveLength(SKILL_TIERS.length)
    for (const stack of STACKS) expect(BY_STACK[stack.id].length).toBeGreaterThanOrEqual(10)
  })

  it("gives the first twenty skills every stack, so Full stack is possible from the first run", () => {
    const early = new Set(SKILL_TIERS.slice(0, 20).map((row) => stackOfSkill(row.id)))
    expect(early.size).toBe(5)
  })

  it("keeps unique ids and parody names", () => {
    expect(new Set(PERKS.map((perk) => perk.id)).size).toBe(PERKS.length)
    expect(new Set(JUDGES.map((judge) => judge.id)).size).toBe(JUDGES.length)
    const names = [...PERKS.map((p) => `${p.name} ${p.blurb}`), ...JUDGES.map((j) => `${j.name} ${j.quote} ${j.blurb}`), ...HANDS.map((h) => h.name), ...HACK_ROUNDS.map((r) => r.name), ...HACK_LEAGUES]
    for (const name of names) expect(name).not.toMatch(BANNED)
  })

  it("lists hands strongest first, each beating the one below on base score", () => {
    for (let i = 1; i < HANDS.length; i++) {
      const above = HANDS[i - 1]
      const below = HANDS[i]
      if (!above || !below) continue
      expect(above.chips * above.mult).toBeGreaterThan(below.chips * below.mult)
    }
  })
})

describe("cards", () => {
  it("levels by copies on a log scale, capped at 5", () => {
    expect([1, 2, 3, 4, 7, 8, 15, 16, 900].map(levelForCopies)).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5])
    expect(levelForCopies(0)).toBe(1)
  })

  it("pays more chips for later skills and higher levels", () => {
    expect(tierOfSkill(1)).toBe(1)
    expect(tierOfSkill(13)).toBe(1)
    expect(tierOfSkill(14)).toBe(2)
    expect(tierOfSkill(104)).toBe(8)
    expect(cardOf(1, 1).chips).toBe(CARD_CHIPS.base + CARD_CHIPS.perTier)
    expect(cardOf(104, 5).chips).toBe(CARD_CHIPS.base + CARD_CHIPS.perTier * 8 + CARD_CHIPS.perLevel * 4)
    expect(cardOf(16, 9).level).toBe(5)
  })

  it("builds the deck from every skill held", () => {
    expect(deckOf({ "1": 3, "16": 16, "2": 0 })).toEqual({ "1": 2, "16": 5 })
  })
})

describe("hands", () => {
  const cases: [HandId, Partial<Record<StackId, number>>, number][] = [
    ["specialist", { front: 5 }, 5],
    ["fullstack", { front: 1, back: 1, ops: 1, data: 1, craft: 1 }, 5],
    ["platform", { ops: 4, data: 1 }, 4],
    ["tiger", { back: 3, craft: 2 }, 5],
    ["squad", { data: 3, front: 1, back: 1 }, 3],
    ["review", { front: 2, ops: 2, craft: 1 }, 4],
    ["pair", { craft: 2, front: 1, back: 1, ops: 1 }, 2],
    ["hotfix", { front: 1, back: 1, ops: 1, data: 1 }, 1],
  ]
  for (const [hand, spec, scoring] of cases) {
    it(`reads ${hand}`, () => {
      const run = table(pickIds(spec))
      const result = evaluate(run, all(run))
      expect(result?.hand).toBe(hand)
      expect(result?.scoring).toHaveLength(scoring)
    })
  }

  it("scores only the cards that form the hand: (base chips + card chips) × base mult", () => {
    const pair = pickIds({ craft: 2 })
    const run = table([...pair, ...pickIds({ front: 1 })])
    const result = evaluate(run, all(run))
    expect(result?.score).toBe((10 + chipsOf(pair)) * 2)
    expect(result?.steps[0]).toEqual({ kind: "base", chips: 10, mult: 2 })
    expect(result?.steps.filter((step) => step.kind === "card")).toHaveLength(2)
  })

  it("plays the best single card as a hotfix", () => {
    const run = table([BY_STACK.front[0] as number, BY_STACK.ops[BY_STACK.ops.length - 1] as number])
    const result = evaluate(run, all(run))
    expect(result?.hand).toBe("hotfix")
    expect(result?.score).toBe(5 + cardOf(BY_STACK.ops[BY_STACK.ops.length - 1] as number, 1).chips)
  })

  it("refuses an empty, repeated, out of range or six-card selection", () => {
    const run = table(pickIds({ front: 4, back: 3 }))
    expect(evaluate(run, [])).toBeNull()
    expect(evaluate(run, [0, 0])).toBeNull()
    expect(evaluate(run, [7])).toBeNull()
    expect(evaluate(run, [0, 1, 2, 3, 4, 5])).toBeNull()
  })
})

describe("swag", () => {
  const pair = () => pickIds({ craft: 2, front: 1 })
  const base = (ids: number[]) => (10 + chipsOf(ids.slice(0, 2))) * 2

  it("adds flat mult and chips", () => {
    const ids = pair()
    expect(evaluate(table(ids, { perks: [1] }), [0, 1, 2])?.score).toBe((10 + chipsOf(ids.slice(0, 2))) * 6)
    expect(evaluate(table(ids, { perks: [2] }), [0, 1, 2])?.score).toBe((40 + chipsOf(ids.slice(0, 2))) * 2)
  })

  it("adds mult per scored card of its stack only", () => {
    const ids = pair()
    const run = table(ids, { perks: [7] })
    const result = evaluate(run, [0, 1, 2])
    // The two Craft cards score and fire the swag; the Frontend kicker does not score.
    expect(result?.mult).toBe(2 + 3 + 3)
    expect(result?.steps.filter((step) => step.kind === "card" && step.perks.includes(7))).toHaveLength(2)
  })

  it("applies flat swag before multiplying swag", () => {
    const ids = pair()
    const run = table(ids, { perks: [13, 1] })
    const result = evaluate(run, [0, 1, 2])
    expect(result?.mult).toBe((2 + 4) * 2)
    const kinds = result?.steps.filter((step) => step.kind === "perk").map((step) => (step.kind === "perk" ? step.perk : 0))
    expect(kinds).toEqual([1, 13])
  })

  it("fires first-ship and last-ship swag only on those ships", () => {
    const ids = pair()
    expect(evaluate(table(ids, { perks: [13], shipped: 0 }), [0, 1, 2])?.score).toBe(base(ids) * 2)
    expect(evaluate(table(ids, { perks: [13], shipped: 1 }), [0, 1, 2])?.score).toBe(base(ids))
    expect(evaluate(table(ids, { perks: [14], ships: 1 }), [0, 1, 2])?.score).toBe(base(ids) * 3)
    expect(evaluate(table(ids, { perks: [14], ships: 2 }), [0, 1, 2])?.score).toBe(base(ids))
  })

  it("counts held cards, distinct stacks and small ships", () => {
    const ids = [...pickIds({ craft: 2 }), ...pickIds({ front: 3 })]
    const run = table(ids)
    expect(evaluate({ ...run, perks: [17] }, [0, 1])?.mult).toBe(2 + 2 * 3)
    expect(evaluate({ ...run, perks: [16] }, [0, 1, 2])?.mult).toBe(2 + 2 * 2)
    expect(evaluate({ ...run, perks: [20] }, [0, 1])?.mult).toBe(4)
    expect(evaluate({ ...run, perks: [20] }, [0, 1, 2, 3])?.mult).toBe(2)
  })

  it("multiplies a matching hand type only", () => {
    const tiger = table(pickIds({ back: 3, craft: 2 }), { perks: [19] })
    expect(evaluate(tiger, all(tiger))?.mult).toBe(6)
    const squad = table(pickIds({ back: 3, craft: 1, front: 1 }), { perks: [19] })
    expect(evaluate(squad, all(squad))?.mult).toBe(3)
  })

  it("changes the round shape: ships, refactors and hand size", () => {
    const run = table(pair(), { perks: [8, 9, 10] })
    expect(handSizeOf(run)).toBe(8)
    expect(refactorsOf(run)).toBe(5)
  })
})

describe("Sunday's judge", () => {
  it("mutes a stack: the cards still form the hand but add nothing", () => {
    const ids = pickIds({ front: 3 })
    const run = table(ids, { round: 2, judge: 1 })
    const result = evaluate(run, all(run))
    expect(result?.hand).toBe("squad")
    expect(result?.muted).toHaveLength(3)
    expect(result?.score).toBe(30 * 3)
    // Friday has no judge.
    expect(evaluate({ ...run, round: 0 }, all(run))?.score).toBe((30 + chipsOf(ids)) * 3)
  })

  it("zeroes a repeated hand type", () => {
    const run = table(pickIds({ craft: 2, front: 1 }), { round: 2, judge: 9, used: ["pair"] })
    const result = evaluate(run, [0, 1])
    expect(result?.repeat).toBe(true)
    expect(result?.score).toBe(0)
  })

  it("raises the target, shrinks the hand or takes the refactors, on Sunday only", () => {
    expect(roundTarget(0, 2, 6)).toBe(niceRound(1300 * 1.5))
    expect(roundTarget(0, 1, 6)).toBe(800)
    expect(handSizeOf({ perks: [], judge: 7, round: 2 })).toBe(6)
    expect(handSizeOf({ perks: [], judge: 7, round: 1 })).toBe(7)
    expect(refactorsOf({ perks: [9], judge: 8, round: 2 })).toBe(0)
  })
})

describe("targets, leagues and prizes", () => {
  it("rounds targets to two figures and grows them 1.5× per league", () => {
    expect([0, 1, 2].map((round) => roundTarget(0, round, 1))).toEqual([500, 800, 1300])
    expect(roundTarget(1, 0, 1)).toBe(750)
    expect(roundTarget(2, 0, 1)).toBe(1100)
    expect(niceRound(1688)).toBe(1700)
    expect(niceRound(42)).toBe(42)
  })

  it("names the ladder past Orbital", () => {
    expect(leagueName(0)).toBe("Campus")
    expect(leagueName(4)).toBe("Orbital")
    expect(leagueName(6)).toBe("Orbital +2")
    expect(prizeScale(0)).toBe(1)
    expect(prizeScale(9)).toBe(2)
  })

  it("pays minutes of income, XP until money exists", () => {
    const rates = { cps: 10, click: 0, xpPerSec: 5, xpPerClick: 0 }
    expect(roundPrize(0, 0, rates, { money: 0, xp: 0 }, true)).toEqual({ money: 0, xp: 3 * 60 * 5 })
    expect(roundPrize(1, 0, rates, { money: 0, xp: 0 }, true)).toEqual({ money: 5 * 60 * 10, xp: 0 })
    expect(roundPrize(1, 0, rates, { money: 0, xp: 0 }, false)).toEqual({ money: 0, xp: 5 * 60 * 5 })
    expect(roundPrize(2, 4, rates, { money: 0, xp: 0 }, true)).toEqual({ money: 8 * 2 * 60 * 10, xp: 0 })
    // A big pile still pays at least 1% of it.
    expect(roundPrize(1, 0, rates, { money: 1e9, xp: 0 }, true).money).toBe(1e7)
  })
})

describe("unlock", () => {
  const skills = (n: number) => Object.fromEntries(SKILL_TIERS.slice(0, n).map((row) => [String(row.id), 1]))
  const gates = (n: number, xpTotal: number) => ({ xpTotal, peakMoney: 0, skills: skills(n), owned: {}, jobs: [], gigs: [] })

  it("opens with the Gig Board and twelve skills, and stays open once played", () => {
    expect(hackUnlocked(gates(20, 30_000), freshHackMeta())).toBe(true)
    expect(hackUnlocked(gates(20, 1_000), freshHackMeta())).toBe(false)
    expect(hackUnlocked({ ...gates(0, 30_000), skills: { "15": 1, "16": 1 } }, freshHackMeta())).toBe(false)
    expect(hackUnlocked(gates(0, 0), { runs: 1, run: null })).toBe(true)
  })

  it("is ready with no run and the cooldown over", () => {
    expect(hackReady({ run: null, nextAt: 0 }, 1)).toBe(true)
    expect(hackReady({ run: null, nextAt: 10 }, 5)).toBe(false)
  })
})

describe("a run", () => {
  const skills = Object.fromEntries(SKILL_TIERS.slice(0, 24).map((row) => [String(row.id), 4]))

  function deckIntact(run: HackRun) {
    const placed = [...run.draw, ...run.hand, ...run.pile].sort((a, b) => a - b)
    expect(placed).toEqual(Object.keys(run.cards).map(Number).sort((a, b) => a - b))
  }

  it("deals the same run from the same seed", () => {
    const a = startRun({ league: 0, skills, seed: 42 })
    const b = startRun({ league: 0, skills, seed: 42 })
    expect(a).toEqual(b)
    expect(a?.stage).toBe("draft")
    expect(new Set(a?.offer).size).toBe(3)
    expect(startRun({ league: 0, skills: {}, seed: 1 })).toBeNull()
  })

  it("plays a weekend: draft, ship, refactor, clear, and a fresh round", () => {
    const start = startRun({ league: 0, skills, seed: 3 })
    if (!start) throw new Error("no run")
    expect(pickPerk(start, 5)).toBeNull()
    const round = pickPerk(start, 0)
    if (!round) throw new Error("no round")
    expect(round).toMatchObject({ stage: "play", round: 0, ships: 4, score: 0 })
    expect(round.perks).toHaveLength(1)
    expect(round.hand).toHaveLength(handSizeOf(round))
    deckIntact(round)

    const tossed = refactorCards(round, [0, 1])
    if (!tossed) throw new Error("no refactor")
    expect(tossed.refactors).toBe(round.refactors - 1)
    expect(tossed.hand).toHaveLength(round.hand.length)
    deckIntact(tossed)

    const shipped = shipCards(tossed, [0, 1, 2])
    if (!shipped) throw new Error("no ship")
    expect(shipped.run.ships).toBe(3)
    expect(shipped.run.score).toBe(shipped.shot.score)
    expect(shipped.shot.cards).toHaveLength(3)
    deckIntact(shipped.run)

    const cleared = shipCards({ ...tossed, score: targetOf(tossed) - 1 }, [0, 1, 2])
    expect(cleared?.shot.outcome).toBe("cleared")
    expect(cleared?.run).toMatchObject({ stage: "draft", round: 1 })
    expect(cleared?.run.offer).toHaveLength(3)
    expect(cleared?.run.offer.some((id) => tossed.perks.includes(id))).toBe(false)
    const saturday = cleared ? pickPerk(cleared.run, 1) : null
    expect(saturday).toMatchObject({ stage: "play", round: 1, score: 0, shipped: 0 })
    if (saturday) deckIntact(saturday)
  })

  it("wins on Sunday's target and loses when the ships run out", () => {
    const sunday = table(pickIds({ craft: 3, back: 4 }), { round: 2, judge: 7, score: 10_000 })
    expect(shipCards(sunday, [0, 1])?.run.stage).toBe("won")
    const last = table(pickIds({ craft: 3, back: 4 }), { ships: 1 })
    const lost = shipCards(last, [0])
    expect(lost?.shot.outcome).toBe("lost")
    expect(lost?.run.stage).toBe("lost")
    expect(shipCards(lost?.run as HackRun, [0])).toBeNull()
  })

  it("keeps the deck whole through a long random weekend", () => {
    let run = startRun({ league: 3, skills, seed: 99 })
    let guard = 0
    while (run && run.stage !== "won" && run.stage !== "lost" && guard < 200) {
      guard += 1
      if (run.stage === "draft") {
        run = pickPerk(run, guard % 3)
        continue
      }
      const next: HackRun | null =
        guard % 3 === 0 && run.refactors > 0 ? refactorCards(run, [0, 2]) : (shipCards(run, [0, 1, 2, 3, 4].slice(0, (guard % 5) + 1))?.run ?? null)
      if (!next) break
      run = next
      deckIntact(run)
    }
    expect(run?.stage === "won" || run?.stage === "lost").toBe(true)
  })

  it("re-sorts the hand by chips or stack", () => {
    const run = table(pickIds({ craft: 2, front: 2, ops: 2 }))
    const byChips = setHandSort(run, "chips")
    const chips = byChips.hand.map((id) => cardOf(id, 1).chips)
    expect(chips).toEqual([...chips].sort((a, b) => b - a))
    expect(setHandSort(byChips, "chips")).toBe(byChips)
  })

  it("settles a win up a league and starts the cooldown", () => {
    const won = { ...table([1]), stage: "won" as const, best: 900 }
    const meta = settleRun({ ...freshHackMeta(), runs: 1 }, won, 1_000)
    expect(meta).toMatchObject({ league: 1, wins: 1, topLeague: 0, best: 900, nextAt: 1_000 + HACK_COOLDOWN_MS })
    const lost = settleRun(meta, { ...won, stage: "lost", league: 1, best: 10 }, 2_000)
    expect(lost).toMatchObject({ league: 1, wins: 1, best: 900 })
  })
})

describe("save", () => {
  const skills = Object.fromEntries(SKILL_TIERS.slice(0, 16).map((row) => [String(row.id), 2]))

  it("round-trips a run in progress, minus the replay", () => {
    const start = startRun({ league: 1, skills, seed: 11 })
    const round = start ? pickPerk(start, 2) : null
    const shipped = round ? shipCards(round, [0, 1]) : null
    if (!shipped) throw new Error("no ship")
    const meta = { ...freshHackMeta(), runs: 1, run: shipped.run }
    const back = normalizeHackMeta(JSON.parse(JSON.stringify(meta)))
    expect(back.run).toEqual({ ...shipped.run, shot: null })
    expect(isFreshHackMeta(freshHackMeta())).toBe(true)
    expect(isFreshHackMeta(back)).toBe(false)
  })

  it("drops a run whose cards do not add up, and keeps the career", () => {
    const start = startRun({ league: 0, skills, seed: 5 })
    const round = start ? pickPerk(start, 0) : null
    if (!round) throw new Error("no round")
    const twice = { ...round, hand: [...round.hand, round.hand[0]] }
    expect(normalizeRun(JSON.parse(JSON.stringify(twice)))).toBeNull()
    expect(normalizeRun({ ...round, perks: [999] })).toBeNull()
    expect(normalizeRun({ ...round, judge: 0 })).toBeNull()
    expect(normalizeRun({ ...round, cards: { "9999": 1 } })).toBeNull()
    const meta = normalizeHackMeta({ league: 3, runs: 4, wins: 2, best: 50, topLeague: 2, nextAt: 5, run: twice })
    expect(meta).toMatchObject({ league: 3, runs: 4, wins: 2, best: 50, topLeague: 2, nextAt: 5, run: null })
    expect(normalizeHackMeta("nope")).toEqual(freshHackMeta())
  })

  it("puts swag back on an empty draft table", () => {
    const start = startRun({ league: 0, skills, seed: 8 })
    if (!start) throw new Error("no run")
    expect(normalizeRun({ ...start, offer: [] })?.offer).toHaveLength(3)
  })
})
