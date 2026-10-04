import { composeSection } from "./deskMusicCompose.ts"
import type { Chord, MusicSection, MusicSectionSpec } from "./deskMusicCompose.ts"

export type { MusicSection } from "./deskMusicCompose.ts"

export type MusicStyleId = "cozy" | "synth" | "edm" | "lofi"

export const MUSIC_STYLE_IDS: readonly MusicStyleId[] = ["cozy", "synth", "edm", "lofi"]

export type MusicStyle = {
  id: MusicStyleId
  label: string
  /** Seconds between melody steps. */
  step: number
  /** Steps per chord. Every section's patterns are this long. */
  chordEvery: number
  /** The track, in order. The last section leads back into the first, so the loop has no seam. */
  sections: readonly MusicSection[]
  lead: { type: OscillatorType; peak: number; attack: number; release: number }
  pad: { type: OscillatorType; peak: number; attack: number; holdSteps: number }
  /** Optional sub/kick on chord downbeats (EDM). */
  pulse?: { peak: number; freq: number }
  /** Timing wobble in seconds. 0 stays on the grid. */
  humanize: number
}

/** `list` repeated or cut to `count` chords. */
function cycle(list: readonly Chord[], count: number): Chord[] {
  return Array.from({ length: count }, (_, index) => list[index % list.length] ?? [])
}

function sections(chordEvery: number, specs: readonly MusicSectionSpec[]): MusicSection[] {
  return specs.map((spec) => composeSection(spec, chordEvery))
}

// Cozy: C major, one chord every 8 steps (about 4s). Six sections, about 150s.
const C = [0, 4, 7]
const Am = [9, 12, 16]
const F = [5, 9, 12]
const G = [7, 11, 14]
const Em = [4, 7, 11]
const Dm = [2, 5, 9]

const COZY = sections(8, [
  { name: "intro", chords: [C, Am, F, G], patterns: ["0 . . . 2 . . .", "0 . 1 . . . 2 ."], level: 0.6, seed: 11 },
  {
    name: "verse",
    chords: [C, Am, F, G, C, Em, F, G],
    patterns: ["0 1 2 . 3 2 1 .", "2 1 0 . 1 2 3 .", "0 . 1 2 . 1 0 ."],
    level: 1,
    seed: 12,
    ornament: 0.1,
  },
  {
    name: "lift",
    chords: [Am, Em, F, C, Dm, Am, F, G],
    patterns: ["0 1 2 3 4 3 2 .", "2 3 4 . 3 2 1 .", "4 3 2 1 2 . 0 ."],
    shift: 1,
    level: 0.9,
    seed: 13,
    ornament: 0.15,
  },
  { name: "bridge", chords: [F, Em, Dm, G], patterns: ["0 . . 1 . . 2 .", "2 . . 1 . . 0 ."], level: 0.7, seed: 14, bass: true },
  {
    name: "return",
    chords: [C, G, Am, Em, F, C, Dm, G],
    patterns: ["2 1 0 . 1 2 3 .", "0 1 2 . 3 2 1 .", "0 . 1 2 . 1 0 ."],
    level: 1,
    seed: 15,
    ornament: 0.2,
    bass: true,
  },
  { name: "settle", chords: [F, G, Em, C], patterns: ["2 . 1 . 0 . . .", "0 . . . . . . ."], level: 0.5, seed: 16 },
])

// Synth: arpeggios, one chord every 4 steps (about 1.4s). Seven sections, about 80s.
const synthC = [0, 4, 7, 11]
const synthF = [5, 9, 12, 16]
const synthG = [7, 11, 14, 17]
const synthDm = [2, 5, 9, 12]
const synthEm = [4, 7, 11, 14]
const synthAm = [9, 12, 16, 19]

