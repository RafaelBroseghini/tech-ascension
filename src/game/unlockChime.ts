import { playUnlockChime } from "./deskAudio.ts"
import { useGame } from "./store.ts"
import type { FeatureId } from "../data/features.ts"
import type { MoneyPop } from "./store.ts"

type Slice = { readonly unlocked: readonly FeatureId[]; readonly pop: MoneyPop | null }

/** Unlocks that land together (a board and the features it brings) ring once. */
const QUIET_MS = 900

type ChimeSize = "big" | "standard"

/** What a store change unlocked: a board is big, a new desk feature is standard, anything else nothing. A wipe or a new career never rings. */
export function chimeFor(state: Slice, previous: Slice): ChimeSize | null {
  if (state.pop && state.pop !== previous.pop && state.pop.kind === "unlock") return "big"
  if (state.unlocked.length > previous.unlocked.length) return "standard"
  return null
}

/** Rings the unlock chime on every unlock, once per burst. Returns the unsubscribe. */
export function watchUnlockChime(): () => void {
  let last = -Infinity
  return useGame.subscribe((state, previous) => {
    const size = chimeFor(state, previous)
    if (!size) return
    const at = Date.now()
    if (at - last < QUIET_MS) return
    last = at
    playUnlockChime(size)
  })
}
