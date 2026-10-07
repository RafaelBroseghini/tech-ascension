import type { ComponentKind } from "../../game/studio/types.ts"
import { GIG_BOARD_UNLOCK, GIGS, JOB_TIERS, SKILL_TIERS } from "../phases.ts"

/** The career step that puts a component on the whiteboard palette. */
export type CareerMoment =
  | { readonly kind: "skill"; readonly id: number }
  | { readonly kind: "gig"; readonly id: number }
  | { readonly kind: "job"; readonly id: number }

const STUDIO_OPENS: CareerMoment = { kind: "skill", id: 1 }

/** `null` is always on the board. */
export const UNLOCKS: Readonly<Record<ComponentKind, CareerMoment | null>> = {
  users: null,
  api: STUDIO_OPENS,
  sql: STUDIO_OPENS,
  lb: { kind: "gig", id: 1 },
  cache: { kind: "gig", id: 3 },
  replica: { kind: "job", id: 1 },
  standby: { kind: "job", id: 2 },
  cdn: { kind: "job", id: 2 },
  blob: { kind: "job", id: 2 },
  queue: { kind: "job", id: 6 },
  worker: { kind: "job", id: 6 },
  kv: { kind: "job", id: 14 },
  socket: { kind: "job", id: 14 },
  bouncer: { kind: "job", id: 16 },
  autoscaler: { kind: "job", id: 16 },
  breaker: { kind: "job", id: 18 },
  oncall: { kind: "job", id: 18 },
  // The plan put this on the capital upper era, which costs $102M and in every paced career arrives after the
  // 750,000 XP Global service interview that needs it.
  region: { kind: "job", id: 22 },
}

function row<T extends { id: number }>(rows: readonly T[], id: number): T {
  const found = rows.find((r) => r.id === id)
  if (!found) throw new Error(`unlocks.ts names id ${id}, which the career data does not have`)
  return found
}

/** The least lifetime XP a career has when the moment can first happen. */
export function momentXp(moment: CareerMoment): number {
  switch (moment.kind) {
    case "skill": {
      const skill = row(SKILL_TIERS, moment.id)
      return skill.unlockAtXp + (skill.firstXpCost ?? skill.baseXpCost)
    }
    case "gig":
      return Math.max(row(GIGS, moment.id).xpReq, GIG_BOARD_UNLOCK.minXp)
    case "job":
      return row(JOB_TIERS, moment.id).xpReq
  }
}

/**
 * Whether the kind is on the palette when the interview for `jobId` opens, which is when lifetime XP first reaches
 * that job's requirement. A moment at the same XP does not count, since the player may not have reached it yet.
 */
export function unlockedBeforeJob(kind: ComponentKind, jobId: number): boolean {
  const moment = UNLOCKS[kind]
  return moment === null || momentXp(moment) < row(JOB_TIERS, jobId).xpReq
}

export interface CareerSoFar {
  readonly skills: Readonly<Record<string, number>>
  readonly gigs: readonly number[]
  readonly jobs: readonly number[]
}

/** Whether this career has reached the kind's moment, for the palette. */
export function unlockedIn(kind: ComponentKind, career: CareerSoFar): boolean {
  const moment = UNLOCKS[kind]
  if (moment === null) return true
  switch (moment.kind) {
    case "skill":
      return (career.skills[String(moment.id)] ?? 0) > 0
    case "gig":
      return career.gigs.includes(moment.id)
    case "job":
      return career.jobs.includes(moment.id)
  }
}
