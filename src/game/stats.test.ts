import { describe, expect, it } from "vitest"
import { CLICK_STREAK_GAP_MS, creditMoney, emptyStats, emptyStatsClock, recordClick, touchIdleRecord } from "./stats.ts"

describe("game stats", () => {
  it("tracks click streaks and idle gaps", () => {
    let stats = emptyStats()
    let clock = emptyStatsClock()
    const t0 = 1_000_000

    ;({ stats, clock } = recordClick(stats, clock, t0))
    expect(stats.totalClicks).toBe(1)
    expect(stats.longestClickStreak).toBe(1)

    ;({ stats, clock } = recordClick(stats, clock, t0 + 500))
    expect(stats.longestClickStreak).toBe(2)
    expect(stats.longestIdleMs).toBe(0)

    ;({ stats, clock } = recordClick(stats, clock, t0 + CLICK_STREAK_GAP_MS + 5_000))
    expect(stats.longestClickStreak).toBe(2)
    expect(stats.longestIdleMs).toBe(CLICK_STREAK_GAP_MS + 5_000 - 500)
    expect(clock.currentClickStreak).toBe(1)
  })

  it("extends longest idle while waiting", () => {
    const stats = emptyStats()
    const clock = { lastClickAt: 0, currentClickStreak: 3 }
    const next = touchIdleRecord(stats, clock, CLICK_STREAK_GAP_MS + 1_000)
    expect(next.longestIdleMs).toBe(CLICK_STREAK_GAP_MS + 1_000)
  })

  it("credits money by source", () => {
    let stats = emptyStats()
    stats = creditMoney(stats, 10, "click")
    stats = creditMoney(stats, 5, "idle")
    stats = creditMoney(stats, 3, "other")
    expect(stats.lifetimeEarned).toBe(18)
    expect(stats.moneyFromClicks).toBe(10)
    expect(stats.moneyFromIdle).toBe(5)
  })
})
