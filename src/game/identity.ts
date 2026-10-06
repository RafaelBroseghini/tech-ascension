/**
 * Who the career is: a display name and a handle, shared by the GitHug and LinkedOut profiles. They only ever come
 * from the word lists below, Tailscale style (`brisk-axolotl`, "Brisk Axolotl"): a new career draws one, the player
 * may reroll it until they keep one, and nothing typed is ever shown. Kept small: the save loads it at boot.
 */

export type Identity = { name: string; handle: string }

/** The career's identity, and whether the player has kept it. Until then the start card offers a reroll. */
export type SavedIdentity = Identity & { chosen: boolean }

// Checked by hand for slang, slurs and unlucky pairs, alone, together and with the hyphen dropped.
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

const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

function identityOf(adjective: string, animal: string): Identity {
  return { name: `${title(adjective)} ${title(animal)}`, handle: `${adjective}-${animal}` }
}

/** A fresh name and handle: one adjective, one animal. Never the same as `not`, so a reroll always changes it. */
export function randomIdentity(random: () => number = Math.random, not?: Identity): Identity {
  const pick = <T,>(list: readonly T[]) => list[Math.min(list.length - 1, Math.floor(random() * list.length))]!
  for (let tries = 0; tries < 8; tries++) {
    const drawn = identityOf(pick(ADJECTIVES), pick(ANIMALS))
    if (drawn.handle !== not?.handle) return drawn
  }
  // A stuck random source: step to the next animal instead.
  const [adjective = ADJECTIVES[0], animal = ANIMALS[0]] = (not?.handle ?? "").split("-")
  const next = ANIMALS[(ANIMALS.indexOf(animal as (typeof ANIMALS)[number]) + 1) % ANIMALS.length]!
  return identityOf(adjective, next)
}

/**
 * A saved identity, only when its handle is a pair the lists can draw; the name is rebuilt from it, so a hand-edited
 * save can never put its own words on screen. Undefined otherwise, and boot draws a fresh one.
 */
export function normalizeIdentity(raw: unknown): SavedIdentity | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const row = raw as Record<string, unknown>
  if (typeof row.handle !== "string") return undefined
  const [adjective, animal, ...rest] = row.handle.split("-")
  if (rest.length > 0 || !adjective || !animal) return undefined
  if (!(ADJECTIVES as readonly string[]).includes(adjective) || !(ANIMALS as readonly string[]).includes(animal)) return undefined
  return { ...identityOf(adjective, animal), chosen: row.chosen === true }
}

/** Every pair the lists can draw, for checking them all. */
export function allIdentities(): Identity[] {
  return ADJECTIVES.flatMap((adjective) => ANIMALS.map((animal) => identityOf(adjective, animal)))
}

/** The letter on the avatar. */
export function initialOf(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase()
}
