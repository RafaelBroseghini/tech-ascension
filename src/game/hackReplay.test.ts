import { describe, expect, it } from "vitest"
import { SKILL_TIERS } from "../data/phases.ts"
import { stackOfSkill } from "../data/hackathon.ts"
import { pickPerk, shipCards, startRun } from "./hackathon.ts"
import type { HackRun, HackShot } from "./hackathon.ts"
import { REPLAY_MS, replayFrames, replayLength } from "./hackReplay.ts"

const skills = Object.fromEntries(SKILL_TIERS.slice(0, 30).map((row) => [String(row.id), 4]))

/** A dealt Friday with the given swag, its hand re-dealt so the first five cards share a stack where possible. */
function friday(perks: number[]): HackRun {
  const start = startRun({ league: 0, skills, seed: 21 })
  const run = start ? pickPerk(start, 0) : null
  if (!run) throw new Error("no run")
  const ids = Object.keys(run.cards).map(Number)
  const backend = ids.filter((id) => stackOfSkill(id) === "back").slice(0, 3)
  const ops = ids.filter((id) => stackOfSkill(id) === "ops").slice(0, 2)
  const hand = [...backend, ...ops, ...ids.filter((id) => !backend.includes(id) && !ops.includes(id)).slice(0, 2)]
  const draw = ids.filter((id) => !hand.includes(id))
  return { ...run, perks, hand, draw, pile: [] }
}

function ship(run: HackRun, indices: number[]): HackShot {
  const result = shipCards(run, indices)
  if (!result) throw new Error("no ship")
  return result.shot
}

describe("scoring replay", () => {
  it("plays the base, then each scoring card, then the landing and the count", () => {
    const shot = ship(friday([]), [0, 1, 2, 3, 4])
    const frames = replayFrames(shot)
    expect(shot.hand).toBe("tiger")
    expect(frames.map((frame) => frame.phase)).toEqual(["base", "card", "card", "card", "card", "card", "total", "count"])
    const last = frames[frames.length - 1]
    expect(last?.chips).toBe(shot.chips)
    expect(last?.mult).toBe(shot.mult)
    // Each card beat is shorter than the one before, down to the floor.
    const cards = frames.filter((frame) => frame.phase === "card").map((frame) => frame.ms)
    for (let i = 1; i < cards.length; i++) expect(cards[i]).toBeLessThanOrEqual(cards[i - 1] as number)
    expect(Math.min(...cards)).toBeGreaterThanOrEqual(REPLAY_MS.cardMin)
  })

  it("gives swag on a card its own +mult beat, and multiplying swag a ×mult beat", () => {
    const shot = ship(friday([4, 19]), [0, 1, 2, 3, 4])
    const frames = replayFrames(shot)
    const mult = frames.filter((frame) => frame.tone === "mult")
    expect(mult).toHaveLength(3)
    expect(mult.every((frame) => frame.perk === 4 && frame.label === "+3 mult")).toBe(true)
    const x = frames.find((frame) => frame.tone === "x")
    expect(x).toMatchObject({ phase: "perk", perk: 19, label: "×2 mult" })
    // Beats count up for the rising pitch.
    const beats = frames.filter((frame) => frame.tone !== null).map((frame) => frame.beat)
    expect(beats).toEqual([...beats].sort((a, b) => a - b))
  })

  it("adds the banner only when the ship ends the round, and stays brisk", () => {
    const run = friday([1, 4, 19])
    // Orbital +6's target is far out of reach, so this ship leaves the round open.
    const plain = replayFrames(ship({ ...run, league: 10 }, [0, 1, 2, 3, 4]))
    expect(plain.some((frame) => frame.phase === "banner")).toBe(false)
    const clearing = replayFrames(ship({ ...run, score: 10_000 }, [0, 1, 2, 3, 4]))
    expect(clearing[clearing.length - 1]?.phase).toBe("banner")
    expect(replayLength(clearing)).toBeLessThan(3_500)
  })
})
