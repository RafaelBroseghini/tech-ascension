import { CAPITAL } from "../data/capital.ts"
import { EQUIPMENT } from "../data/phases.ts"
import { nextCost, ownedCount } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { milestoneStep } from "./outputMilestones.ts"
import type { MilestoneStep } from "./outputMilestones.ts"

/** A gear or capital row's next output milestone, named, with what the copies up to it cost at today's prices. */
export type MilestoneTarget = MilestoneStep & {
  /** Shop row key: `gear:5` or `capital:3`. */
  key: string
  kind: "gear" | "capital"
  id: number
  name: string
  /** What the copies up to the milestone cost. */
  cost: number
}

type Row = { id: number; name: string; baseCost: number }

/** A row's next milestone and its price. Null before the first copy (that is the row's own unlock) and past the last. */
export function milestoneTarget(kind: MilestoneTarget["kind"], row: Row, owned: number): MilestoneTarget | null {
  const step = milestoneStep(owned)
  if (!step) return null
  let cost = 0
  for (let count = owned; count < step.at; count++) cost += nextCost(row.baseCost, count)
  return { ...step, key: `${kind}:${row.id}`, kind, id: row.id, name: row.name, cost }
}

type Holdings = { equipment: OwnedMap; owned: OwnedMap }

// Both maps are replaced on every purchase and only then, so the last answer holds until the next buy.
let memo: { equipment: OwnedMap; owned: OwnedMap; targets: MilestoneTarget[] } | null = null

function allTargets(p: Holdings): MilestoneTarget[] {
  if (memo && memo.equipment === p.equipment && memo.owned === p.owned) return memo.targets
  const targets: MilestoneTarget[] = []
  for (const row of EQUIPMENT) {
    const target = milestoneTarget("gear", row, ownedCount(p.equipment, row.id))
    if (target) targets.push(target)
  }
  for (const row of CAPITAL) {
    const target = milestoneTarget("capital", row, ownedCount(p.owned, row.id))
    if (target) targets.push(target)
  }
  targets.sort((a, b) => a.cost - b.cost || a.left - b.left)
  memo = { equipment: p.equipment, owned: p.owned, targets }
  return targets
}

/** The owned rows' next milestones, cheapest to reach first: the order a player buying the best deal would hit them. */
export function nearestMilestones(p: Holdings, scope: "gear" | "capital" | "all" = "all", count = 3): MilestoneTarget[] {
  const targets = allTargets(p)
  return (scope === "all" ? targets : targets.filter((target) => target.kind === scope)).slice(0, count)
}
