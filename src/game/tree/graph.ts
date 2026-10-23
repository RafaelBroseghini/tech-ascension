/**
 * The tree built from the game's tables, once. This is where today's id conventions are decoded into explicit edges:
 * a gig's place in the chain, a job's track and its gates, gear's money and rank, capital's price and board. Everything
 * after this file (the evaluator, the shop's gates, the pace model, `npm run tree`) reads the nodes and never the ids.
 * docs/TREE.md says how to add a branch.
 */
import { CAPITAL } from "../../data/capital.ts"
import { CAPITAL_UNLOCK, EQUIPMENT, GEAR_TAB_UNLOCK, GIG_BOARD_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, SKILL_TIERS } from "../../data/phases.ts"
import { GOLD_SKILLS } from "../../data/gold.ts"
import { LEAD_NEEDED_ABOVE_RANK, LEAD_OPEN_RANK } from "../../data/leadership.ts"
import { PICK_USERS, SENIOR_USERS, TRUNK_TOP_RANK } from "../../data/specializations.ts"
import { GIG_PATH, JOB_PATHS } from "../../data/tree.ts"
import type { Node, Ref, Req, Track } from "./types.ts"

const NODES = new Map<Ref, Node>()
const TRACKS: Track[] = []
const AFTER = new Map<Ref, Ref[]>()

const all = (...of: Req[]): Req => ({ t: "all", of })
const any = (...of: Req[]): Req => ({ t: "any", of })

function add(node: Node): void {
  NODES.set(node.ref, node)
  if (node.after) AFTER.set(node.after, [...(AFTER.get(node.after) ?? []), node.ref])
}

/** Adds a track's nodes in order, each sitting under the one before it (the first under `under`, when given). */
function track(id: string, label: string, strict: boolean, rows: readonly Omit<Node, "track" | "index" | "after">[], under?: Ref): void {
  let before = under
  rows.forEach((row, index) => {
    add({ ...row, track: id, index, ...(before ? { after: before } : {}) })
    before = row.ref
  })
  TRACKS.push({ id, label, strict, nodes: rows.map((row) => row.ref) })
}

// Boards: the gates that open a whole shop tab. Each latches: holding a row it leads to keeps it open.
track(
  "boards",
  "Boards",
  false,
  [
    {
      ref: "board:gear",
      kind: "board",
      id: "gear",
      name: "Gear tab",
      requires: any({ t: "xp", min: GEAR_TAB_UNLOCK.minXp }, { t: "has", kind: "gear" }),
    },
    {
      ref: "board:gigs",
      kind: "board",
      id: "gigs",
      name: "Gig Board",
      requires: any({ t: "has", kind: "gig" }, all({ t: "xp", min: GIG_BOARD_UNLOCK.minXp, mod: "gigBoard" }, { t: "owns", kind: "skill", ids: GIG_BOARD_UNLOCK.requireOwnedSkills })),
    },
    {
      ref: "board:jobs",
      kind: "board",
      id: "jobs",
      name: "Job Board",
      requires: any({ t: "has", kind: "job" }, all({ t: "xp", min: JOB_BOARD_UNLOCK.minXp }, { t: "count", of: "gigs", min: JOB_BOARD_UNLOCK.minGigsCompleted, mod: "jobBoard" })),
    },
    {
      ref: "board:capital",
      kind: "board",
      id: "capital",
      name: "Capital",
      requires: any({ t: "rank", min: CAPITAL_UNLOCK.minJobRank }, { t: "money", peak: CAPITAL_UNLOCK.minMoney }, { t: "has", kind: "capital" }),
    },
  ],
)

// Skills: lifetime XP opens each row. Order is the grind's, not a gate.
track(
  "skills",
  "Skills",
  false,
  SKILL_TIERS.map((row) => ({ ref: `skill:${row.id}` as Ref, kind: "skill" as const, id: row.id, name: row.name, requires: { t: "xp", min: row.unlockAtXp } as Req })),
)

// Gigs: a strict chain, in the order `GIG_PATH` (src/data/tree.ts) lists them. Each needs the board, the XP, every gig
// before it cleared and the skills the path names.
track(
  "gigs",
  "Gigs",
  true,
  GIG_PATH.map((step, index) => {
    const gig = GIGS.find((row) => row.id === step.id)!
    return {
      ref: `gig:${gig.id}` as Ref,
      kind: "gig" as const,
      id: gig.id,
      name: gig.name,
      requires: all(
        { t: "met", ref: "board:gigs" },
        { t: "xp", min: gig.xpReq, mod: "gig" },
        { t: "count", of: "gigs", min: index },
        { t: "owns", kind: "skill", ids: step.skills },
      ),
    } as Omit<Node, "track" | "index" | "after">
  }),
)

