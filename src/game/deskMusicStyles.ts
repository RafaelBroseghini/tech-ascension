export type MusicStyleId = "cozy" | "japanese" | "synth" | "edm" | "lofi"

export const MUSIC_STYLE_IDS: readonly MusicStyleId[] = ["cozy", "japanese", "synth", "edm", "lofi"]

export type MusicStyle = {
  id: MusicStyleId
  label: string
  /** Seconds between melody steps. */
  step: number
  /** Semitones from C4; null is a rest. One full loop before repeat. */
  melody: readonly (number | null)[]
  /** Chord roots as semitone stacks from C4. */
  chords: readonly (readonly number[])[]
  /** Schedule a pad every N melody steps. */
  chordEvery: number
  lead: { type: OscillatorType; peak: number; attack: number; release: number }
  pad: { type: OscillatorType; peak: number; attack: number; holdSteps: number }
  /** Optional sub/kick on chord downbeats (EDM). */
  pulse?: { peak: number; freq: number }
  /** Timing wobble in seconds. 0 stays on the grid. */
  humanize: number
}

type Note = number | null

function join(...parts: readonly (readonly Note[])[]): Note[] {
  return parts.flat()
}

/** The original cozy loop, then three more sections in the same pocket. */
const COZY_HEAD: readonly Note[] = [
  0, 4, 7, null, 9, 7, 4, null,
  5, 9, 12, null, 11, 7, 5, null,
  4, 7, 9, null, 7, 4, 2, null,
  0, 2, 4, null, 7, 4, 2, null,
  5, 7, 9, null, 12, 9, 7, null,
  4, 5, 7, null, 9, 7, 4, null,
  2, 4, 5, null, 7, 5, 4, null,
  0, null, 4, null, 7, null, 12, null,
]

const COZY_LIFT: readonly Note[] = [
  5, 9, 12, null, 11, 9, 5, null,
  7, 11, 14, null, 12, 11, 7, null,
  4, 7, 11, null, 9, 7, 4, null,
  2, 5, 9, null, 7, 5, 2, null,
  0, 4, 7, null, 4, 2, 0, null,
  9, 7, 4, null, 0, 4, 9, null,
  5, 7, 9, null, 12, 9, 5, null,
  7, 4, 2, null, 0, 2, 4, null,
]

const COZY_HIGH: readonly Note[] = [
  4, 7, 11, 12, 11, 7, 4, null,
  2, 5, 9, 10, 9, 5, 2, null,
  0, 4, 7, 4, 0, null, 7, null,
  9, 12, 16, 12, 9, 4, null, null,
  17, 16, 12, 9, 5, null, null, null,
  14, 11, 7, 4, 2, 0, null, null,
  4, 7, 4, 2, 4, 7, 11, null,
  9, 5, 2, 0, null, null, null, null,
]

const COZY_HOME: readonly Note[] = [
  0, 4, 7, null, 9, 7, 4, null,
  5, 9, 12, null, 11, 7, 5, null,
  4, 7, 9, null, 7, 4, 2, null,
  0, 2, 4, null, 7, 4, 2, null,
  4, 7, 11, null, 14, 11, 7, null,
  9, 5, 2, null, 5, 9, 12, null,
  7, 4, 0, null, 4, null, 7, null,
  4, 0, null, null, null, null, null, null,
]

const JAPANESE_HEAD: readonly Note[] = [
  7, 9, 11, 9, 7, null, 5, null,
  4, 5, 7, null, 9, 7, 5, null,
  2, 4, 5, 4, 2, null, 0, null,
  4, 5, 7, 9, 11, 9, 7, null,
  12, 11, 9, 7, 5, null, 4, null,
  2, 0, 2, 4, 5, 7, null, null,
  9, 11, 12, 11, 9, 7, 5, null,
  4, 2, 0, null, null, null, null, null,
]

const JAPANESE_MORE: readonly Note[] = [
  12, 14, 16, 14, 12, null, 9, null,
  7, 9, 11, null, 12, 11, 9, null,
  5, 7, 9, 7, 5, null, 4, null,
  2, 4, 5, 7, 9, 7, 5, null,
  16, 14, 12, 11, 9, null, 7, null,
  5, 4, 2, 0, null, null, 4, null,
  7, 9, 12, 9, 7, 5, 4, null,
  2, 0, null, null, null, null, null, null,
  12, 11, 9, 11, 12, null, 16, null,
  14, 12, 11, 9, 7, null, 5, null,
  4, 5, 7, 9, 7, 5, 4, 2,
  0, 2, 4, null, 7, 4, 2, null,
  9, 7, 5, 4, 2, 0, null, null,
  4, 7, 9, 7, 4, null, 2, null,
  0, 4, 7, 9, 7, 4, 0, null,
  0, null, null, null, null, null, null, null,
  7, 9, 11, 9, 7, 5, 4, null,
  2, 4, 0, null, 4, 7, 9, null,
  12, 9, 7, 4, 2, 0, null, null,
]

