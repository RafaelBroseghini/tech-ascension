/**
 * The Tone.js half of the desk audio. It is a separate chunk, loaded by deskAudio.ts after the
 * first paint or on the first gesture, so the synth library is never on the boot path.
 */
import "./toneQuiet.ts"
import {
  AMSynth,
  FeedbackDelay,
  Filter,
  Gain,
  MembraneSynth,
  MonoSynth,
  NoiseSynth,
  Part,
  PolySynth,
  Synth,
  getContext,
  getTransport,
  now,
  start,
} from "tone"
import { clickKitById } from "./deskClickKits.ts"
import type { ClickKitId } from "./deskClickKits.ts"
import { musicStyleById, styleSteps } from "./deskMusicStyles.ts"
import type { MusicStyle, MusicStyleId } from "./deskMusicStyles.ts"

export type RoomPrefs = { music: boolean; sounds: boolean; clicks: boolean; musicStyle: MusicStyleId; clickKit: ClickKitId }
type MusicEvent = {
  time: number
  semi: number | null
  /** Pad stack on a chord downbeat, already in Hz. */
  pad: readonly number[] | null
  /** Bass note on a chord downbeat, in Hz. */
  bass: number | null
  /** The section's loudness, 0 to 1. */
  level: number
  kick: boolean
}

type Graph = {
  musicGain: Gain
  soundGain: Gain
  lead: Synth
  mono: MonoSynth
  am: AMSynth
  pad: PolySynth
  kick: MembraneSynth
  wood: Synth
  woodHigh: Synth
  blip: PolySynth
  /** The unlock chime: a soft bell arpeggio with a long tail, apart from the room's blips. */
  chime: PolySynth
  /** A low sine under a big unlock's chime, so it lands warm rather than bright. */
  chimeBed: Synth
  noise: NoiseSynth
  noiseFilter: Filter
  /** The player's click has its own grain, so it never fights the room for the shared noise voice. */
  clickNoise: NoiseSynth
  clickNoiseFilter: Filter
}

const C4 = 261.63

let readPrefs: () => RoomPrefs = () => ({ music: false, sounds: false, clicks: false, musicStyle: "cozy", clickKit: "thock" })
let graph: Graph | null = null
let part: Part<MusicEvent> | null = null
let roomTimer = 0
let phraseTimers: number[] = []
let watching = false
/** The front owns the gesture unlock. The context is never touched before a pointer or key. */
let gestureHeard: () => boolean = () => false
let playingStyle: MusicStyleId | null = null

function canHear(): boolean {
  if (typeof window === "undefined") return false
  const host = window as unknown as {
    AudioContext?: new () => AudioContext
    webkitAudioContext?: new () => AudioContext
  }
  return typeof host.AudioContext === "function" || typeof host.webkitAudioContext === "function"
}

export function bindEngine(read: () => RoomPrefs, heard: () => boolean): void {
  readPrefs = read
  gestureHeard = heard
}

function freq(semis: number): number {
  return C4 * 2 ** (semis / 12)
}