// Picks: the specialization once a Mid-level job is held (and the product has its users), the leadership line at Senior.
track(
  "picks",
  "Picks",
  false,
  [
    {
      ref: "pick:spec",
      kind: "pick",
      id: "spec",
      name: "Specialization",
      requires: all({ t: "rank", min: TRUNK_TOP_RANK }, any({ t: "rank", min: TRUNK_TOP_RANK + 1 }, { t: "users", min: PICK_USERS })),
    },
    { ref: "pick:lead", kind: "pick", id: "lead", name: "Leadership line", requires: { t: "rank", min: LEAD_OPEN_RANK } },
  ],
)

/** The gate every job shares, in the order the shop reads them: the board, the track, the picks, the XP, the users. */
function jobGate(job: (typeof JOB_TIERS)[number]): Req {
  return all(
    { t: "met", ref: "board:jobs" },
    { t: "track", ...(job.spec ? { spec: job.spec } : {}), ...(job.lead ? { lead: job.lead } : {}) },
    ...(job.rank > TRUNK_TOP_RANK ? [{ t: "picked", of: "spec" } as Req] : []),
    ...(job.rank > LEAD_NEEDED_ABOVE_RANK ? [{ t: "picked", of: "lead" } as Req] : []),
    { t: "xp", min: job.xpReq, mod: "job", rank: job.rank },
    ...(job.rank === LEAD_OPEN_RANK ? [any({ t: "rank", min: LEAD_OPEN_RANK }, { t: "users", min: SENIOR_USERS })] : []),
  )
}

const jobNode = (job: (typeof JOB_TIERS)[number]) => ({ ref: `job:${job.id}` as Ref, kind: "job" as const, id: job.id, name: job.name, requires: jobGate(job) })

// Jobs: loose ladders (lifetime XP orders them, nothing demands the row before), one track for each entry of
// `JOB_PATHS` (src/data/tree.ts): the trunk, a track for each specialization, one for each leadership line, and the
// rows both lines share. A track hangs off the trunk's last row or off the leadership pick, as the path says.
const jobById = new Map(JOB_TIERS.map((job) => [job.id, job]))
for (const path of JOB_PATHS) {
  const rows = path.jobs.map((id) => {
    const job = jobById.get(id)
    if (!job) throw new Error(`job ${id} on path ${path.id} does not exist`)
    return job
  })
  const trunkTop: Ref | undefined = path.under === "trunk" ? `job:${JOB_PATHS[0]!.jobs[JOB_PATHS[0]!.jobs.length - 1]}` : path.under
  track(`jobs:${path.id}`, `Jobs: ${path.id}`, false, rows.map(jobNode), trunkTop)
}

// Gear: the Gear tab, then the money held once and the rank held. Loose, by section.
for (const kind of [...new Set(EQUIPMENT.map((row) => row.kind))]) {
  track(
    `gear:${kind}`,
    `Gear: ${kind}`,
    false,
    EQUIPMENT.filter((row) => row.kind === kind).map((row) => {
      const reveal = all({ t: "money", peak: row.unlockMoney }, ...(row.unlockJobRank > 0 ? [{ t: "rank", min: row.unlockJobRank } as Req] : []))
      return { ref: `gear:${row.id}` as Ref, kind: "gear" as const, id: row.id, name: row.name, requires: all({ t: "met", ref: "board:gear" }, reveal), reveal }
    }),
  )
}

// Capital: Senior or $500,000 opens the tab; a row shows once its price has been held.
track(
  "capital",
  "Capital",
  false,
  CAPITAL.map((row) => {
    const reveal: Req = { t: "money", peak: row.baseCost }
    return { ref: `capital:${row.id}` as Ref, kind: "capital" as const, id: row.id, name: row.name, requires: all({ t: "met", ref: "board:capital" }, reveal), reveal }
  }),
)

// 10x dev perks: a chain inside each family (the next one only), each on its XP and, for hover clicking, a rank.
for (const family of [...new Set(GOLD_SKILLS.map((row) => row.family))]) {
  const rows = GOLD_SKILLS.filter((row) => row.family === family)
  track(
    `gold:${family}`,
    `10x dev: ${family}`,
    true,
    rows.map((row, index) => {
      const reveal = all({ t: "xp", min: row.unlockXp }, ...(row.unlockJobRank ? [{ t: "rank", min: row.unlockJobRank } as Req] : []))
      const earlier = rows.slice(0, index).map((other) => other.id)
      return { ref: `gold:${row.id}` as Ref, kind: "gold" as const, id: row.id, name: row.name, requires: earlier.length > 0 ? all({ t: "owns", kind: "gold", ids: earlier }, reveal) : reveal, reveal }
    }),
  )
}

/** Every node, by address. */
export const NODE_MAP: ReadonlyMap<Ref, Node> = NODES

/** Every track, in the order they were declared. */
export const TRACK_LIST: readonly Track[] = TRACKS

/** The rows that sit directly under a node (the next in its track, or a track that hangs off it). */
export const childrenOf = (ref: Ref): readonly Ref[] => AFTER.get(ref) ?? []

export const nodeOf = (ref: Ref): Node | undefined => NODES.get(ref)
