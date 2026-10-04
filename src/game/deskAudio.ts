import "./toneQuiet.ts"
import {
  AMSynth,
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

type RoomPrefs = { music: boolean; sounds: boolean; clicks: boolean; musicStyle: MusicStyleId; clickKit: ClickKitId }
type DeskNoise = "type" | "coffee" | "click"
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
  clink: Synth
  noise: NoiseSynth
  noiseFilter: Filter
  sip: NoiseSynth
  sipFilter: Filter
}

const C4 = 261.63

let readPrefs: () => RoomPrefs = () => ({ music: false, sounds: false, clicks: false, musicStyle: "cozy", clickKit: "thock" })
let graph: Graph | null = null
let part: Part<MusicEvent> | null = null
let roomTimer = 0
let phraseTimers: number[] = []
let watching = false
let gestureHooked = false
let gestureHeard = false
let playingStyle: MusicStyleId | null = null

function canHear(): boolean {
  if (typeof window === "undefined") return false
  const host = window as unknown as {
    AudioContext?: new () => AudioContext
    webkitAudioContext?: new () => AudioContext
  }
  return typeof host.AudioContext === "function" || typeof host.webkitAudioContext === "function"
}

function armGestureUnlock(): void {
  if (gestureHooked || typeof window === "undefined") return
  gestureHooked = true
  const unlock = () => {
    gestureHeard = true
    syncDeskAudio()
  }
  window.addEventListener("pointerdown", unlock, { once: true, capture: true })
  window.addEventListener("keydown", unlock, { once: true, capture: true })
}

export function bindDeskAudio(read: () => RoomPrefs): void {
  readPrefs = read
  armGestureUnlock()
  syncDeskAudio()
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
    const clink = new Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 },
    }).connect(soundGain)
    const noiseFilter = new Filter({ type: "bandpass", frequency: 2000, Q: 0.8 }).connect(soundGain)
    const noise = new NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
    }).connect(noiseFilter)
    const sipFilter = new Filter({ type: "bandpass", frequency: 800, Q: 1.6 }).connect(soundGain)
    const sip = new NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0, release: 0.12 },
    }).connect(sipFilter)
    graph = { musicGain, soundGain, lead, mono, am, pad, kick, wood, woodHigh, blip, clink, noise, noiseFilter, sip, sipFilter }
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

function playKey(g: Graph, when = 0): void {
  const time = now() + when
  const down = Math.random() < 0.72
  g.noiseFilter.frequency.setValueAtTime((down ? 2400 : 1700) + Math.random() * 800, time)
  g.noise.triggerAttackRelease(down ? 0.015 : 0.01, time, down ? 0.05 : 0.03)
  g.blip.triggerAttackRelease((down ? 300 : 210) + Math.random() * 36, 0.028, time, 0.018)
}

/** A short run of keys, like someone typing a word. Returns how long to wait after it. */
function playTyping(g: Graph): number {
  const count = 3 + Math.floor(Math.random() * 6)
  let at = 30
  for (let i = 0; i < count; i++) {
    const delay = at
    phraseTimers.push(window.setTimeout(() => {
      if (roomLive()) playKey(g)
    }, delay))
    at += 48 + Math.random() * 85
  }
  return at + 380 + Math.random() * 640
}

/** Sip, then the cup goes back on the desk. */
function playCoffee(g: Graph): number {
  const time = now() + 0.02
  g.sipFilter.frequency.cancelScheduledValues(time)
  g.sipFilter.frequency.setValueAtTime(1600, time)
  g.sipFilter.frequency.exponentialRampToValueAtTime(380, time + 0.32)
  g.sip.triggerAttackRelease(0.32, time, 0.06)
  g.blip.triggerAttackRelease(2100 + Math.random() * 200, 0.05, time + 0.4, 0.035)
  g.clink.triggerAttackRelease(2800, 0.04, time + 0.41, 0.016)
  return 1100 + Math.random() * 900
}

/** A dry mouse click, quieter than the player's own tap. */
function playMouseClick(g: Graph): number {
  const time = now() + 0.02
  g.noiseFilter.frequency.setValueAtTime(3400 + Math.random() * 400, time)
  g.noise.triggerAttackRelease(0.008, time, 0.04)
  g.blip.triggerAttackRelease(920 + Math.random() * 80, 0.016, time, 0.028)
  if (Math.random() < 0.45) {
    const again = time + 0.09
    g.noiseFilter.frequency.setValueAtTime(3000, again)
    g.noise.triggerAttackRelease(0.007, again, 0.025)
    g.blip.triggerAttackRelease(760, 0.014, again, 0.018)
  }
  return 420 + Math.random() * 520
}

function nextNoise(): DeskNoise {
  const roll = Math.random()
  if (roll < 0.5) return "type"
  if (roll < 0.74) return "coffee"
  return "click"
}

function playNoise(kind: DeskNoise): number {
  const g = graph
  if (!g) return 800
  if (kind === "type") return playTyping(g)
  if (kind === "coffee") return playCoffee(g)
  return playMouseClick(g)
}

function armRoom(delay: number): void {
  roomTimer = window.setTimeout(() => {
    roomTimer = 0
    if (!roomLive()) return
    armRoom(playNoise(nextNoise()))
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
  gestureHeard = true
  const g = build()
  if (!g || (typeof document !== "undefined" && document.hidden)) return
  if (!running()) {
    wake(() => playCozyClick())
    return
  }
  const kit = clickKitById(prefs.clickKit)
  const time = now()
  const body = kit.body.min + Math.random() * kit.body.spread
  Object.assign(g.wood.envelope, { attack: kit.wood.attack, decay: kit.wood.decay, release: kit.wood.release })
  g.woodHigh.oscillator.type = kit.high.type
  Object.assign(g.woodHigh.envelope, { attack: kit.high.attack, decay: kit.high.decay, release: kit.high.release })
  g.wood.triggerAttackRelease(body, kit.wood.hold, time, kit.wood.velocity)
  g.woodHigh.triggerAttackRelease(body * kit.high.ratio, kit.high.hold, time, kit.high.velocity)
  g.noiseFilter.frequency.setValueAtTime(kit.grain.min + Math.random() * kit.grain.spread, time)
  g.noise.triggerAttackRelease(kit.grain.hold, time, kit.grain.velocity)
  syncDeskAudio()
}

/** Starts or stops the room from the saved switches. Does not touch the audio context until a pointer or key. */
export function syncDeskAudio(): void {
  if (!canHear()) return
  const { music, sounds, clicks } = readPrefs()
  if (!music && !sounds && !clicks && !graph) return
  if (!gestureHeard) {
    armGestureUnlock()
    return
  }
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
