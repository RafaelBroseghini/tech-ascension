/**
 * The structure of the progression tree, written by hand: which skills (by tag) each gig demands, and which
 * jobs make up each track and what each track hangs off. Content (names, payouts, XP, prices, art) stays on the rows in
 * `phases.ts`, `gear.ts` and `capital.ts`; this file says only how they connect, so a path is added or changed here
 * and nowhere else (docs/TREE.md). The tree (`src/game/tree/graph.ts`) and the tables both read it. Rows are named
 * by their own ids; `tree.test.ts` checks every one exists, appears once, and agrees with its row's `spec`, `lead` and `rank`.
 */
import type { LeadId } from "./leadership.ts"
import type { SpecId } from "./specializations.ts"
import type { Tag } from "./tags.ts"

export type GigStep = {
  id: number
  /** The owned skills of each tag the gig demands. Its tags are the gig's own (`phases.ts`); the counts are written here. */
  needs: readonly { tag: Tag; min: number }[]
}

/**
 * The gigs, in the order the board lists them. Nothing here is a chain: a gig is open when the career has the XP and
 * enough owned skills of each tag the gig is about, so two careers that learned different skills meet different
 * clients. Each count is half of what the old skill-prefix held of that tag (rounded up), at least one, and never
 * more than the catalog has. Specialization and origin lower them further (`gigTagMin` in src/game/origin.ts).
 */
export const GIG_PATH: readonly GigStep[] = [
  { id: 1, needs: [{ tag: "backend", min: 1 }, { tag: "frontend", min: 1 }] },
  { id: 2, needs: [{ tag: "frontend", min: 1 }, { tag: "product", min: 3 }] },
  { id: 3, needs: [{ tag: "frontend", min: 1 }] },
  { id: 4, needs: [{ tag: "backend", min: 1 }, { tag: "frontend", min: 1 }] },
  { id: 5, needs: [{ tag: "backend", min: 1 }] },
  { id: 6, needs: [{ tag: "backend", min: 1 }, { tag: "frontend", min: 1 }] },
  { id: 7, needs: [{ tag: "frontend", min: 1 }, { tag: "product", min: 3 }] },
  { id: 8, needs: [{ tag: "frontend", min: 1 }, { tag: "product", min: 3 }] },
  { id: 9, needs: [{ tag: "frontend", min: 2 }, { tag: "product", min: 3 }] },
  { id: 10, needs: [{ tag: "product", min: 3 }] },
  { id: 11, needs: [{ tag: "frontend", min: 3 }] },
  { id: 12, needs: [{ tag: "product", min: 3 }] },
  { id: 13, needs: [{ tag: "backend", min: 2 }, { tag: "frontend", min: 3 }] },
  { id: 14, needs: [{ tag: "backend", min: 2 }, { tag: "product", min: 4 }] },
  { id: 15, needs: [{ tag: "frontend", min: 4 }, { tag: "infra", min: 3 }] },
  { id: 16, needs: [{ tag: "frontend", min: 4 }] },
  { id: 17, needs: [{ tag: "product", min: 4 }, { tag: "backend", min: 2 }] },
  { id: 18, needs: [{ tag: "data", min: 1 }] },
  { id: 19, needs: [{ tag: "infra", min: 3 }] },
  { id: 20, needs: [{ tag: "frontend", min: 6 }] },
  { id: 21, needs: [{ tag: "security", min: 1 }, { tag: "backend", min: 3 }] },
  { id: 22, needs: [{ tag: "infra", min: 3 }] },
  { id: 23, needs: [{ tag: "frontend", min: 6 }, { tag: "product", min: 5 }] },
  { id: 24, needs: [{ tag: "frontend", min: 6 }, { tag: "data", min: 1 }] },
  { id: 25, needs: [{ tag: "backend", min: 4 }] },
  { id: 26, needs: [{ tag: "data", min: 2 }, { tag: "backend", min: 4 }] },
  { id: 27, needs: [{ tag: "ai", min: 1 }, { tag: "product", min: 5 }] },
  { id: 28, needs: [{ tag: "frontend", min: 6 }, { tag: "product", min: 5 }] },
  { id: 29, needs: [{ tag: "backend", min: 6 }, { tag: "product", min: 5 }] },
  { id: 30, needs: [{ tag: "data", min: 2 }] },
  { id: 31, needs: [{ tag: "infra", min: 4 }, { tag: "backend", min: 6 }] },
  { id: 32, needs: [{ tag: "backend", min: 7 }, { tag: "security", min: 1 }] },
  { id: 33, needs: [{ tag: "product", min: 5 }] },
  { id: 34, needs: [{ tag: "frontend", min: 7 }] },
  { id: 35, needs: [{ tag: "infra", min: 4 }, { tag: "backend", min: 7 }] },
  { id: 36, needs: [{ tag: "backend", min: 8 }, { tag: "frontend", min: 7 }] },
  { id: 37, needs: [{ tag: "backend", min: 8 }, { tag: "product", min: 6 }] },
  { id: 38, needs: [{ tag: "security", min: 1 }] },
  { id: 39, needs: [{ tag: "frontend", min: 8 }] },
  { id: 40, needs: [{ tag: "frontend", min: 9 }, { tag: "product", min: 6 }] },
  { id: 41, needs: [{ tag: "infra", min: 4 }, { tag: "product", min: 6 }] },
  { id: 42, needs: [{ tag: "infra", min: 4 }, { tag: "data", min: 5 }] },
  { id: 43, needs: [{ tag: "ai", min: 1 }, { tag: "backend", min: 9 }] },
  { id: 44, needs: [{ tag: "infra", min: 4 }] },
  { id: 45, needs: [{ tag: "product", min: 7 }, { tag: "backend", min: 9 }] },
  { id: 46, needs: [{ tag: "frontend", min: 10 }, { tag: "product", min: 8 }] },
  { id: 47, needs: [{ tag: "infra", min: 4 }, { tag: "frontend", min: 10 }] },
  { id: 48, needs: [{ tag: "product", min: 9 }] },
  { id: 49, needs: [{ tag: "infra", min: 5 }] },
  { id: 50, needs: [{ tag: "data", min: 5 }] },
  { id: 51, needs: [{ tag: "security", min: 1 }] },
  { id: 52, needs: [{ tag: "ai", min: 1 }, { tag: "hardware", min: 1 }] },
  { id: 53, needs: [{ tag: "frontend", min: 10 }] },
  { id: 54, needs: [{ tag: "ai", min: 1 }] },
  { id: 55, needs: [{ tag: "infra", min: 7 }] },
  { id: 56, needs: [{ tag: "infra", min: 7 }, { tag: "backend", min: 9 }] },
  { id: 57, needs: [{ tag: "product", min: 9 }, { tag: "security", min: 2 }] },
  { id: 58, needs: [{ tag: "product", min: 10 }] },
  { id: 59, needs: [{ tag: "hardware", min: 1 }] },
  { id: 60, needs: [{ tag: "product", min: 11 }] },
  { id: 61, needs: [{ tag: "product", min: 11 }] },
  { id: 62, needs: [{ tag: "hardware", min: 1 }, { tag: "infra", min: 8 }] },
  { id: 63, needs: [{ tag: "hardware", min: 1 }] },
  { id: 64, needs: [{ tag: "infra", min: 9 }, { tag: "hardware", min: 1 }] },
  { id: 65, needs: [{ tag: "product", min: 11 }] },
]

