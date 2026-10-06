/**
 * Who the career is: a name, the same on every profile, and a web handle that has nothing to do with it, the way
 * people's handles rarely match their real names. Both only ever come from the word lists below: a new career draws
 * one of each, the player may reroll either until they keep them, and nothing typed is ever shown. Kept small: the
 * save loads it at boot.
 */

export type Identity = { name: string; handle: string }

/** The career's identity, and whether the player has kept it. Until then the start card offers rerolls. */
export type SavedIdentity = Identity & { chosen: boolean }

// Every list is checked by hand for slang, slurs and prank pairs ("Mike Hunt", "Ben Dover"), alone, together and run
// together without the space or hyphen; identity.test.ts scans every pair again.
const FIRST_NAMES = [
  "Ada", "Alex", "Amara", "Andre", "Bea", "Camila", "Dario", "Elena", "Emeka", "Farah",
  "Hana", "Ines", "Iris", "Jonah", "Jun", "Kai", "Lena", "Leo", "Mateo", "Maya",
  "Mei", "Nadia", "Noor", "Omar", "Priya", "Quinn", "Ravi", "Sofia", "Tariq", "Theo",
  "Yuki", "Zara",
] as const

const LAST_NAMES = [
  "Abara", "Bakker", "Castillo", "Chen", "Costa", "Dubois", "Eriksen", "Ferreira", "Fischer", "Garcia",
  "Haddad", "Ito", "Jensen", "Mehta", "Kim", "Kowalski", "Mendes", "Moreau", "Nakamura", "Novak",
  "Okafor", "Park", "Moreno", "Rossi", "Santos", "Silva", "Tanaka", "Varga", "Weber", "Yilmaz",
  "Zhou", "Nguyen",
] as const

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

/** Every full name the lists can draw. */
export function allNames(): string[] {
  return FIRST_NAMES.flatMap((first) => LAST_NAMES.map((last) => `${first} ${last}`))
}

/** Every handle the lists can draw. */
export function allHandles(): string[] {
  return ADJECTIVES.flatMap((adjective) => ANIMALS.map((animal) => `${adjective}-${animal}`))
}

/** A first and last name, different from `not`. */
export function randomName(random: Draw = Math.random, not?: string): string {
  return drawNew(() => `${pick(FIRST_NAMES, random)} ${pick(LAST_NAMES, random)}`, not, allNames)
}

/** An adjective-animal handle, different from `not`. */
export function randomHandle(random: Draw = Math.random, not?: string): string {
  return drawNew(() => `${pick(ADJECTIVES, random)}-${pick(ANIMALS, random)}`, not, allHandles)
}

/** A fresh name and handle, drawn apart. */
export function randomIdentity(random: Draw = Math.random): Identity {
  return { name: randomName(random), handle: randomHandle(random) }
}

function isName(value: unknown): value is string {
  if (typeof value !== "string") return false
  const [first, last, ...rest] = value.split(" ")
  return rest.length === 0 && (FIRST_NAMES as readonly string[]).includes(first ?? "") && (LAST_NAMES as readonly string[]).includes(last ?? "")
}

function isHandle(value: unknown): value is string {
  if (typeof value !== "string") return false
  const [adjective, animal, ...rest] = value.split("-")
  return rest.length === 0 && (ADJECTIVES as readonly string[]).includes(adjective ?? "") && (ANIMALS as readonly string[]).includes(animal ?? "")
}

/**
 * A saved identity, only when both the name and the handle are ones the lists can draw, so a hand-edited save can
 * never put its own words on screen. Undefined otherwise, and boot draws a fresh one.
 */
export function normalizeIdentity(raw: unknown): SavedIdentity | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const row = raw as Record<string, unknown>
  if (!isName(row.name) || !isHandle(row.handle)) return undefined
  return { name: row.name, handle: row.handle, chosen: row.chosen === true }
}

/** The name as a profile URL slug, the way LinkedOut addresses people: "Maya Chen" → "maya-chen". */
export function nameSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/** The letter on the avatar. */
export function initialOf(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase()
}