const SYNTH_HEAD: readonly Note[] = [
  0, 4, 7, 11, 7, 4, 0, null,
  5, 9, 12, 16, 12, 9, 5, null,
  7, 11, 14, 11, 7, 4, null, null,
  0, 7, 4, 11, 7, 4, 0, null,
  5, 12, 9, 16, 12, 9, 5, null,
  2, 9, 5, 12, 9, 5, 2, null,
  4, 11, 7, 14, 11, 7, 4, null,
  0, 4, 7, 11, 14, 11, 7, 4,
]

function synthTail(): Note[] {
  const chords = [
    [0, 4, 7, 11],
    [5, 9, 12, 16],
    [7, 11, 14, 17],
    [2, 5, 9, 12],
    [4, 7, 11, 14],
    [9, 12, 16, 19],
  ]
  const shapes: readonly (readonly (number | null)[])[] = [
    [0, 1, 2, 3],
    [3, 2, 1, 0],
    [0, 2, 3, 1],
    [0, null, 2, null],
    [1, 3, 2, 0],
    [0, 2, 1, null],
  ]
  const notes: Note[] = []
  for (let i = 0; i < 76; i++) {
    const chord = chords[i % chords.length] ?? []
    const shape = shapes[Math.floor(i / chords.length) % shapes.length] ?? []
    for (const degree of shape) notes.push(degree === null ? null : (chord[degree] ?? null))
  }
  return notes
}

const EDM_HEAD: readonly Note[] = [
  0, null, 0, null, 7, null, 7, null,
  5, null, 5, null, 12, null, 12, null,
  0, 0, 7, 7, 5, 5, 12, 12,
  0, null, 12, null, 7, null, 5, null,
  0, null, 0, null, 7, null, 7, null,
  5, null, 12, null, 5, null, 12, null,
  0, 7, 12, 7, 0, 7, 12, 7,
  0, null, null, null, 12, null, null, null,
]

function edmTail(): Note[] {
  const roots = [0, 5, 7, 2]
  const forms = {
    stab: [0, null, 0, null],
    chatter: [0, 0, null, 7],
    drop: [0, 0, 7, 12],
    climb: [0, 7, 12, 7],
    hole: [0, null, null, null],
    off: [null, null, null, null],
  } as const
  const plan = [
    ["stab", 16],
    ["chatter", 16],
    ["drop", 16],
    ["climb", 8],
    ["hole", 8],
    ["off", 4],
    ["drop", 16],
    ["stab", 16],
    ["hole", 8],
  ] as const
  const notes: Note[] = []
  let step = 0
  for (const [name, count] of plan) {
    const shape = forms[name]
    for (let n = 0; n < count; n++) {
      const root = roots[step % roots.length] ?? 0
      step += 1
      for (const interval of shape) notes.push(interval === null ? null : interval + root)
    }
  }
  return notes
}

const LOFI_HEAD: readonly Note[] = [
  3, null, 7, 10, null, 7, 3, null,
  5, null, 8, 12, null, 8, 5, null,
  7, 10, 12, 10, 7, null, 5, null,
  3, 5, 7, null, null, 10, 7, null,
  0, null, 3, 7, null, 3, 0, null,
  5, 7, 8, null, 12, null, 8, null,
  10, 12, 14, 12, 10, 7, null, null,
  3, 7, 10, 7, 3, null, null, null,
]

