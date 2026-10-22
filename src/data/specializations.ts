import type { Tag } from "./tags.ts"

/**
 * The job ladder is a tree: a shared trunk up to Mid-level SWE (rank 7), then one track per specialization for ranks 8
 * to 15, then shared leadership rows again (ranks 16 to 31). A career picks one specialization once and does not see
 * the other tracks' rows. The rules are in src/game/build.ts; the track rows are in src/data/phases.ts.
 *
 * `style` is how the build earns: a click build pays most for manual clicks, an idle build pays most while away, a
 * balanced one is the plain ladder. The numbers behind it are in src/game/build.ts.
 */
export type SpecId = "frontend" | "backend" | "infra" | "ai" | "fde" | "security"

export type SpecStyle = "click" | "idle" | "balanced"

export type Specialization = {
  id: SpecId
  name: string
  /** What the track's rows are about. Every row in the track carries it. */
  tag: Tag
  style: SpecStyle
  blurb: string
}

export const SPECIALIZATIONS: readonly Specialization[] = [
  { id: "frontend", name: "Frontend", tag: "frontend", style: "click", blurb: "Ship the interface people touch." },
  { id: "backend", name: "Backend / Platform", tag: "backend", style: "balanced", blurb: "Own the services behind it." },
  { id: "infra", name: "Infra / SRE", tag: "infra", style: "idle", blurb: "Keep it up while everyone sleeps." },
  { id: "ai", name: "AI engineer", tag: "ai", style: "idle", blurb: "Wrangle models and agents." },
  { id: "fde", name: "Forward deployed engineer", tag: "product", style: "click", blurb: "Sit with the customer and ship what they asked for." },
  { id: "security", name: "Security", tag: "security", style: "balanced", blurb: "Find the holes before anyone else does." },
]

const BY_ID = new Map<SpecId, Specialization>(SPECIALIZATIONS.map((row) => [row.id, row]))

export function specById(id: SpecId): Specialization {
  return BY_ID.get(id) as Specialization
}

export function isSpecId(value: unknown): value is SpecId {
  return typeof value === "string" && BY_ID.has(value as SpecId)
}

/** The last rank every career shares. A job of this rank opens the pick. */
export const TRUNK_TOP_RANK = 7
/** The ranks a specialization has its own rows for. */
export const TRACK_FIRST_RANK = 8
export const TRACK_LAST_RANK = 15

/**
 * Where a track's job ids start. Backend keeps ids 8 to 15 (so old saves keep their meaning); the others sit at
 * `100 * k + rank`. A track row's id mod 100 is its rank.
 */
export const SPEC_ID_BASE: Readonly<Record<SpecId, number>> = {
  backend: 0,
  frontend: 100,
  infra: 200,
  ai: 300,
  fde: 400,
  security: 500,
}
