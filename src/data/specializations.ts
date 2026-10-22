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

/**
 * What a specialization does to the product, as factors on the plain ladder (1 changes nothing). `growth` scales how
 * fast users arrive, `revenue` what served users pay, `drops` what dropped requests cost (the dollars and the users
 * who leave), `incidents` how often the world throws one and how hard a block or a law bleeds, `seeds` the users each
 * cleared gig lands in its region.
 */
export type ProductEffects = { growth: number; revenue: number; drops: number; incidents: number; seeds: number }

/**
 * An AI product's growth needs GPUs: its growth runs at `base` with none, and climbs towards `base + bonus` as GPU gear
 * is bought, closing 63% of the gap at `scale` copies (the same curve the hires use).
 */
export type GpuGrowth = { base: number; bonus: number; scale: number }

export const NO_EFFECTS: ProductEffects = { growth: 1, revenue: 1, drops: 1, incidents: 1, seeds: 1 }

export type Specialization = {
  id: SpecId
  name: string
  /** What the track's rows are about. Every row in the track carries it. */
  tag: Tag
  style: SpecStyle
  blurb: string
  /** What the build does to the product; left out, nothing (Frontend's launches are their own mechanic, `src/game/launch.ts`). */
  product?: Partial<ProductEffects>
  /** AI only: growth that depends on the GPUs owned. */
  gpuGrowth?: GpuGrowth
}

export const SPECIALIZATIONS: readonly Specialization[] = [
  { id: "frontend", name: "Frontend", tag: "frontend", style: "click", blurb: "Ship the interface people touch. Clicks ship launches." },
  { id: "backend", name: "Backend / Platform", tag: "backend", style: "balanced", blurb: "Own the services behind it.", product: { growth: 0.85, revenue: 1.3 } },
  { id: "infra", name: "Infra / SRE", tag: "infra", style: "idle", blurb: "Keep it up while everyone sleeps.", product: { drops: 0.5 } },
  { id: "ai", name: "AI engineer", tag: "ai", style: "idle", blurb: "Wrangle models and agents. Growth needs GPUs.", gpuGrowth: { base: 0.6, bonus: 0.9, scale: 12 } },
  { id: "fde", name: "Forward deployed engineer", tag: "product", style: "click", blurb: "Sit with the customer and ship what they asked for.", product: { growth: 0.9, seeds: 3 } },
  { id: "security", name: "Security", tag: "security", style: "balanced", blurb: "Find the holes before anyone else does.", product: { incidents: 0.6 } },
]

const BY_ID = new Map<SpecId, Specialization>(SPECIALIZATIONS.map((row) => [row.id, row]))

export function specById(id: SpecId): Specialization {
  return BY_ID.get(id) as Specialization
}

/** The growth factor an AI build's GPUs give: `base` with none, towards `base + bonus` with many. 1 for any other build. */
export function gpuGrowthOf(spec: SpecId | null, gpus: number): number {
  const row = spec ? specById(spec).gpuGrowth : undefined
  return row ? row.base + row.bonus * (1 - Math.exp(-Math.max(0, gpus) / row.scale)) : 1
}

/** The product effects of a build; every factor is 1 before the pick. */
export const effectsOf = (spec: SpecId | null): ProductEffects => ({ ...NO_EFFECTS, ...(spec ? specById(spec).product : undefined) })

export function isSpecId(value: unknown): value is SpecId {
  return typeof value === "string" && BY_ID.has(value as SpecId)
}

/** Users the product needs before the specialization pick opens, and before the Senior job can be taken (docs/BUILDS.md). */
export const PICK_USERS = 10_000
export const SENIOR_USERS = 1_000_000

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