const SYNTH = sections(4, [
  { name: "intro", chords: [synthC, synthF, synthG, synthAm], patterns: ["0 . 2 .", "0 . . ."], level: 0.6, seed: 21 },
  {
    name: "run",
    chords: cycle([synthC, synthF, synthG, synthDm, synthEm, synthAm], 12),
    patterns: ["0 1 2 3", "3 2 1 0", "0 2 3 1", "0 . 2 .", "1 3 2 0", "0 2 1 ."],
    level: 1,
    seed: 22,
    bass: true,
  },
  {
    name: "climb",
    chords: cycle([synthAm, synthF, synthC, synthG], 12),
    patterns: ["0 2 3 1", "1 3 2 0", "0 1 2 3", "0 2 1 ."],
    shift: 1,
    level: 0.95,
    seed: 23,
    ornament: 0.15,
  },
  { name: "break", chords: [synthF, synthG, synthEm, synthAm], patterns: ["0 . . .", "2 . . ."], level: 0.55, seed: 24 },
  {
    name: "peak",
    chords: cycle([synthDm, synthG, synthC, synthAm, synthF, synthG], 12),
    patterns: ["1 3 2 0", "0 1 2 3", "0 2 1 .", "3 2 1 0", "0 2 3 1", "0 . 2 ."],
    shift: 1,
    level: 1,
    seed: 25,
    ornament: 0.25,
    bass: true,
  },
  {
    name: "return",
    chords: cycle([synthC, synthEm, synthF, synthG, synthAm, synthDm], 12),
    patterns: ["3 2 1 0", "0 2 3 1", "0 1 2 3", "1 3 2 0", "0 2 1 .", "0 . 2 ."],
    level: 1,
    seed: 26,
    ornament: 0.1,
  },
  { name: "settle", chords: [synthF, synthG, synthAm, synthC], patterns: ["0 . 2 .", "0 . . ."], level: 0.5, seed: 27 },
])

// EDM: stabs and a kick on every chord, one chord every 4 steps (about 1s). Seven sections, about 75s.
const edmC = [0, 7, 12]
const edmF = [5, 12]
const edmG = [7, 14]
const edmD = [2, 9]

const EDM = sections(4, [
  { name: "intro", chords: cycle([edmC, edmF, edmG, edmD], 8), patterns: ["0 . . .", "0 . 1 ."], level: 0.6, seed: 31, kick: false },
  {
    name: "build",
    chords: cycle([edmC, edmF, edmG, edmD], 8),
    patterns: ["0 0 . 1", "0 0 1 2", "0 1 2 1"],
    level: 0.85,
    seed: 32,
  },
  {
    name: "drop",
    chords: cycle([edmC, edmF, edmG, edmD], 16),
    patterns: ["0 . 0 .", "0 0 . 1", "0 0 1 2", "0 1 2 1"],
    level: 1,
    seed: 33,
    bass: true,
  },
  { name: "break", chords: cycle([edmF, edmD, edmG, edmC], 8), patterns: ["0 . . .", "2 . . ."], level: 0.5, seed: 34, kick: false },
  {
    name: "build again",
    chords: cycle([edmC, edmG, edmF, edmD], 8),
    patterns: ["0 0 1 1", "0 1 2 3", "0 1 2 1"],
    shift: 1,
    level: 0.9,
    seed: 35,
  },
  {
    name: "second drop",
    chords: cycle([edmC, edmG, edmF, edmD], 16),
    patterns: ["0 0 1 2", "0 1 2 1", "0 . 0 1", "0 0 . 1"],
    shift: 1,
    level: 1,
    seed: 36,
    ornament: 0.3,
    bass: true,
  },
  { name: "outro", chords: cycle([edmD, edmG, edmF, edmC], 8), patterns: ["0 . . .", "0 . . 1"], level: 0.5, seed: 37, kick: false },
])

