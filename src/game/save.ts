import type { ActiveBoost } from "../data/boosts.ts"
import { idlePerSec } from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { formatNumber } from "./format.ts"

export const SAVE_VERSION = 3
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
export const OFFLINE_TOAST_MIN_MS = 5_000

export type SaveV1 = {
  version: 3
  money: number
  xp: number
  /** Owned counts keyed by stage key (see tiers.ts). Unknown keys are kept. */
  owned: OwnedMap
  savedAt: number
  /** Omitted when no boost is running. Cleared on load if endsAt has passed. */
  activeBoost?: ActiveBoost
  /** Highest balance ever held. Gates which shop rows are revealed. Older saves omit it. */
  peakMoney?: number
}

export type Hydrated = {
  save: SaveV1
  toast: string | null
}

/**
 * Version 1 saves keyed owned counts by the original 48 tier ids. Stages added in
 * version 2 shifted most ids, so v1 -> v2 re-keys owned counts through this table.
 * Never edit it: it describes a frozen past layout.
 */
export const V1_TO_V2_TIER_IDS: Readonly<Record<string, number>> = {
  1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13, 9: 15, 10: 17, 11: 19, 12: 21, 13: 23, 14: 24, 15: 26, 16: 28, 17: 29, 18: 31, 19: 32, 20: 33, 21: 34, 22: 36, 23: 37, 24: 39, 25: 40, 26: 41, 27: 42, 28: 43, 29: 44, 30: 45, 31: 46, 32: 48, 33: 49, 34: 50, 35: 51, 36: 52, 37: 53, 38: 54, 39: 56, 40: 57, 41: 58, 42: 60, 43: 61, 44: 62, 45: 63, 46: 64, 47: 65, 48: 66,
}

/**
 * Version 2 saves keyed owned counts by the numeric tier id of the 66-stage layout.
 * Version 3 keys them by stable stage key. Frozen history: never edit.
 */
export const V2_IDS_TO_KEYS: Readonly<Record<string, string>> = {
  1: "used-laptop",
  2: "stack-overblow",
  3: "freecodechamp",
  4: "raspberry-pie",
  5: "youtoob-intro",
  6: "terminal-rice",
  7: "personal-githug",
  8: "mech-keyboard",
  9: "portfolio-gaggle",
  10: "free-notebook-gpu",
  11: "hackathon-weekend",
  12: "mac-minnie",
  13: "oss-ml-pr",
  14: "mining-rig-gpus",
  15: "bootcamp",
  16: "local-quantized-model",
  17: "internship",
  18: "hacker-newz",
  19: "junior-swe",
  20: "dockyard",
  21: "pytorchy-tensorflux",
  22: "cubernetes",
  23: "prod-ml-pipeline",
  24: "mid-ml-engineer",
  25: "openklaw",
  26: "first-llm-finetune",
  27: "vibe-coded-app",
  28: "ship-ai-feature",
  29: "senior-ml-swe",
  30: "tool-plug-server",
  31: "model-roadmap",
  32: "staff-ml-engineer",
  33: "principal-ai-architect",
  34: "frontier-llm-lab",
  35: "open-weights-drop",
  36: "small-foundation-model",
  37: "ai-saas",
  38: "coding-agent-swarm",
  39: "angel-stake",
  40: "found-ai-company",
  41: "whycombinator-batch",
  42: "series-a",
  43: "acquire-rival",
  44: "public-ai-company",
  45: "foundation-model-team",
  46: "gpu-supercluster",
  47: "blackwall-preorder",
  48: "frontier-llm",
  49: "inference-api-market",
  50: "chip-design-house",
  51: "fab-partnership",
  52: "accelerator-tape-out",
  53: "own-foundry",
  54: "regional-data-center",
  55: "campus-micro-reactor",
  56: "hyperscale-campus",
  57: "inference-edge-network",
  58: "undersea-cable",
  59: "booster-catch",
  60: "orbital-compute",
  61: "leo-constellation",
  62: "lunar-relay",
  63: "mars-habitat",
  64: "mars-power-grid",
  65: "mars-data-center",
  66: "mars-megacampus",
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

/**
 * migrations[n] upgrades a version-n document to version n+1.
 * Version 0 is an unversioned blob (or a legacy owned array).
 */
const MIGRATIONS: Migration[] = [
  (raw) => ({
    version: 1,
    money: raw.money,
    xp: raw.xp,
    owned: Array.isArray(raw.owned) ? legacyArrayToMap(raw.owned) : raw.owned,
    savedAt: raw.savedAt,
    activeBoost: raw.activeBoost,
  }),
  (raw) => ({
    ...raw,
    version: 2,
    owned: remapOwned(raw.owned, V1_TO_V2_TIER_IDS),
  }),
  (raw) => ({
    ...raw,
    version: 3,
    owned: remapOwned(raw.owned, V2_IDS_TO_KEYS),
  }),
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** The unversioned format stored counts by position in the original 48-tier list (id = index + 1). */
function legacyArrayToMap(values: unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  values.forEach((value, index) => {
    out[String(index + 1)] = value
  })
  return out
}

function remapOwned(raw: unknown, table: Readonly<Record<string, string | number>>): unknown {
  if (!isRecord(raw)) return raw
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    out[String(table[key] ?? key)] = value
  }
  return out
}

function normalizeOwned(raw: unknown): OwnedMap {
  const out: OwnedMap = {}
  if (!isRecord(raw)) return out
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) continue
    const count = finite(value)
    if (count > 0) out[key] = Math.floor(count)
  }
  return out
}

