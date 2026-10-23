/**
 * The progression tree's public face: the nodes and tracks, the evaluator, and the walks that answer "what does this need"
 * and "what does this open". See docs/TREE.md for the model and `npm run tree` for a printed outline.
 */
import { childrenOf, NODE_MAP, nodeOf, TRACK_LIST } from "./graph.ts"
import type { Node, Ref, Req, Track } from "./types.ts"

export { check, describe, entry, entryPhrases, firstFail, holds, isOwned, neededPhrases, revealed, short, skillGapText } from "./check.ts"
export type { EntryLine } from "./check.ts"
export { childrenOf, NODE_MAP, nodeOf, TRACK_LIST }
export type { Check, Kind, Missing, Node, Ref, Req, Track, TreeView, XpMod } from "./types.ts"

/** Every node, in track order. */
export const NODES: readonly Node[] = TRACK_LIST.flatMap((track) => track.nodes.map((ref) => NODE_MAP.get(ref) as Node))

export const trackOf = (ref: Ref): Track | undefined => TRACK_LIST.find((track) => track.nodes.includes(ref))

/** The rows a requirement mentions directly: the boards it needs open and the perks it needs owned. */
export function mentions(req: Req): Ref[] {
  switch (req.t) {
    case "met":
      return [req.ref]
    case "owns":
      return req.ids.map((id) => `${req.kind}:${id}` as Ref)
    case "all":
    case "any":
      return req.of.flatMap(mentions)
    case "picked":
      return [`pick:${req.of === "spec" ? "spec" : "lead"}` as Ref]
    default:
      return []
  }
}

/** What a node needs first: the row it sits under, and every row its gate names (not the numbers, which are on `requires`). */
export function prereqs(ref: Ref): Ref[] {
  const node = nodeOf(ref)
  if (!node) return []
  return [...new Set([...(node.after ? [node.after] : []), ...mentions(node.requires)])]
}

/** What a node opens: the rows sitting under it and the rows whose gate names it. */
export function dependents(ref: Ref): Ref[] {
  const named = NODES.filter((node) => mentions(node.requires).includes(ref)).map((node) => node.ref)
  return [...new Set([...childrenOf(ref), ...named])]
}

/** Everything a node needs, all the way back, nearest first. A skill list is one entry per skill, so a late gig names its whole prefix. */
export function closure(ref: Ref): Ref[] {
  const seen = new Set<Ref>()
  const order: Ref[] = []
  const visit = (next: Ref) => {
    for (const before of prereqs(next)) {
      if (seen.has(before)) continue
      seen.add(before)
      order.push(before)
      visit(before)
    }
  }
  visit(ref)
  return order
}
