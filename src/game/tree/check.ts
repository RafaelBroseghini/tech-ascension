/**
 * Evaluates the tree against a career: does a node's gate hold, which leaf is the first that does not, and what does
 * each missing leaf say in words. Pure and allocation-light (`holds` and `firstFail` allocate nothing), because the shop
 * asks about every row on every render and the pace model about every row at every visit. Mirrors the rules the old
 * per-kind functions had, including the latches, the rank a switch kept, the origin's scaling and an untracked company
 * leaving the user gates open (docs/TREE.md).
 */
import { SKILL_TIERS, firstJobAtRank, highestJobRank } from "../../data/phases.ts"
import { formatNumber } from "../format.ts"
import { heldRank, leadOf, originOf, rowVisible, specOf, usersOf } from "../build.ts"
import { gigBoardXp, gigXpReq, jobBoardGigs, jobXpReq } from "../origin.ts"
import { NODE_MAP } from "./graph.ts"
import type { Check, Missing, Node, Ref, Req, TreeView } from "./types.ts"

const jobNameAtRank = (rank: number): string => firstJobAtRank(rank)?.name ?? `job ${rank}`

const owned = (map: Readonly<Record<string, number>> | undefined, id: number): number => {
  const value = map?.[String(id)]
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0
}

/** Same tolerance as `canAfford` in economy.ts, kept here so the tree reads nothing above the data layer. */
function reached(money: number, cost: number): boolean {
  if (!Number.isFinite(money) || !Number.isFinite(cost) || cost < 0) return false
  if (money >= cost) return true
  return cost - money <= Math.max(1, Math.abs(cost)) * 1e-8
}

const anyOwned = (map: Readonly<Record<string, number>> | undefined): boolean => (map ? Object.values(map).some((count) => count > 0) : false)

const SKILL_TAGS = new Map(SKILL_TIERS.map((row) => [row.id, row.tags]))

/** The XP a leaf asks for under the career's origin. */
export function xpNeeded(req: Extract<Req, { t: "xp" }>, p: Pick<TreeView, "build">): number {
  const origin = originOf(p)
  if (req.mod === "gig") return gigXpReq(origin, { xpReq: req.min })
  if (req.mod === "job") return jobXpReq(origin, { xpReq: req.min, rank: req.rank ?? 0 })
  if (req.mod === "gigBoard") return gigBoardXp(origin)
  return req.min
}

/** Gigs or jobs a count leaf asks for under the career's origin. */
export const countNeeded = (req: Extract<Req, { t: "count" }>, p: Pick<TreeView, "build">): number => (req.mod === "jobBoard" ? jobBoardGigs(originOf(p)) : req.min)

/** Whether a requirement holds. */
export function holds(req: Req, p: TreeView): boolean {
  switch (req.t) {
    case "xp":
      return p.xpTotal >= xpNeeded(req, p)
    case "owns":
      return req.kind === "skill" ? req.ids.every((id) => owned(p.skills, id) > 0) : req.ids.every((id) => p.gold?.includes(id) === true)
    case "has":
      return req.kind === "gig" ? p.gigs.length > 0 : req.kind === "job" ? p.jobs.length > 0 : req.kind === "capital" ? anyOwned(p.owned) : anyOwned(p.equipment)
    case "count":
      return (req.of === "gigs" ? p.gigs.length : p.jobs.length) >= countNeeded(req, p)
    case "tag": {
      let have = 0
      for (const [id, tags] of SKILL_TAGS) if (owned(p.skills, id) > 0 && tags.includes(req.tag)) have += 1
      return have >= req.min
    }
    case "rank":
      return heldRank(p) >= req.min
    case "users": {
      const users = usersOf(p)
      return users === null || users >= req.min
    }
    case "money":
      return reached(p.peakMoney, req.peak)
    case "track":
      return rowVisible({ spec: req.spec, lead: req.lead } as Parameters<typeof rowVisible>[0], specOf(p), leadOf(p))
    case "picked":
      return req.of === "spec" ? specOf(p) !== null : leadOf(p) !== null
    case "met": {
      const node = NODE_MAP.get(req.ref)
      return node ? holds(node.requires, p) : false
    }
    case "all":
      return req.of.every((child) => holds(child, p))
    case "any":
      return req.of.some((child) => holds(child, p))
  }
}

/** The first unmet leaf of a requirement, in the order it is written; an `any` that fails is returned whole. Null when it holds. */
export function firstFail(req: Req, p: TreeView): Req | null {
  if (req.t === "all") {
    for (const child of req.of) {
      const fail = firstFail(child, p)
      if (fail) return fail
    }
    return null
  }
  return holds(req, p) ? null : req
}

function collect(req: Req, p: TreeView, into: Missing[]): void {
  if (req.t === "all") {
    for (const child of req.of) collect(child, p, into)
    return
  }
  if (!holds(req, p)) into.push({ req, text: describe(req, p) })
}

/** The skills of a list the career does not own yet, said in a few words: one or two by name, more as a count. Null when it owns them all. */
export function skillGapText(ids: readonly number[], skills: Readonly<Record<string, number>>): string | null {
  const missing = ids.filter((id) => owned(skills, id) === 0)
  if (missing.length === 0) return null
  if (missing.length <= 2) return missing.map((id) => SKILL_NAMES.get(id) ?? `skill ${id}`).join(" + ")
  return `${missing.length} skills`
}

const SKILL_NAMES = new Map(SKILL_TIERS.map((row) => [row.id, row.name]))

