/**
 * Who the career is: a Tailscale-style handle (`quiet-otter`), the one name GitHug and LinkedOut show. It only ever
 * comes from the word lists below: a new career draws one, the player may reroll it until they keep it, and nothing
 * typed is ever shown. Kept small: the save loads it at boot.
 */

export type Identity = { handle: string }

/** The career's handle, and whether the player has kept it. Until then the start card offers rerolls. */
export type SavedIdentity = Identity & { chosen: boolean }

// Both lists are checked by hand for slang and slurs, alone, together and run together without the hyphen;
// identity.test.ts scans every pair again.
const ADJECTIVES = [
  "brisk", "calm", "clever", "cosmic", "cozy", "crisp", "curious", "daring", "eager", "fuzzy",
  "gentle", "glossy", "humble", "jolly", "lucky", "mellow", "nimble", "noisy", "plucky", "quiet",
  "quirky", "rapid", "rusty", "shiny", "silent", "snappy", "zesty", "sunny", "swift", "tidy",
  "tiny", "witty",
] as const

const ANIMALS = [
  "axolotl", "badger", "bobcat", "bison", "capybara", "corgi", "crow", "dingo", "falcon", "ferret",
  "gecko", "heron", "ibex", "jackal", "koala", "lemur", "lynx", "marmot", "narwhal", "ocelot",
  "otter", "pangolin", "panda", "puffin", "quokka", "moose", "salmon", "tapir", "toucan", "walrus",
  "wombat", "yak",
] as const

type Draw = () => number

function pick<T>(list: readonly T[], random: Draw): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))]!
}

/** Draws from `make` until it differs from `not` (a reroll always changes), then steps through `all` if stuck. */
function drawNew(make: () => string, not: string | undefined, all: () => string[]): string {
  for (let tries = 0; tries < 8; tries++) {
    const drawn = make()
    if (drawn !== not) return drawn
  }
  const every = all()
  return every[(every.indexOf(not ?? "") + 1) % every.length]!
}

/** Every handle the lists can draw. */
export function allHandles(): string[] {
  return ADJECTIVES.flatMap((adjective) => ANIMALS.map((animal) => `${adjective}-${animal}`))
}

/** An adjective-animal handle, different from `not`. */
export function randomHandle(random: Draw = Math.random, not?: string): string {
  return drawNew(() => `${pick(ADJECTIVES, random)}-${pick(ANIMALS, random)}`, not, allHandles)
}

/** A fresh identity. */
export function randomIdentity(random: Draw = Math.random): Identity {
  return { handle: randomHandle(random) }
}

function isHandle(value: unknown): value is string {
  if (typeof value !== "string") return false
  const [adjective, animal, ...rest] = value.split("-")
  return rest.length === 0 && (ADJECTIVES as readonly string[]).includes(adjective ?? "") && (ANIMALS as readonly string[]).includes(animal ?? "")
}

/**
 * A saved identity, only when its handle is one the lists can draw, so a hand-edited save can never put its own words
 * on screen. Undefined otherwise, and boot draws a fresh one. Any other field is dropped.
 */
export function normalizeIdentity(raw: unknown): SavedIdentity | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const row = raw as Record<string, unknown>
  if (!isHandle(row.handle)) return undefined
  return { handle: row.handle, chosen: row.chosen === true }
}

/** The letter on the avatar. */
export function initialOf(handle: string): string {
  return (handle.trim().charAt(0) || "?").toUpperCase()
}