function build(): Graph | null {
  if (graph) return graph
  if (!canHear()) return null
  try {
    const musicGain = new Gain(0).toDestination()
    const soundGain = new Gain(0).toDestination()
    const warmth = new Filter({ frequency: 3800, type: "lowpass", rolloff: -12 }).connect(musicGain)
    const lead = new Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.08, sustain: 0.35, release: 0.32 },
    }).connect(warmth)
    const mono = new MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.008, decay: 0.1, sustain: 0.25, release: 0.18 },
      filter: { Q: 1, type: "lowpass", rolloff: -12 },
      filterEnvelope: { attack: 0.01, decay: 0.18, sustain: 0.2, baseFrequency: 220, octaves: 2.6, release: 0.2 },
    }).connect(warmth)
    const am = new AMSynth({
      harmonicity: 1.4,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.025, decay: 0.1, sustain: 0.3, release: 0.38 },
      modulationEnvelope: { attack: 0.2, decay: 0.15, sustain: 0.3, release: 0.3 },
    }).connect(warmth)
    const pad = new PolySynth(Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.4, decay: 0.2, sustain: 0, release: 1.2 },
    }).connect(warmth)
    const kick = new MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.04 },
    }).connect(musicGain)
    const wood = new Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.06 },
    }).connect(soundGain)
    const woodHigh = new Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.004, decay: 0.05, sustain: 0, release: 0.04 },
    }).connect(soundGain)
    const blip = new PolySynth(Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 0.03, sustain: 0, release: 0.02 },
    }).connect(soundGain)
    // Rounded off and echoed once or twice, so it rings out like a small bell instead of beeping.
    const chimeTone = new Filter({ frequency: 3200, type: "lowpass", rolloff: -12 }).connect(soundGain)
    const chimeEcho = new FeedbackDelay({ delayTime: 0.19, feedback: 0.28, wet: 0.22 }).connect(chimeTone)
    const chime = new PolySynth(Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.012, decay: 1.1, sustain: 0, release: 1.4 },
    }).connect(chimeEcho)
    const chimeBed = new Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.08, decay: 1.4, sustain: 0, release: 1.2 },
    }).connect(chimeTone)
    const noiseFilter = new Filter({ type: "bandpass", frequency: 2000, Q: 0.8 }).connect(soundGain)
    const noise = new NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
    }).connect(noiseFilter)
    const clickNoiseFilter = new Filter({ type: "bandpass", frequency: 2000, Q: 0.8 }).connect(soundGain)
    const clickNoise = new NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
    }).connect(clickNoiseFilter)
    graph = {
      musicGain,
      soundGain,
      lead,
      mono,
      am,
      pad,
      kick,
      wood,
      woodHigh,
      blip,
      chime,
      chimeBed,
      noise,
      noiseFilter,
      clickNoise,
      clickNoiseFilter,
    }
    if (!watching) {
      watching = true
      document.addEventListener("visibilitychange", () => syncDeskAudio())
    }
    return graph
  } catch {
    return null
  }
}

function running(): boolean {
  return getContext().state === "running"
}

function wake(then: () => void): void {
  if (running()) {
    then()
    return
  }
  void start().then(then).catch(() => {})
}

function tune(style: MusicStyle, g: Graph): void {
  g.lead.oscillator.type = style.lead.type
  g.lead.envelope.attack = style.lead.attack
  g.lead.envelope.decay = 0.08
  g.lead.envelope.sustain = 0.35
  g.lead.envelope.release = style.lead.release
  g.mono.oscillator.type = style.lead.type
  g.mono.envelope.attack = style.lead.attack
  g.mono.envelope.release = style.lead.release
  g.am.envelope.attack = style.lead.attack
  g.am.envelope.release = style.lead.release
  const padRelease = Math.max(0.2, style.step * style.pad.holdSteps)
  g.pad.set({
    oscillator: { type: style.pad.type },
    envelope: { attack: style.pad.attack, decay: 0.05, sustain: 0, release: padRelease },
  })
}

function playLead(g: Graph, style: MusicStyle, semi: number, time: number, level: number): void {
  const note = freq(semi)
  const dur = Math.max(0.03, Math.min(style.step * 0.85, style.lead.attack + style.lead.release))
  if (style.id === "synth") {
    g.mono.triggerAttackRelease(note, dur, time, style.lead.peak * level)
    return
  }
  if (style.id === "lofi") {
    g.am.triggerAttackRelease(note, dur, time, Math.min(1, style.lead.peak * 2.5 * level))
    return
  }
  g.lead.triggerAttackRelease(note, dur, time, style.lead.peak * level)
}

