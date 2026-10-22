/**
 * After Senior the ladder forks once more: a career leads as an individual contributor or as a manager. The pick is
 * made once and is locked. The rules are in src/game/build.ts; the tagged job rows are in src/data/phases.ts.
 *
 * `ending` is how a career on this line wins the world: the IC wins on nights and weekends, the manager through the
 * team. Hiring belongs to the Manager line (see `rank` on the rows in src/game/globe/hires.ts).
 */
export type LeadId = "ic" | "manager"

export type Leadership = {
  id: LeadId
  name: string
  blurb: string
  /** The ending a win on this line reads as. The same ids as `Ending` in src/game/globe/hires.ts. */
  ending: "nightOwl" | "sponsor"
}

export const LEADERSHIP: readonly Leadership[] = [
  { id: "ic", name: "Individual contributor", blurb: "Stay on the keyboard. Staff, Principal, Fellow.", ending: "nightOwl" },
  { id: "manager", name: "Manager", blurb: "Lead the people. Manager, Director, CTO, and the hires.", ending: "sponsor" },
]

const BY_ID = new Map<LeadId, Leadership>(LEADERSHIP.map((row) => [row.id, row]))

export function leadById(id: LeadId): Leadership {
  return BY_ID.get(id) as Leadership
}

export function isLeadId(value: unknown): value is LeadId {
  return typeof value === "string" && BY_ID.has(value as LeadId)
}

/** The rank of a Senior job. Holding one opens the pick. */
export const LEAD_OPEN_RANK = 14
/** Every job above this rank needs a picked line. Rank 15 stays in the specialization tracks. */
export const LEAD_NEEDED_ABOVE_RANK = 15
