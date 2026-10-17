import { describe, expect, it } from "vitest"
import { alertOf, enqueue, FEED_COOLDOWN_MS, FEED_MAX, feedItems } from "./feed.ts"
import type { FeedFacts } from "./feed.ts"
import { makeIncident } from "../../game/globe/world.ts"

const calm: FeedFacts = { regionUsers: { europe: 500 }, incidents: [], health: "o", won: false }

describe("feedItems", () => {
  it("says nothing while the user count just moves", () => {
    expect(feedItems(calm, { ...calm, regionUsers: { europe: 900 } })).toEqual([])
  })

  it("announces an incident once, and its end", () => {
    const incident = makeIncident("ddos", "europe", 10, 1, 0)
    const started = feedItems(calm, { ...calm, incidents: [incident] })
    expect(started).toHaveLength(1)
    expect(started[0]).toMatchObject({ tone: "bad", key: "incident:1" })
    expect(started[0]!.text).toContain("DDoS surge")
    expect(feedItems({ ...calm, incidents: [incident] }, { ...calm, incidents: [incident] })).toEqual([])
    const over = feedItems({ ...calm, incidents: [incident] }, calm)
    expect(over[0]).toMatchObject({ tone: "good", key: "over:1" })
  })

  it("marks a region's first users and each milestone crossed", () => {
    const items = feedItems(calm, { ...calm, regionUsers: { europe: 600_000, asia: 600_000 } })
    expect(items.map((i) => i.key)).toEqual(["first:asia", "milestone:1m"])
  })

  it("waits for a whole user before a region counts as reached", () => {
    expect(feedItems(calm, { ...calm, regionUsers: { europe: 500, asia: 0.3 } })).toEqual([])
    expect(feedItems({ ...calm, regionUsers: { europe: 500, asia: 0.3 } }, { ...calm, regionUsers: { europe: 500, asia: 1.2 } }).map((i) => i.key)).toEqual(["first:asia"])
  })

  it("says only the highest milestone a jump crosses", () => {
    expect(feedItems(calm, { ...calm, regionUsers: { europe: 2e9 } }).map((i) => i.key)).toEqual(["milestone:1b"])
  })

  it("tracks the win and serving dropping and recovering", () => {
    expect(feedItems(calm, { ...calm, won: true }).map((i) => i.key)).toEqual(["won"])
    expect(feedItems(calm, { ...calm, health: "m" }).map((i) => i.key)).toEqual(["drop"])
    expect(feedItems({ ...calm, health: "p" }, { ...calm, health: "d" }).map((i) => i.key)).toEqual(["recovered"])
    expect(feedItems({ ...calm, health: "o" }, { ...calm, health: "d" })).toEqual([])
  })
})

describe("enqueue", () => {
  const item = (key: string) => ({ key, tone: "info" as const, text: key })

  it("drops a repeat inside the cooldown and lets it back after", () => {
    const seen = new Map<string, number>()
    const first = enqueue([], [item("drop")], seen, 0)
    expect(enqueue(first, [item("drop")], seen, FEED_COOLDOWN_MS - 1)).toHaveLength(1)
    expect(enqueue(first, [item("drop")], seen, FEED_COOLDOWN_MS)).toHaveLength(2)
  })

  it("keeps the newest few of a burst", () => {
    const keys = ["a", "b", "c", "d", "e"]
    const queue = enqueue([], keys.map(item), new Map(), 0)
    expect(queue.map((i) => i.key)).toEqual(keys.slice(-FEED_MAX))
  })
})

describe("alertOf", () => {
  it("is calm, warns when slow or dropping, and alerts on an incident or most requests dropped", () => {
    expect(alertOf({ incidents: [], health: "o" })).toBe("calm")
    expect(alertOf({ incidents: [], health: "d" })).toBe("warn")
    expect(alertOf({ incidents: [], health: "p" })).toBe("warn")
    expect(alertOf({ incidents: [], health: "m" })).toBe("bad")
    expect(alertOf({ incidents: [makeIncident("block", "asia", 0, 1, 0)], health: "o" })).toBe("bad")
  })
})
