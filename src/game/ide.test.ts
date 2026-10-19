import { beforeEach, describe, expect, it } from "vitest"
import { bandForTier, IDE_BANDS, previewBandForEra } from "../data/idePacks.ts"
import { CAPITAL } from "../data/capital.ts"
import { ideView, PREVIEW_HOLD_MS } from "./ide.ts"
import { useGame } from "./store.ts"

describe("desk bands", () => {
  it("keys every capital tier to a band inside the tier's era, never going backwards", () => {
    let last = 0
    for (const row of CAPITAL) {
      const band = bandForTier(row.artId)
      expect(band.era).toBe(row.era)
      expect(IDE_BANDS.indexOf(band)).toBeGreaterThanOrEqual(last)
      last = IDE_BANDS.indexOf(band)
    }
    expect(bandForTier(0).label).toBe("High school")
    expect(bandForTier(19).label).toBe("Internship")
    expect(bandForTier(50).label).toBe("Frontier lab")
    expect(bandForTier(66).label).toBe("Mars")
  })
})

describe("desk era preview", () => {
  const base = { skills: {}, owned: {}, jobs: [2], gigs: [] }

  it("rests on the owned band and previews another era's first band", () => {
    expect(ideView({ ...base, previewEra: null })).toEqual({ band: bandForTier(19), previewing: false })
    expect(ideView({ ...base, previewEra: "q3" })).toEqual({ band: previewBandForEra("q3"), previewing: true })
    expect(previewBandForEra("q3").label).toBe("Foundry")
  })

  it("treats previewing the owned era as no preview", () => {
    expect(ideView({ ...base, previewEra: "mid" }).previewing).toBe(false)
  })
})

describe("snap-back in the store", () => {
  beforeEach(() => useGame.getState().wipe())
  const game = () => useGame.getState()

  it("shows the browsed era until the hold lapses, then snaps back to the owned band", () => {
    useGame.setState({ jobs: [2], owned: {} })
    game().setPreviewEra("end")
    expect(ideView(game()).band.era).toBe("end")

    game().tick(game().now + PREVIEW_HOLD_MS - 5_000)
    expect(game().previewEra).toBe("end")
    game().tick(game().now + PREVIEW_HOLD_MS)
    expect(game().previewEra).toBeNull()
    expect(ideView(game()).band.label).toBe("Internship")
  })

  it("interacting with the desk or the shop extends the hold", () => {
    useGame.setState({ jobs: [2], owned: {} })
    game().setPreviewEra("q3")
    const first = game().previewUntil
    useGame.setState({ previewUntil: first - 10_000 })
    game().holdPreview()
    expect(game().previewUntil).toBeGreaterThan(first - 10_000)
    game().setPreviewEra(null)
  })

  it("buying into a new era ends the preview, buying inside the owned era keeps it", () => {
    useGame.setState({ money: 1e15, peakMoney: 1e15, gigs: [1], owned: { "1": 1 } })
    game().setPreviewEra("upper")
    game().buy(2)
    expect(game().previewEra).toBe("upper")
    game().buy(6)
    expect(game().previewEra).toBeNull()
  })

  it("wipe clears the preview", () => {
    game().setPreviewEra("end")
    game().wipe()
    expect(game().previewEra).toBeNull()
  })
})