export type JobPath = {
  /** The track's name: `trunk`, a specialization's id, a leadership line's id, or `shared`. */
  id: string
  /** What it hangs off: another track's last row (`trunk`), or the leadership pick. Left out for the trunk, which starts the ladder. */
  under?: "trunk" | "pick:lead"
  /** The specialization or the line the rows belong to (their rows carry the same field). Left out on the shared tracks. */
  spec?: SpecId
  lead?: LeadId
  /** The jobs, lowest rank first. Loose: nothing demands the row before, lifetime XP orders them. */
  jobs: readonly number[]
}

export const JOB_PATHS: readonly JobPath[] = [
  { id: "trunk", jobs: [1, 2, 3, 4, 5, 6, 7] },
  { id: "frontend", under: "trunk", spec: "frontend", jobs: [108, 109, 110, 111, 112, 113, 114, 115] },
  { id: "backend", under: "trunk", spec: "backend", jobs: [8, 9, 10, 11, 12, 13, 14, 15] },
  { id: "infra", under: "trunk", spec: "infra", jobs: [208, 209, 210, 211, 212, 213, 214, 215] },
  { id: "ai", under: "trunk", spec: "ai", jobs: [308, 309, 310, 311, 312, 313, 314, 315] },
  { id: "fde", under: "trunk", spec: "fde", jobs: [408, 409, 410, 411, 412, 413, 414, 415] },
  { id: "security", under: "trunk", spec: "security", jobs: [508, 509, 510, 511, 512, 513, 514, 515] },
  { id: "ic", under: "pick:lead", lead: "ic", jobs: [16, 17, 19, 23, 24] },
  { id: "manager", under: "pick:lead", lead: "manager", jobs: [18, 20, 21, 22] },
  { id: "shared", under: "pick:lead", jobs: [25, 26, 27, 28, 29, 30, 31] },
]
