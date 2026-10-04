export type Note = number | null

/** Semitones from C4, root first. The pad plays the stack; the lead walks its tones. */
export type Chord = readonly number[]

export type MusicSection = {
  name: string
  /** Scales the lead, pad and bass velocity, so a loop breathes between sections. */
  level: number
  /** A bass note under each chord downbeat. */
  bass: boolean
  /** The kick on each chord downbeat, for styles that have one. */
  kick: boolean
  chords: readonly Chord[]
  /** One step per entry, `chords.length * chordEvery` in all. null is a rest. */
  melody: readonly Note[]
}

export type MusicSectionSpec = {
  name: string
  chords: readonly Chord[]
  /**
   * One pattern per chord, cycled. Space separated, `chordEvery` tokens each. A number is a step
   * up the chord's tone ladder (0 root, 1 next tone, and so on up through the octaves); `.` rests.
   */
  patterns: readonly string[]
  level: number
  /** Seeds the ornaments, so a section always plays the same notes. */
  seed: number
  /** Moves every pattern up the ladder, for a brighter section. */
  shift?: number
  /** Chance that a note steps one rung up or down. */
  ornament?: number
  bass?: boolean
  kick?: boolean
}

const TOP = 26

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rung(chord: Chord, n: number): number {
  const tones = [...chord].sort((a, b) => a - b)
  const index = Math.max(0, n)
  let semi = (tones[index % tones.length] ?? 0) + 12 * Math.floor(index / tones.length)
  while (semi > TOP) semi -= 12
  return semi
}

function parsePattern(pattern: string, length: number, where: string): Note[] {
  const tokens = pattern.trim().split(/\s+/)
  if (tokens.length !== length) throw new Error(`${where}: pattern "${pattern}" needs ${length} steps`)
  return tokens.map((token) => {
    if (token === ".") return null
    const value = Number(token)
    if (!Number.isInteger(value) || value < 0) throw new Error(`${where}: bad step "${token}"`)
    return value
  })
}

export function composeSection(spec: MusicSectionSpec, chordEvery: number): MusicSection {
  const random = mulberry32(spec.seed)
  const shift = spec.shift ?? 0
  const ornament = spec.ornament ?? 0
  const patterns = spec.patterns.map((pattern) => parsePattern(pattern, chordEvery, spec.name))
  const melody: Note[] = []
  spec.chords.forEach((chord, index) => {
    const pattern = patterns[index % patterns.length] ?? []
    for (const step of pattern) {
      if (step === null) {
        melody.push(null)
        continue
      }
      const wobble = ornament > 0 && random() < ornament ? (random() < 0.5 ? -1 : 1) : 0
      melody.push(rung(chord, step + shift + wobble))
    }
  })
  return {
    name: spec.name,
    level: spec.level,
    bass: spec.bass ?? false,
    kick: spec.kick ?? true,
    chords: spec.chords,
    melody,
  }
}
