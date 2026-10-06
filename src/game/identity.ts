/**
 * Who the career is: a display name and a handle, shared by the GitHug and LinkedOut profiles. A new career draws
 * one at random, Tailscale style (`brisk-axolotl`, "Brisk Axolotl"), and the player can rename it from GitHug.
 * Kept small and dependency-free: the save loads it at boot.
 */

export type Identity = { name: string; handle: string }

const ADJECTIVES = [
  "brisk", "calm", "clever", "cosmic", "cozy", "crisp", "curious", "daring", "eager", "fuzzy",
  "gentle", "glossy", "humble", "jolly", "lucky", "mellow", "nimble", "noisy", "plucky", "quiet",
  "quirky", "rapid", "rusty", "shiny", "silent", "snappy", "spicy", "sunny", "swift", "tidy",
  "tiny", "witty",
] as const

const ANIMALS = [
  "axolotl", "badger", "beaver", "bison", "capybara", "corgi", "crow", "dingo", "falcon", "ferret",
  "gecko", "heron", "ibex", "jackal", "koala", "lemur", "lynx", "marmot", "narwhal", "ocelot",
  "otter", "pangolin", "panda", "puffin", "quokka", "raccoon", "salmon", "tapir", "toucan", "walrus",
  "wombat", "yak",
] as const

const HANDLE_MAX = 39
const NAME_MAX = 40

const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

/** A fresh name and handle: one adjective, one animal. */
export function randomIdentity(random: () => number = Math.random): Identity {
  const pick = <T,>(list: readonly T[]) => list[Math.min(list.length - 1, Math.floor(random() * list.length))]!
  const adjective = pick(ADJECTIVES)
  const animal = pick(ANIMALS)
  return { name: `${title(adjective)} ${title(animal)}`, handle: `${adjective}-${animal}` }
}

/** A handle the way GitHug takes them: lowercase letters, digits and single hyphens, at most 39. Null when nothing is left. */
export function cleanHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const handle = raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, HANDLE_MAX)
    .replace(/^-+|-+$/g, "")
  return handle.length > 0 ? handle : null
}

/** A display name: trimmed, single-spaced, at most 40 characters. Null when blank. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const name = raw.trim().replace(/\s+/g, " ").slice(0, NAME_MAX).trim()
  return name.length > 0 ? name : null
}

/** A saved identity, or undefined when it is missing or unusable. */
export function normalizeIdentity(raw: unknown): Identity | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const row = raw as Record<string, unknown>
  const name = cleanName(row.name)
  const handle = cleanHandle(row.handle)
  return name && handle ? { name, handle } : undefined
}

/** The letter on the avatar. */
export function initialOf(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase()
}