/** Words for one leaf, with what the career has when it is given a view. A leaf with its own `label` says that. */
export function describe(req: Req, p?: TreeView): string {
  if (req.label) return req.label
  switch (req.t) {
    case "xp": {
      const need = p ? xpNeeded(req, p) : req.min
      return `${formatNumber(need)} lifetime XP${p ? ` (${formatNumber(Math.floor(p.xpTotal))})` : ""}`
    }
    case "owns":
      return req.kind === "skill" ? `Own ${req.ids.length === 1 ? (SKILL_NAMES.get(req.ids[0]!) ?? `skill ${req.ids[0]}`) : `${req.ids.length} skills`}` : `Own ${req.ids.length} earlier perk${req.ids.length === 1 ? "" : "s"}`
    case "has":
      return `Own a ${req.kind} row`
    case "count": {
      const need = p ? countNeeded(req, p) : req.min
      return `${need} ${req.of === "gigs" ? "gigs cleared" : "jobs held"}${p ? ` (${req.of === "gigs" ? p.gigs.length : p.jobs.length})` : ""}`
    }
    case "tag":
      return `${req.min} ${req.tag} skill${req.min === 1 ? "" : "s"}`
    case "rank":
      return `A job of rank ${req.min}`
    case "users":
      return `${formatNumber(req.min)} users`
    case "money":
      return `Hold $${formatNumber(req.peak)} at once`
    case "track":
      return "On your own track"
    case "picked":
      return req.of === "spec" ? "Pick a specialization" : "Pick a leadership line"
    case "met":
      return `${NODE_MAP.get(req.ref)?.name ?? req.ref} open`
    case "all":
      return req.of.map((child) => describe(child, p)).join(", ")
    case "any":
      return req.of.map((child) => describe(child, p)).join(" or ")
  }
}

/**
 * The phrase the "Next" banner uses for a leaf that does not hold: "more XP", "more gigs", "a bigger balance", the skills
 * still missing, the job that is needed. Short on purpose (the shop's lock panels use `describe`, which has the numbers).
 */
export function short(req: Req, p: TreeView): string {
  switch (req.t) {
    case "xp":
      return "more XP"
    case "owns":
      if (req.kind === "skill") return req.ids.length === 1 ? describe(req) : (skillGapText(req.ids, p.skills) ?? "")
      return "an earlier perk"
    case "count":
      return req.of === "gigs" ? "more gigs" : "more jobs"
    case "money":
      return "a bigger balance"
    case "rank":
      return jobNameAtRank(req.min)
    case "users":
      return `${formatNumber(req.min)} users`
    default:
      return describe(req, p)
  }
}

/** The leaves a career meets to open a node for the first time, without the latch that keeps it open once held. */
export type EntryLine = { req: Req; text: string; met: boolean }

/**
 * What a board asks, as the lock panel lists it: the entering leaves, in order, each with what the career has and
 * whether it holds. The latch (`has`: owning what the gate leads to) is not listed. When the entering branch is a choice
 * of alternatives (the capital: a senior job, or money held) they come back as separate lines with `either` set.
 */
export function entry(ref: Ref, p: TreeView): { lines: EntryLine[]; either: boolean } {
  const node = NODE_MAP.get(ref)
  if (!node) return { lines: [], either: false }
  const leaves = (req: Req): Req[] => (req.t === "all" ? req.of.flatMap(leaves) : [req])
  const top = node.requires
  const branches = top.t === "any" ? top.of.filter((child) => child.t !== "has") : [top]
  const alternatives = branches.length > 1
  const reqs = alternatives ? branches : branches.flatMap(leaves)
  return { lines: reqs.map((req) => ({ req, text: describe(req, p), met: holds(req, p) })), either: alternatives }
}

/** What a board still asks, as banner phrases: the unmet entering leaves (not the latch). */
export function entryPhrases(ref: Ref, p: TreeView): string[] {
  return entry(ref, p).lines.filter((line) => !line.met).map((line) => short(line.req, p))
}

/** The node's own unmet leaves as banner phrases, skipping the kinds the caller handles itself. */
export function neededPhrases(ref: Ref, p: TreeView, skip: readonly Req["t"][] = ["met", "track", "picked"]): string[] {
  const out: string[] = []
  for (const miss of check(ref, p).missing) if (!skip.includes(miss.req.t)) out.push(short(miss.req, p))
  return out
}

/** The node's gate, leaf by leaf. */
export function check(ref: Ref, p: TreeView): Check {
  const node = NODE_MAP.get(ref)
  if (!node) return { met: false, missing: [{ req: { t: "all", of: [] }, text: `Unknown row ${ref}` }] }
  const missing: Missing[] = []
  collect(node.requires, p, missing)
  return { met: missing.length === 0, missing }
}

/** The gate for showing the row in the shop. */
export function revealed(node: Node, p: TreeView): boolean {
  return holds(node.reveal ?? node.requires, p)
}

/** Whether the career holds the row now (for the rows bought once: a gig done, a job held, a perk owned, a pick made). */
export function isOwned(ref: Ref, p: TreeView): boolean {
  const node = NODE_MAP.get(ref)
  if (!node) return false
  switch (node.kind) {
    case "skill":
      return owned(p.skills, node.id as number) > 0
    case "gig":
      return p.gigs.includes(node.id as number)
    case "job":
      return p.jobs.includes(node.id as number)
    case "gear":
      return owned(p.equipment, node.id as number) > 0
    case "capital":
      return owned(p.owned, node.id as number) > 0
    case "gold":
      return p.gold?.includes(node.id as number) === true
    case "pick":
      return node.id === "spec" ? specOf(p) !== null : leadOf(p) !== null
    case "board":
      return false
  }
}

/** How high the career's best job reaches, for the tree's own use in traversals that need a rank. */
export const jobRankOf = (p: TreeView): number => highestJobRank(p.jobs)