// Lofi: C minor, one chord every 16 steps (8s). Six sections, about 145s.
const Cm7 = [0, 3, 7, 10]
const Fm7 = [5, 8, 12, 15]
const Gm7 = [7, 10, 14, 17]
const Ab = [8, 12, 15, 19]
const Bb = [10, 14, 17]
const Eb = [3, 7, 10, 14]
const Dm7 = [2, 5, 8, 12]

const LOFI_A = "0 . 1 2 . 1 0 . 2 . 3 2 . 1 . ."
const LOFI_B = "1 . 2 3 . 2 1 . 0 . 1 . . 2 . ."
const LOFI_C = "0 . . . 2 . 3 . . 2 . 1 . . . ."

const LOFI = sections(16, [
  {
    name: "intro",
    chords: [Cm7, Fm7],
    patterns: ["0 . . . . . 2 . . . . . 1 . . .", "0 . . . 2 . . . . . 1 . . . . ."],
    level: 0.6,
    seed: 41,
  },
  { name: "head", chords: [Cm7, Fm7, Gm7, Ab], patterns: [LOFI_A, LOFI_B, LOFI_C], level: 1, seed: 42, ornament: 0.08, bass: true },
  { name: "lift", chords: [Ab, Bb, Gm7, Cm7], patterns: [LOFI_B, LOFI_C, LOFI_A], shift: 1, level: 0.9, seed: 43, ornament: 0.15 },
  { name: "return", chords: [Cm7, Eb, Fm7, Gm7], patterns: [LOFI_C, LOFI_A, LOFI_B], level: 1, seed: 44, ornament: 0.1, bass: true },
  {
    name: "bridge",
    chords: [Fm7, Dm7],
    patterns: ["0 . . . 3 . . . 2 . . . 1 . . .", "2 . 1 . 0 . . . . . . . . . . ."],
    level: 0.7,
    seed: 45,
  },
  {
    name: "settle",
    chords: [Ab, Cm7],
    patterns: ["0 . 1 . 2 . . . . . 1 . . . . .", "0 . . . . . . . . . . . . . . ."],
    level: 0.5,
    seed: 46,
  },
])

export function parseMusicStyleId(raw: unknown): MusicStyleId {
  return typeof raw === "string" && (MUSIC_STYLE_IDS as readonly string[]).includes(raw) ? (raw as MusicStyleId) : "cozy"
}

/** Real loops of one to three minutes. Each plays through its sections, then wraps. */
export const MUSIC_STYLES: Record<MusicStyleId, MusicStyle> = {
  cozy: {
    id: "cozy",
    label: "Cozy",
    step: 0.52,
    chordEvery: 8,
    humanize: 0.012,
    sections: COZY,
    lead: { type: "sine", peak: 0.04, attack: 0.02, release: 0.32 },
    pad: { type: "triangle", peak: 0.016, attack: 0.4, holdSteps: 7.2 },
  },
  synth: {
    id: "synth",
    label: "Synth",
    step: 0.34,
    chordEvery: 4,
    humanize: 0,
    sections: SYNTH,
    lead: { type: "sawtooth", peak: 0.022, attack: 0.008, release: 0.18 },
    pad: { type: "triangle", peak: 0.01, attack: 0.12, holdSteps: 3.5 },
  },
  edm: {
    id: "edm",
    label: "EDM",
    step: 0.26,
    chordEvery: 4,
    humanize: 0,
    sections: EDM,
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
    sections: LOFI,
    lead: { type: "sine", peak: 0.038, attack: 0.025, release: 0.38 },
    pad: { type: "triangle", peak: 0.014, attack: 0.5, holdSteps: 14 },
  },
}

export function musicStyleById(id: MusicStyleId): MusicStyle {
  return MUSIC_STYLES[id]
}

export function styleSteps(style: MusicStyle): number {
  return style.sections.reduce((total, section) => total + section.melody.length, 0)
}

export function trackSeconds(id: MusicStyleId): number {
  const style = MUSIC_STYLES[id]
  return styleSteps(style) * style.step
}
