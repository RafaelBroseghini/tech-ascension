import { describe, expect, it } from "vitest"
import { composeSection } from "./deskMusicCompose.ts"
import { MUSIC_STYLE_IDS, MUSIC_STYLES, parseMusicStyleId, styleSteps, trackSeconds } from "./deskMusicStyles.ts"

describe("music styles", () => {
  it("has four styles", () => {
    expect(MUSIC_STYLE_IDS).toEqual(["cozy", "synth", "edm", "lofi"])
  })

  it("plays real loops of one to three minutes", () => {
    for (const id of MUSIC_STYLE_IDS) {
      const seconds = trackSeconds(id)
      expect(seconds, id).toBeGreaterThanOrEqual(60)
      expect(seconds, id).toBeLessThanOrEqual(180)
    }
  })

  it("moves through at least five sections, none repeating another's notes", () => {
    for (const id of MUSIC_STYLE_IDS) {
      const { sections } = MUSIC_STYLES[id]
      expect(sections.length, id).toBeGreaterThanOrEqual(5)
      const tunes = sections.map((section) => section.melody.join(","))
      expect(new Set(tunes).size, id).toBe(tunes.length)
      const levels = new Set(sections.map((section) => section.level))
      expect(levels.size, `${id} dynamics`).toBeGreaterThanOrEqual(3)
    }
  })

  it("fits every section to whole chords with finite, in-range notes and rests", () => {
    for (const id of MUSIC_STYLE_IDS) {
      const style = MUSIC_STYLES[id]
      let rests = 0
      for (const section of style.sections) {
        expect(section.melody.length, `${id} ${section.name}`).toBe(section.chords.length * style.chordEvery)
        for (const chord of section.chords) {
          expect(chord.length).toBeGreaterThan(0)
          for (const tone of chord) expect(Number.isFinite(tone)).toBe(true)
        }
        for (const note of section.melody) {
          if (note === null) rests += 1
          else {
            expect(Number.isFinite(note)).toBe(true)
            expect(note).toBeGreaterThanOrEqual(0)
            expect(note).toBeLessThanOrEqual(26)
          }
        }
      }
      expect(rests, id).toBeGreaterThan(0)
      expect(styleSteps(style) * style.step).toBe(trackSeconds(id))
    }
  })

  it("gives EDM a kick only where the track drives, and a bass under some sections", () => {
    const edm = MUSIC_STYLES.edm.sections
    expect(edm.some((section) => section.kick)).toBe(true)
    expect(edm.some((section) => !section.kick)).toBe(true)
    for (const id of MUSIC_STYLE_IDS) expect(MUSIC_STYLES[id].sections.some((section) => section.bass), id).toBe(true)
  })

  it("composes the same notes for the same seed, and rejects a pattern of the wrong length", () => {
    const spec = { name: "t", chords: [[0, 4, 7], [5, 9, 12]], patterns: ["0 1 2 ."], level: 1, seed: 7, ornament: 0.5 }
    expect(composeSection(spec, 4).melody).toEqual(composeSection(spec, 4).melody)
    expect(() => composeSection(spec, 8)).toThrow(/needs 8 steps/)
  })

  it("falls back to cozy for an unknown style", () => {
    expect(parseMusicStyleId("edm")).toBe("edm")
    expect(parseMusicStyleId("nope")).toBe("cozy")
    expect(parseMusicStyleId(undefined)).toBe("cozy")
  })
})
