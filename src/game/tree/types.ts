/**
 * The progression tree: one data structure for what every row needs. A node is a row of the game (a skill, a gig, a job,
 * a gear row, a capital row, a board, a pick, a 10x dev perk); its `requires` is a small expression over what the career
 * has (lifetime XP, rows owned, a count of gigs, a tag count, a job rank, users, the money once held, a pick). Evaluating
 * it says whether the row is open and, if not, exactly which leaves are unmet. docs/TREE.md explains the shape and how to
 * add a branch.
 *
 * Two things stay apart. `requires` is a hard gate. Order (`after`, a track's position) is layout: what the row sits
 * under, and which row the shop shows next. A track is `strict` when its order is also a gate (the gigs: each needs
 * every earlier one cleared) and loose when it is not (the jobs and the skills, where lifetime XP does the ordering).
 */
import type { LeadId } from "../../data/leadership.ts"
import type { SpecId } from "../../data/specializations.ts"
import type { Tag } from "../../data/tags.ts"

export type Kind = "skill" | "gig" | "job" | "gear" | "capital" | "board" | "pick" | "gold"

/** A node's address: `skill:15`, `gig:3`, `job:108`, `gear:42`, `capital:6`, `board:jobs`, `pick:spec`, `gold:2`. */
export type Ref = `${Kind}:${string | number}`

/** Where lifetime XP and board gates are scaled by the career's origin, by the same rule the origin module gives. */
export type XpMod = "gig" | "job" | "gigBoard"

export type Req =
  /** Lifetime XP at least `min` (scaled by `mod` for the career's origin; `rank` is the job's rank for the `job` rule). */
  | { t: "xp"; min: number; mod?: XpMod; rank?: number }
  /** Every one of these rows owned (a skill, a perk...). */
  | { t: "owns"; kind: "skill" | "gold"; ids: readonly number[] }
  /** Owns at least one row of this kind. This is what latches a gate: holding what it leads to keeps it open. */
  | { t: "has"; kind: "gig" | "job" | "capital" | "gear" }
  /** At least `min` gigs cleared or jobs held (the Job Board's gig count is scaled by `mod` for the origin). */
  | { t: "count"; of: "gigs" | "jobs"; min: number; mod?: "jobBoard" }
  /** At least `min` owned skills carry this tag. */
  | { t: "tag"; tag: Tag; min: number }
  /** The job rank held now or before a switch is at least `min`. */
  | { t: "rank"; min: number }
  /** The product has at least `min` users. A caller with no company leaves this open. */
  | { t: "users"; min: number }
  /** The balance has reached `peak` at some point (spending it later does not close the gate). */
  | { t: "money"; peak: number }
  /** The row is on the career's own track and line: a job of another specialization or line is hidden, never offered. */
  | { t: "track"; spec?: SpecId; lead?: LeadId }
  /** The specialization or the leadership line is picked. */
  | { t: "picked"; of: "spec" | "lead" }
  /** Another node's own requirements hold (a board is open). */
  | { t: "met"; ref: Ref }
  | { t: "all"; of: readonly Req[] }
  | { t: "any"; of: readonly Req[] }

export type Node = {
  ref: Ref
  kind: Kind
  /** The row's own id (a skill's, a gig's...), or the board's or pick's name. */
  id: number | string
  name: string
  /** The track it sits on and its place in it (0 first). */
  track: string
  index: number
  /** What the row sits under: the row before it in its track, or the row it hangs off. Layout, not a gate unless the track is strict. */
  after?: Ref
  /** The gate for acting on the row (buying, clearing, taking, picking). */
  requires: Req
  /** The gate for showing the row in the shop. Left out, it is `requires`. */
  reveal?: Req
}

export type Track = {
  id: string
  label: string
  /** True when the order is a gate too (the node's `requires` repeats the edge to the row before it). */
  strict: boolean
  /** The nodes in order. */
  nodes: readonly Ref[]
}

/** What an evaluation needs to read: the career's progress. The same shape the shop and the store already pass as gates. */
export type TreeView = {
  xpTotal: number
  peakMoney: number
  skills: Readonly<Record<string, number>>
  owned: Readonly<Record<string, number>>
  equipment?: Readonly<Record<string, number>>
  gold?: readonly number[]
  jobs: readonly number[]
  gigs: readonly number[]
  build?: import("../build.ts").BuildState
  company?: { users: Readonly<Record<string, number>> }
}

/** One leaf that does not hold, as the shop and an agent read it. */
export type Missing = { req: Req; text: string }

export type Check = {
  /** The node's own requirements hold. */
  met: boolean
  /** Every unmet leaf, in the order the gate lists them. Empty when `met`. */
  missing: readonly Missing[]
}
