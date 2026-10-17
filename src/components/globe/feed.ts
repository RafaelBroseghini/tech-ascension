import { INCIDENTS, MILESTONES, regionName, totalUsers, WORLD_TARGET } from "../../game/globe/world.ts"
import type { Company } from "../../game/globe/company.ts"
import type { HealthChar } from "../../game/globe/load.ts"

/** What the feed reads of the company at one moment: just enough to tell what changed between two of them. */
export type FeedFacts = Pick<Company, "regionUsers" | "incidents" | "health" | "won">

/** bad: something to act on. good: it is over, or you won. info: the world moved. */
export type FeedTone = "bad" | "good" | "info"

export interface FeedItem {
  /** Repeats of one key inside `FEED_COOLDOWN_MS` are dropped, so a flapping health bar says its piece once. */
  readonly key: string
  readonly tone: FeedTone
  readonly text: string
}

/** The most items waiting to show. A burst keeps the newest. */
export const FEED_MAX = 3
/** How long one item stays up. */
export const FEED_SHOW_MS = 4500
export const FEED_COOLDOWN_MS = 30_000

const dropping = (health: HealthChar): boolean => health === "p" || health === "m"

/**
 * The few things worth saying between two moments, oldest first: an incident that started or ended, a region's first users,
 * a milestone crossed, serving that began to drop requests (or stopped), the win. Never the user count itself: that moves every tick.
 */
export function feedItems(prev: FeedFacts, next: FeedFacts): FeedItem[] {
  const items: FeedItem[] = []
  const before = new Set(prev.incidents.map((i) => i.id))
  const after = new Set(next.incidents.map((i) => i.id))
  for (const incident of next.incidents) {
    if (before.has(incident.id)) continue
    items.push({ key: `incident:${incident.id}`, tone: "bad", text: `${INCIDENTS[incident.kind].name} · ${regionName(incident.region)}` })
  }
  for (const incident of prev.incidents) {
    if (after.has(incident.id)) continue
    items.push({ key: `over:${incident.id}`, tone: "good", text: `${INCIDENTS[incident.kind].name} over · ${regionName(incident.region)}` })
  }
  for (const [region, users] of Object.entries(next.regionUsers)) {
    if (users >= 1 && !((prev.regionUsers[region] ?? 0) >= 1)) items.push({ key: `first:${region}`, tone: "info", text: `First users in ${regionName(region)}` })
  }
  const was = totalUsers(prev.regionUsers)
  const now = totalUsers(next.regionUsers)
  // A jump past several milestones says only the highest. The win has its own line, and its own pop.
  const crossed = MILESTONES.filter((row) => row.users < WORLD_TARGET && was < row.users && now >= row.users).at(-1)
  if (crossed) items.push({ key: `milestone:${crossed.id}`, tone: "info", text: crossed.label })
  if (next.won && !prev.won) items.push({ key: "won", tone: "good", text: "The world is yours" })
  if (!dropping(prev.health) && dropping(next.health)) items.push({ key: "drop", tone: "bad", text: "Dropping requests · more gear" })
  else if (dropping(prev.health) && !dropping(next.health)) items.push({ key: "recovered", tone: "good", text: "Serving everything again" })
  return items
}

/** The queue after new items arrive: repeats inside the cooldown are dropped, and a long queue keeps the newest `FEED_MAX`. */
export function enqueue(queue: readonly FeedItem[], items: readonly FeedItem[], lastSeen: Map<string, number>, at: number): FeedItem[] {
  const fresh = items.filter((item) => {
    const last = lastSeen.get(item.key)
    if (last !== undefined && at - last < FEED_COOLDOWN_MS) return false
    lastSeen.set(item.key, at)
    return true
  })
  return [...queue, ...fresh].slice(-FEED_MAX)
}

/** How the ring around the desk's globe looks: calm, a warning while serving is slow or dropping some requests, an alert on an incident or when most requests drop. */
export function alertOf(facts: Pick<FeedFacts, "incidents" | "health">): "calm" | "warn" | "bad" {
  if (facts.incidents.length > 0 || facts.health === "m") return "bad"
  return facts.health === "o" ? "calm" : "warn"
}