const LOFI_MORE: readonly Note[] = [
  4, null, 7, 11, null, 7, 4, null,
  11, null, 14, 11, null, 7, null, null,
  9, null, 12, 16, null, 12, 9, null,
  0, null, 3, 7, null, 3, 0, null,
  3, null, 7, 10, null, 7, 3, null,
  10, 12, 15, 12, 10, null, 7, null,
  5, null, 8, 12, null, 8, 5, null,
  12, null, 15, 12, null, 8, null, null,
  7, null, 10, 14, null, 10, 7, null,
  14, 15, 14, 10, 7, null, null, null,
  2, null, 5, 9, null, 5, 2, null,
  9, null, 12, 9, null, 5, null, null,
  11, null, 14, 16, null, 14, 11, null,
  7, 11, 14, null, 16, null, 11, null,
  9, null, 12, 9, null, 4, 0, null,
  0, 3, 7, 3, 0, null, null, null,
  3, null, 7, 10, null, 15, 12, null,
  10, 7, 3, null, 0, null, null, null,
  5, null, 8, 12, null, 17, 12, null,
  8, 5, 0, null, null, null, null, null,
  7, null, 10, 7, null, 3, 0, null,
  0, null, null, null, null, null, null, null,
]

export function parseMusicStyleId(raw: unknown): MusicStyleId {
  return typeof raw === "string" && (MUSIC_STYLE_IDS as readonly string[]).includes(raw) ? (raw as MusicStyleId) : "cozy"
}

/** About two minutes each. The opening of every track is the short loop it grew from. */
export const MUSIC_STYLES: Record<MusicStyleId, MusicStyle> = {
  cozy: {
    id: "cozy",
    label: "Cozy",
    step: 0.52,
    chordEvery: 8,
    humanize: 0.012,
    chords: [
      [0, 4, 7],
      [9, 0, 4],
      [5, 9, 12],
      [7, 11, 14],
      [4, 7, 11],
      [2, 5, 9],
    ],
    melody: join(COZY_HEAD, COZY_LIFT, COZY_HIGH, COZY_HOME),
    lead: { type: "sine", peak: 0.04, attack: 0.02, release: 0.32 },
    pad: { type: "triangle", peak: 0.016, attack: 0.4, holdSteps: 7.2 },
  },
  japanese: {
    id: "japanese",
    label: "Japanese cozy",
    step: 0.58,
    chordEvery: 12,
    humanize: 0.02,
    chords: [
      [0, 4, 7],
      [2, 5, 9],
      [4, 7, 11],
      [7, 11, 14],
      [5, 9, 12],
      [0, 3, 7],
    ],
    melody: join(JAPANESE_HEAD, JAPANESE_MORE),
    lead: { type: "triangle", peak: 0.035, attack: 0.03, release: 0.45 },
    pad: { type: "sine", peak: 0.012, attack: 0.55, holdSteps: 10 },
  },
  synth: {
    id: "synth",
    label: "Synth",
    step: 0.34,
    chordEvery: 4,
    humanize: 0,
    chords: [
      [0, 4, 7, 11],
      [5, 9, 12],
      [7, 11, 14],
      [2, 5, 9],
      [4, 7, 11],
      [9, 0, 4],
    ],
    melody: join(SYNTH_HEAD, synthTail()),
    lead: { type: "sawtooth", peak: 0.022, attack: 0.008, release: 0.18 },
    pad: { type: "triangle", peak: 0.01, attack: 0.12, holdSteps: 3.5 },
  },
  edm: {
    id: "edm",
    label: "EDM",
    step: 0.26,
    chordEvery: 4,
    humanize: 0,
    chords: [
      [0, 7, 12],
      [5, 12],
      [7, 14],
      [2, 9],
    ],
    melody: join(EDM_HEAD, edmTail()),
    lead: { type: "square", peak: 0.028, attack: 0.004, release: 0.12 },
    pad: { type: "sawtooth", peak: 0.014, attack: 0.02, holdSteps: 3.2 },
    pulse: { peak: 0.08, freq: 55 },
  },
  lofi: {
    id: "lofi",
    label: "Lofi",
    step: 0.5,
    chordEvery: 16,
    humanize: 0.04,
    chords: [
      [0, 3, 7, 10],
      [5, 8, 12],
      [7, 10, 14],
      [2, 5, 9],
      [4, 7, 11],
      [9, 0, 3],
    ],
    melody: join(LOFI_HEAD, LOFI_MORE),
    lead: { type: "sine", peak: 0.038, attack: 0.025, release: 0.38 },
    pad: { type: "triangle", peak: 0.014, attack: 0.5, holdSteps: 14 },
  },
}

export function musicStyleById(id: MusicStyleId): MusicStyle {
  return MUSIC_STYLES[id]
}

export function trackSeconds(id: MusicStyleId): number {
  const style = MUSIC_STYLES[id]
  return style.melody.length * style.step
}
