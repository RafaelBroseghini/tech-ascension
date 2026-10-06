import type { RoomPrefs } from "./deskAudioEngine.ts"

/**
 * The desk audio API the app calls. Tone.js and the synth graph live in deskAudioEngine.ts, a
 * separate chunk: it is fetched once the first paint is done (or on the first gesture), so the
 * library never delays boot and the first tap usually finds it already loaded.
 */

type Engine = typeof import("./deskAudioEngine.ts")

let readPrefs: () => RoomPrefs = () => ({ music: false, sounds: false, clicks: false, musicStyle: "cozy", clickKit: "thock" })
let engine: Engine | null = null
let loading: Promise<Engine | null> | null = null
let gestureHooked = false
let gestureHeard = false
/** One tap that landed while the engine was still on its way. More would play as a burst. */
let clickWaiting = false

function canHear(): boolean {
  if (typeof window === "undefined") return false
  const host = window as unknown as {
    AudioContext?: new () => AudioContext
    webkitAudioContext?: new () => AudioContext
  }
  return typeof host.AudioContext === "function" || typeof host.webkitAudioContext === "function"
}

function anyOn(): boolean {
  const { music, sounds, clicks } = readPrefs()
  return music || sounds || clicks
}

function loadEngine(): Promise<Engine | null> {
  loading ??= import("./deskAudioEngine.ts").then(
    (mod) => {
      mod.bindEngine(readPrefs, () => gestureHeard)
      engine = mod
      return mod
    },
    () => {
      loading = null
      return null
    },
  )
  return loading
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

function preloadWhenIdle(): void {
  if (!canHear()) return
  const run = () => {
    if (anyOn()) void loadEngine()
  }
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 4000 })
  else window.setTimeout(run, 1500)
}

export function bindDeskAudio(read: () => RoomPrefs): void {
  readPrefs = read
  armGestureUnlock()
  syncDeskAudio()
  preloadWhenIdle()
}

/** The player's click in the chosen wooden kit, louder than the room keys. */
export function playCozyClick(): void {
  if (!readPrefs().clicks || !canHear()) return
  gestureHeard = true
  if (engine) {
    engine.playCozyClick()
    return
  }
  if (clickWaiting) return
  clickWaiting = true
  void loadEngine().then((mod) => {
    clickWaiting = false
    mod?.playCozyClick()
  })
}

/**
 * The unlock chime. Only once the engine is loaded and the player has interacted: a chime that arrives late, after
 * the card it belongs to, is worse than none.
 */
export function playUnlockChime(size: "big" | "standard" | "small"): void {
  const { sounds, clicks } = readPrefs()
  if (!(sounds || clicks) || !canHear() || !gestureHeard || !engine) return
  engine.playUnlockChime(size)
}

/** Starts or stops the room from the saved switches. Does not touch the audio context until a pointer or key. */
export function syncDeskAudio(): void {
  if (!canHear()) return
  if (engine) {
    engine.syncDeskAudio()
    return
  }
  if (!anyOn()) return
  if (!gestureHeard) {
    armGestureUnlock()
    return
  }
  void loadEngine().then((mod) => mod?.syncDeskAudio())
}