/** Lays every section end to end on one Part, so the loop is the whole track. */
function createPart(style: MusicStyle, g: Graph): Part<MusicEvent> {
  const events: MusicEvent[] = []
  const bassHold = Math.max(0.2, style.step * style.chordEvery * 0.9)
  let offset = 0
  for (const section of style.sections) {
    section.melody.forEach((semi, index) => {
      const downbeat = index % style.chordEvery === 0
      const tones = section.chords[Math.floor(index / style.chordEvery)] ?? []
      events.push({
        time: (offset + index) * style.step,
        semi,
        pad: downbeat && tones.length ? tones.map((tone) => freq(tone - 12)) : null,
        bass: downbeat && section.bass && tones.length ? freq((tones[0] ?? 0) - 24) : null,
        level: section.level,
        kick: downbeat && section.kick && Boolean(style.pulse),
      })
    })
    offset += section.melody.length
  }
  const piece = new Part<MusicEvent>((time, event) => {
    if (event.pad) g.pad.triggerAttackRelease([...event.pad], Math.max(0.05, style.pad.attack), time, style.pad.peak * event.level)
    if (event.bass !== null) g.pad.triggerAttackRelease(event.bass, bassHold, time, style.pad.peak * 1.4 * event.level)
    if (event.kick && style.pulse) g.kick.triggerAttackRelease(style.pulse.freq, 0.08, time, Math.min(0.9, style.pulse.peak * 5))
    if (typeof event.semi === "number") playLead(g, style, event.semi, time, event.level)
  }, events)
  piece.loop = true
  piece.loopEnd = styleSteps(style) * style.step
  piece.humanize = style.humanize > 0 ? style.humanize : false
  return piece
}

function silenceVoices(g: Graph): void {
  g.pad.releaseAll()
}

function stopMusic(): void {
  if (part) {
    part.stop()
    part.dispose()
    part = null
  }
  if (graph) silenceVoices(graph)
  if (canHear() && getTransport().state !== "stopped") getTransport().stop()
  playingStyle = null
}

function startTrack(style: MusicStyle, g: Graph): void {
  const transport = getTransport()
  const overlapped = transport.state !== "stopped"
  if (part) {
    part.stop()
    part.dispose()
    part = null
  }
  silenceVoices(g)
  if (overlapped) transport.stop()
  tune(style, g)
  part = createPart(style, g)
  part.start(0)
  // stop() and start() at the same sample can cancel each other.
  if (overlapped) transport.start("+0.05")
  else transport.start()
  playingStyle = style.id
}

function roomLive(): boolean {
  return Boolean(graph && readPrefs().sounds && !document.hidden && running())
}

const lastNoiseAt = new WeakMap<NoiseSynth | Synth, number>()

/**
 * A mono voice (noise or synth) throws on a start at or before its last one, which two events in
 * one audio block can ask for (fast taps, or taps queued while the context woke up). Nudge a clash
 * a hair later. A start far behind the last means a fresh audio clock.
 */
function noiseStart(voice: NoiseSynth | Synth, time: number): number {
  const last = lastNoiseAt.get(voice) ?? -1
  const at = time > last || last - time > 1 ? time : last + 0.002
  lastNoiseAt.set(voice, at)
  return at
}

function playKey(g: Graph, when = 0): void {
  const time = noiseStart(g.noise, now() + when)
  const down = Math.random() < 0.72
  g.noiseFilter.frequency.setValueAtTime((down ? 900 : 650) + Math.random() * 350, time)
  g.noise.triggerAttackRelease(down ? 0.03 : 0.022, time, down ? 0.035 : 0.02)
  g.blip.triggerAttackRelease((down ? 150 : 115) + Math.random() * 24, 0.05, time, 0.02)
}

/** A long, muffled run of keys, like someone typing a few sentences. Returns how long to wait after it. */
function playTyping(g: Graph): number {
  const count = 14 + Math.floor(Math.random() * 20)
  let at = 30
  for (let i = 0; i < count; i++) {
    const delay = at
    phraseTimers.push(window.setTimeout(() => {
      if (roomLive()) playKey(g)
    }, delay))
    at += 70 + Math.random() * 120
    if (Math.random() < 0.12) at += 250 + Math.random() * 400
  }
  return at + 600 + Math.random() * 900
}

function armRoom(delay: number): void {
  roomTimer = window.setTimeout(() => {
    roomTimer = 0
    if (!roomLive()) return
    armRoom(graph ? playTyping(graph) : 800)
  }, delay)
}

