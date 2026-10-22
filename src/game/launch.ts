/**
 * Frontend's launches: a consumer app grows by shipping. Every manual click on the Frontend build charges a launch, and
 * each `LAUNCH_CLICKS` clicks ship one: a burst of new users, a share of the crowd the product has (never fewer than
 * `LAUNCH_MIN_USERS`), spread over the regions it is in. Hover and auto clicks do not charge it, so the build pays for
 * being at the desk. A launch only brings the users the serving gear can take (`room`): shipping past the capacity would
 * only drop them, so it waits on gear, which keeps a click build from bleeding money on requests it cannot serve. It also
 * never crosses a milestone itself (a million users, the win): the growth step does, so the milestone latches and is journaled.
 */
import { HOME_REGION_ID } from "../data/regions.ts"
import type { SpecId } from "../data/specializations.ts"
import type { CompanyState } from "./globe/growth.ts"
import { ceilingOf, MILESTONES, totalUsers } from "./globe/world.ts"

/** Manual clicks for one launch: about 12 seconds at 2 clicks a second. */
export const LAUNCH_CLICKS = 25
/** The share of the crowd one launch adds. */
export const LAUNCH_SHARE = 0.03
/** A launch adds at least this many users, so the first ones count. */
export const LAUNCH_MIN_USERS = 40

/** Whether a build ships launches. */
export const shipsLaunches = (spec: SpecId | null): boolean => spec === "frontend"

/** Users short of the next milestone (a million, the win...): a launch stops there, so the growth step crosses it and latches it, journal line and all. */
const beforeNextMark = (users: number): number => {
  const mark = MILESTONES.map((row) => row.users).filter((at) => at > users).sort((a, b) => a - b)[0]
  return mark === undefined ? Number.POSITIVE_INFINITY : Math.max(0, mark - users - 1)
}

/** Users one launch adds to a crowd of `users`. */
export const launchGain = (users: number): number => Math.max(LAUNCH_MIN_USERS, users * LAUNCH_SHARE)

export type LaunchStep = { company: CompanyState; charge: number; launches: number }

/**
 * `clicks` more manual clicks on `charge` clicks already banked: the launches they ship and the charge left over (below
 * `LAUNCH_CLICKS`). `room` is the most users the serving gear can take. Each launch grows every region that has users by its share (the home region alone when nobody has
 * joined yet), up to the region's ceiling. `clicks` may be fractional, for a model that clicks in a rate.
 */
export function shipLaunches(company: CompanyState, charge: number, clicks: number, room: number = Number.POSITIVE_INFINITY): LaunchStep {
  const total = Math.max(0, charge) + Math.max(0, clicks)
  const launches = Math.floor(total / LAUNCH_CLICKS)
  const left = total - launches * LAUNCH_CLICKS
  if (launches === 0) return { company, charge: left, launches: 0 }
  let users: Record<string, number> = { ...company.users }
  for (let i = 0; i < launches; i += 1) {
    const now = totalUsers(users)
    // Never past what the gear serves, and never negative when the crowd is already over it.
    const gain = Math.min(launchGain(now), Math.max(0, room - now), beforeNextMark(now))
    if (gain <= 0) break
    const next: Record<string, number> = { ...users }
    if (now <= 0) next[HOME_REGION_ID] = Math.min(ceilingOf(HOME_REGION_ID), gain)
    else for (const [region, here] of Object.entries(users)) next[region] = Math.min(ceilingOf(region), here + gain * (here / now))
    users = next
  }
  return { company: { ...company, users }, charge: left, launches }
}