function normalizeBoost(raw: unknown): ActiveBoost | undefined {
  if (!isRecord(raw)) return undefined
  const mult = finite(raw.mult)
  const endsAt = finite(raw.endsAt)
  if (mult <= 0 || endsAt <= 0) return undefined
  return { mult, endsAt }
}

export function freshSave(now: number): SaveV1 {
  return {
    version: SAVE_VERSION,
    money: 0,
    xp: 0,
    owned: {},
    savedAt: now,
    peakMoney: 0,
  }
}

export function offlineCredit(cps: number, savedAt: number, now: number): number {
  if (!Number.isFinite(cps) || cps <= 0) return 0
  if (!Number.isFinite(savedAt) || !Number.isFinite(now) || now <= savedAt) return 0
  const elapsed = Math.min(now - savedAt, OFFLINE_CAP_MS)
  return cps * (elapsed / 1000)
}

/** Returns null when the payload cannot be salvaged. */
export function migrate(input: unknown): SaveV1 | null {
  if (!isRecord(input)) return null

  let version = typeof input.version === "number" && Number.isFinite(input.version) ? input.version : 0
  if (version < 0) return null

  let current: Record<string, unknown> = input
  if (version > SAVE_VERSION) {
    current = { ...input, version: SAVE_VERSION }
    version = SAVE_VERSION
  }

  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) return null
    const next = step(current)
    const nextVersion = typeof next.version === "number" ? next.version : version + 1
    if (nextVersion <= version) return null
    current = next
    version = nextVersion
  }

  const boost = normalizeBoost(current.activeBoost)
  const save: SaveV1 = {
    version: 3,
    money: Math.max(0, finite(current.money)),
    xp: Math.max(0, finite(current.xp)),
    owned: normalizeOwned(current.owned),
    savedAt: Math.max(0, finite(current.savedAt)),
  }
  if (boost) save.activeBoost = boost
  save.peakMoney = Math.max(save.money, finite(current.peakMoney))
  return save
}

export function hydrate(rawText: string | null, now: number): Hydrated {
  if (rawText == null) {
    return { save: freshSave(now), toast: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { save: freshSave(now), toast: "save was unreadable — new career started" }
  }

  const migrated = migrate(parsed)
  if (!migrated) {
    return { save: freshSave(now), toast: "save was unreadable — new career started" }
  }

  const credit = offlineCredit(idlePerSec(migrated.owned), migrated.savedAt, now)
  const elapsed = now - migrated.savedAt
  const save: SaveV1 = {
    ...migrated,
    money: migrated.money + credit,
    savedAt: now,
  }
  save.peakMoney = Math.max(save.peakMoney ?? 0, save.money)
  if (save.activeBoost && save.activeBoost.endsAt <= now) {
    delete save.activeBoost
  }

  const toast =
    elapsed >= OFFLINE_TOAST_MIN_MS && credit > 0
      ? `welcome back, credited $${formatNumber(credit)}`
      : null

  return { save, toast }
}
