/**
 * Phase D capital: the business catalog (angel seat to Mars Holdings). Replaces the old tier 19-66 ladder.
 * `era` drives boosts, rare enemies and the stage accent; rows 1-5 are mid, 6-11 upper, 12-14 q3, 15-25 end.
 * `artId` is the drawing (src/pixel/art.ts) and code snippet (src/data/overlays.ts) a row uses, from the band
 * of its own era and rising with id, so a new row needs no new art. Ids are unique; costs need not rise with id.
 * nextCost = floor(baseCost * COST_GROWTH ** owned)
 */
import { COST_GROWTH } from "./phases.ts"

export { COST_GROWTH }

export type Era = "early" | "mid" | "upper" | "q3" | "end"

export type Capital = {
  id: number
  era: Era
  artId: number
  name: string
  baseCost: number
  cps: number
  clickBonus: number
}

export const CAPITAL: readonly Capital[] = [
  { id: 1, era: "mid", artId: 25, name: "Angel syndicate seat", baseCost: 100000, cps: 50, clickBonus: 0 },
  { id: 2, era: "mid", artId: 27, name: "Seed fund SPV", baseCost: 500000, cps: 200, clickBonus: 0 },
  { id: 3, era: "mid", artId: 28, name: "WhyCombinator batch investment", baseCost: 2000000, cps: 800, clickBonus: 10 },
  { id: 4, era: "mid", artId: 29, name: "Series A lead check", baseCost: 10000000, cps: 3000, clickBonus: 0 },
  { id: 5, era: "mid", artId: 31, name: "Growth equity stake", baseCost: 50000000, cps: 12000, clickBonus: 0 },
  { id: 6, era: "upper", artId: 34, name: "Acquire rival SaaS", baseCost: 120000000, cps: 40000, clickBonus: 25 },
  { id: 7, era: "upper", artId: 36, name: "Hold public AI ticker", baseCost: 300000000, cps: 80000, clickBonus: 0 },
  { id: 8, era: "upper", artId: 37, name: "Hold chip foundry stock", baseCost: 500000000, cps: 100000, clickBonus: 0 },
  { id: 9, era: "upper", artId: 38, name: "Launch AI product line", baseCost: 80000000, cps: 25000, clickBonus: 40 },
  { id: 10, era: "upper", artId: 40, name: "Own inference API market share", baseCost: 400000000, cps: 150000, clickBonus: 0 },
  { id: 11, era: "upper", artId: 44, name: "Acquire chip design house", baseCost: 1000000000, cps: 300000, clickBonus: 50 },
  { id: 12, era: "q3", artId: 46, name: "Fab capacity offtake", baseCost: 5000000000, cps: 1000000, clickBonus: 0 },
  { id: 13, era: "q3", artId: 52, name: "Custom accelerator IP", baseCost: 8000000000, cps: 1500000, clickBonus: 100 },
  { id: 14, era: "q3", artId: 53, name: "Foundry JV", baseCost: 20000000000, cps: 4000000, clickBonus: 0 },
  { id: 15, era: "end", artId: 54, name: "Regional AI data campus", baseCost: 50000000000, cps: 10000000, clickBonus: 75 },
  { id: 16, era: "end", artId: 56, name: "Hyperscale training campus", baseCost: 200000000000, cps: 40000000, clickBonus: 0 },
  { id: 17, era: "end", artId: 57, name: "Global edge network", baseCost: 500000000000, cps: 80000000, clickBonus: 0 },
  { id: 18, era: "end", artId: 58, name: "Undersea cable consortium", baseCost: 800000000000, cps: 100000000, clickBonus: 100 },
  { id: 19, era: "end", artId: 60, name: "Orbital compute company", baseCost: 2000000000000, cps: 300000000, clickBonus: 0 },
  { id: 20, era: "end", artId: 61, name: "LEO inference constellation Co", baseCost: 8000000000000, cps: 900000000, clickBonus: 0 },
  { id: 21, era: "end", artId: 62, name: "Lunar relay LLC", baseCost: 20000000000000, cps: 2000000000, clickBonus: 150 },
  { id: 22, era: "end", artId: 63, name: "Mars precursor ops Co", baseCost: 80000000000000, cps: 6000000000, clickBonus: 0 },
  { id: 23, era: "end", artId: 64, name: "Mars power utility", baseCost: 250000000000000, cps: 15000000000, clickBonus: 0 },
  { id: 24, era: "end", artId: 65, name: "Mars data center REIT", baseCost: 1000000000000000, cps: 50000000000, clickBonus: 200 },
  { id: 25, era: "end", artId: 66, name: "Mars megacampus Holdings", baseCost: 50000000000000000, cps: 500000000000, clickBonus: 0 },
] as const