function stopRoom(): void {
  window.clearTimeout(roomTimer)
  roomTimer = 0
  for (const id of phraseTimers) window.clearTimeout(id)
  phraseTimers = []
}

/** The player's click in the chosen wooden kit, louder than the room keys. */
export function playCozyClick(): void {
  const prefs = readPrefs()
  if (!prefs.clicks || !canHear()) return
  const g = build()
  if (!g || (typeof document !== "undefined" && document.hidden)) return
  if (!running()) {
    wake(() => playCozyClick())
    return
  }
  const kit = clickKitById(prefs.clickKit)
  const time = noiseStart(g.wood, now())
  const body = kit.body.min + Math.random() * kit.body.spread
  Object.assign(g.wood.envelope, { attack: kit.wood.attack, decay: kit.wood.decay, release: kit.wood.release })
  g.woodHigh.oscillator.type = kit.high.type
  Object.assign(g.woodHigh.envelope, { attack: kit.high.attack, decay: kit.high.decay, release: kit.high.release })
  g.wood.triggerAttackRelease(body, kit.wood.hold, time, kit.wood.velocity)
  g.woodHigh.triggerAttackRelease(body * kit.high.ratio, kit.high.hold, noiseStart(g.woodHigh, time), kit.high.velocity)
  const grain = noiseStart(g.clickNoise, time)
  g.clickNoiseFilter.frequency.setValueAtTime(kit.grain.min + Math.random() * kit.grain.spread, grain)
  g.clickNoise.triggerAttackRelease(kit.grain.hold, grain, kit.grain.velocity)
  syncDeskAudio()
}

/**
 * A soft rising bell when something unlocks: two notes for a small one, a major-seventh arpeggio over a warm low note
 * for a big one. Quiet, slow to fade, never a beep.
 */
export function playUnlockChime(size: "big" | "standard" | "small"): void {
  const prefs = readPrefs()
  if (!(prefs.sounds || prefs.clicks) || !canHear()) return
  const g = build()
  if (!g || (typeof document !== "undefined" && document.hidden)) return
  if (!running()) {
    wake(() => playUnlockChime(size))
    return
  }
  syncDeskAudio()
  const steps = size === "small" ? [7, 12] : size === "standard" ? [0, 7, 12] : [0, 4, 7, 11, 16]
  const gap = size === "big" ? 0.11 : 0.09
  const start = now() + 0.03
  steps.forEach((semi, index) => {
    // Each note a touch softer than the last, so the run settles instead of climbing to a shout.
    const level = (size === "small" ? 0.16 : 0.2) * (1 - index * 0.08)
    g.chime.triggerAttackRelease(freq(semi + 12), 0.5, start + index * gap, level)
  })
  if (size === "big") g.chimeBed.triggerAttackRelease(freq(-12), 0.8, noiseStart(g.chimeBed, start), 0.14)
}

/** Starts or stops the room from the saved switches. Does not touch the audio context until a pointer or key. */
export function syncDeskAudio(): void {
  if (!canHear()) return
  const { music, sounds, clicks } = readPrefs()
  if (!music && !sounds && !clicks && !graph) return
  if (!gestureHeard()) return
  const g = build()
  if (!g) return
  if ((music || sounds || clicks) && !running()) {
    wake(() => syncDeskAudio())
    return
  }
  const audible = !document.hidden && running()
  g.musicGain.gain.setTargetAtTime(music && audible ? 0.75 : 0, now(), 0.08)
  g.soundGain.gain.setTargetAtTime((sounds || clicks) && audible ? 0.9 : 0, now(), 0.04)
  if (sounds && audible && !roomTimer) armRoom(280 + Math.random() * 420)
  if (!sounds || !audible) stopRoom()
  if (!music || !audible) {
    if (!music) stopMusic()
    else if (getTransport().state === "started") getTransport().pause()
    return
  }
  const wanted = musicStyleById(readPrefs().musicStyle)
  if (playingStyle !== wanted.id || !part) startTrack(wanted, g)
  else if (getTransport().state !== "started") getTransport().start()
}
