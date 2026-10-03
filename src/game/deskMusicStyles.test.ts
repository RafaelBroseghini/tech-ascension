import { describe, expect, it } from "vitest"
import { MUSIC_STYLE_IDS, MUSIC_STYLES, parseMusicStyleId, trackSeconds } from "./deskMusicStyles.ts"

const OPENING: Record<(typeof MUSIC_STYLE_IDS)[number], readonly (number | null)[]> = {
  cozy: [0, 4, 7, null, 9, 7, 4, null],
  japanese: [7, 9, 11, 9, 7, null, 5, null],
  synth: [0, 4, 7, 11, 7, 4, 0, null],
  edm: [0, null, 0, null, 7, null, 7, null],
  lofi: [3, null, 7, 10, null, 7, 3, null],
}

describe("desk music styles", () => {
  it("defaults unknown ids to cozy", () => {
    expect(parseMusicStyleId("nope")).toBe("cozy")
    expect(parseMusicStyleId("edm")).toBe("edm")
  })

  it("keeps five styles and stretches each track to at least two minutes of the old opening", () => {
    expect(MUSIC_STYLE_IDS).toHaveLength(5)
    for (const id of MUSIC_STYLE_IDS) {
      const style = MUSIC_STYLES[id]
      expect(style.melody.slice(0, 8), id).toEqual(OPENING[id])
      expect(style.chords.length).toBeGreaterThanOrEqual(4)
      expect(trackSeconds(id), id).toBeGreaterThanOrEqual(120)
      expect(style.melody.some((note) => note === null), id).toBe(true)
    }
  })
})
