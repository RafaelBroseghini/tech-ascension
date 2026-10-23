/**
 * The structure of the progression tree, written by hand: which gig follows which, which skills a gig demands, and which
 * jobs make up each track and what each track hangs off. Content (names, payouts, XP, prices, art) stays on the rows in
 * `phases.ts`, `gear.ts` and `capital.ts`; this file says only how they connect, so a path is added or changed here
 * and nowhere else (docs/TREE.md). The tree (`src/game/tree/graph.ts`) and the tables both read it. Rows are named
 * by their own ids; `tree.test.ts` checks every one exists, appears once, and agrees with its row's `spec`, `lead` and `rank`.
 */
import type { LeadId } from "./leadership.ts"
import type { SpecId } from "./specializations.ts"

/** A run of skill ids, first to last inclusive. */
const skills = (first: number, last: number): readonly number[] => Array.from({ length: last - first + 1 }, (_, index) => first + index)

export type GigStep = {
  id: number
  /** Every skill the gig demands. */
  skills: readonly number[]
}

/**
 * The gigs, in order. This path is strict: each gig sits under the one before it and needs every earlier gig cleared.
 * Gig 1 needs the first six skills, and each later gig adds the next skill.
 */
export const GIG_PATH: readonly GigStep[] = [
    { id: 1, skills: skills(1, 6) },
    { id: 2, skills: skills(1, 7) },
    { id: 3, skills: skills(1, 8) },
    { id: 4, skills: skills(1, 9) },
    { id: 5, skills: skills(1, 10) },
    { id: 6, skills: skills(1, 11) },
    { id: 7, skills: skills(1, 12) },
    { id: 8, skills: skills(1, 13) },
    { id: 9, skills: skills(1, 14) },
    { id: 10, skills: skills(1, 15) },
    { id: 11, skills: skills(1, 16) },
    { id: 12, skills: skills(1, 17) },
    { id: 13, skills: skills(1, 18) },
    { id: 14, skills: skills(1, 19) },
    { id: 15, skills: skills(1, 20) },
    { id: 16, skills: skills(1, 21) },
    { id: 17, skills: skills(1, 22) },
    { id: 18, skills: skills(1, 23) },
    { id: 19, skills: skills(1, 24) },
    { id: 20, skills: skills(1, 25) },
    { id: 21, skills: skills(1, 26) },
    { id: 22, skills: skills(1, 27) },
    { id: 23, skills: skills(1, 28) },
    { id: 24, skills: skills(1, 29) },
    { id: 25, skills: skills(1, 30) },
    { id: 26, skills: skills(1, 31) },
    { id: 27, skills: skills(1, 32) },
    { id: 28, skills: skills(1, 33) },
    { id: 29, skills: skills(1, 34) },
    { id: 30, skills: skills(1, 35) },
    { id: 31, skills: skills(1, 36) },
    { id: 32, skills: skills(1, 37) },
    { id: 33, skills: skills(1, 38) },
    { id: 34, skills: skills(1, 39) },
    { id: 35, skills: skills(1, 40) },
    { id: 36, skills: skills(1, 41) },
    { id: 37, skills: skills(1, 42) },
    { id: 38, skills: skills(1, 43) },
    { id: 39, skills: skills(1, 44) },
    { id: 40, skills: skills(1, 45) },
    { id: 41, skills: skills(1, 46) },
    { id: 42, skills: skills(1, 47) },
    { id: 43, skills: skills(1, 48) },
    { id: 44, skills: skills(1, 49) },
    { id: 45, skills: skills(1, 50) },
    { id: 46, skills: skills(1, 51) },
    { id: 47, skills: skills(1, 52) },
    { id: 48, skills: skills(1, 53) },
    { id: 49, skills: skills(1, 54) },
    { id: 50, skills: skills(1, 55) },
    { id: 51, skills: skills(1, 56) },
    { id: 52, skills: skills(1, 57) },
    { id: 53, skills: skills(1, 58) },
    { id: 54, skills: skills(1, 59) },
    { id: 55, skills: skills(1, 60) },
    { id: 56, skills: skills(1, 61) },
    { id: 57, skills: skills(1, 62) },
    { id: 58, skills: skills(1, 63) },
    { id: 59, skills: skills(1, 64) },
    { id: 60, skills: skills(1, 65) },
    { id: 61, skills: skills(1, 66) },
    { id: 62, skills: skills(1, 67) },
    { id: 63, skills: skills(1, 68) },
    { id: 64, skills: skills(1, 69) },
    { id: 65, skills: skills(1, 70) },
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
