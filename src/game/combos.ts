/**
 * The kitchen's rules: which combos the career holds both ingredients of, and what they add together. Pure; the table
 * is src/data/combos.ts. A combo is found the moment both ingredients are held, and its bonus is read from what is held
 * (never from a stored list), so it holds in offline credit, in the harness and after an Exit with no extra bookkeeping.
 */
import { CAPITAL } from "../data/capital.ts"
import { COMBO_CAP_PCT, COMBOS } from "../data/combos.ts"
import type { Combo, ComboEffect, ComboRef, ComboRowKind } from "../data/combos.ts"
import { GEAR } from "../data/gear.ts"
import { GIGS, JOB_TIERS, jobRank, SKILL_TIERS } from "../data/phases.ts"
import { tagLabel } from "../data/tags.ts"
import type { Tag } from "../data/tags.ts"
import type { OwnedMap } from "./economy.ts"

/** What the combos read: the five things a career holds. */
export type ComboHoldings = {
  skills: OwnedMap
  equipment: OwnedMap
  owned: OwnedMap
  jobs: readonly number[]
  gigs: readonly number[]
}

const BY_ID = new Map<string, Combo>(COMBOS.map((row) => [row.id, row]))

export function comboById(id: string): Combo | undefined {
  return BY_ID.get(id)
}

const TAGS_OF = {
  skill: new Map<number, readonly Tag[]>(SKILL_TIERS.map((row) => [row.id, row.tags])),
  gig: new Map<number, readonly Tag[]>(GIGS.map((row) => [row.id, row.tags])),
  job: new Map<number, readonly Tag[]>(JOB_TIERS.map((row) => [row.id, row.tags])),
  gear: new Map<number, readonly Tag[]>(GEAR.map((row) => [row.id, row.tags])),
  capital: new Map<number, readonly Tag[]>(CAPITAL.map((row) => [row.id, row.tags])),
}

function heldRow(kind: keyof typeof TAGS_OF, id: number, h: ComboHoldings): boolean {
  switch (kind) {
    case "skill":
      return (h.skills[String(id)] ?? 0) > 0
    case "gear":
      return (h.equipment[String(id)] ?? 0) > 0
    case "capital":
      return (h.owned[String(id)] ?? 0) > 0
    case "gig":
      return h.gigs.includes(id)
    case "job":
      return h.jobs.includes(id)
  }
}

/** How many held rows carry each tag. A row counts once however many copies are held. */
export function tagCounts(h: ComboHoldings): Map<Tag, number> {
  const counts = new Map<Tag, number>()
  const add = (tags: readonly Tag[] | undefined) => {
    for (const name of tags ?? []) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const fromMap = (kind: "skill" | "gear" | "capital", map: OwnedMap) => {
    for (const [key, count] of Object.entries(map)) if (count > 0) add(TAGS_OF[kind].get(Number(key)))
  }
  fromMap("skill", h.skills)
  fromMap("gear", h.equipment)
  fromMap("capital", h.owned)
  for (const id of new Set(h.gigs)) add(TAGS_OF.gig.get(id))
  for (const id of new Set(h.jobs)) add(TAGS_OF.job.get(id))
  return counts
}

function holds(ref: ComboRef, h: ComboHoldings, counts: () => Map<Tag, number>): boolean {
  if (ref.kind === "tag") return (counts().get(ref.tag) ?? 0) >= ref.count
  if (ref.kind === "jobRank") return h.jobs.some((id) => jobRank(id) === ref.rank)
  return heldRow(ref.kind, ref.id, h)
}

/** Every combo whose two ingredients are held, in table order. */
export function foundCombos(h: ComboHoldings): Combo[] {
  let counted: Map<Tag, number> | null = null
  const counts = () => (counted ??= tagCounts(h))
  return COMBOS.filter((row) => holds(row.a, h, counts) && holds(row.b, h, counts))
}

/** Ids from a save: known combos only, once each, in table order. */
export function normalizeComboIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set(raw.filter((id): id is string => typeof id === "string"))
  return COMBOS.filter((row) => ids.has(row.id)).map((row) => row.id)
}

/** Found combos not in `known` yet: what a purchase just revealed. */
export function newCombos(h: ComboHoldings, known: readonly string[]): Combo[] {
  return foundCombos(h).filter((row) => !known.includes(row.id))
}

/** Multipliers folded into each rate, in the shape `modFactors` uses. */
export type ComboFactors = { click: number; cps: number; xpIdle: number }

export const NO_COMBO_FACTORS: ComboFactors = { click: 1, cps: 1, xpIdle: 1 }

/** Percent added per effect kind, each capped at COMBO_CAP_PCT. */
export function comboTotals(found: readonly Combo[]): Record<ComboEffect["kind"], number> {
  const sum = { idle: 0, click: 0, xp: 0 }
  for (const row of found) sum[row.effect.kind] += row.effect.pct
  return { idle: Math.min(COMBO_CAP_PCT, sum.idle), click: Math.min(COMBO_CAP_PCT, sum.click), xp: Math.min(COMBO_CAP_PCT, sum.xp) }
}

export function factorsOf(found: readonly Combo[]): ComboFactors {
  const total = comboTotals(found)
  if (total.idle === 0 && total.click === 0 && total.xp === 0) return NO_COMBO_FACTORS
  return { cps: 1 + total.idle / 100, click: 1 + total.click / 100, xpIdle: 1 + total.xp / 100 }
}

let memo: { h: ComboHoldings; factors: ComboFactors } | null = null

/**
 * The bonus the holdings earn. The store reads this every tick and the desk every render, so the last answer is kept
 * while the five holdings are the same objects.
 */
export function comboFactors(h: ComboHoldings): ComboFactors {
  const last = memo
  if (last && last.h.skills === h.skills && last.h.equipment === h.equipment && last.h.owned === h.owned && last.h.jobs === h.jobs && last.h.gigs === h.gigs) {
    return last.factors
  }
  const factors = factorsOf(foundCombos(h))
  memo = { h: { skills: h.skills, equipment: h.equipment, owned: h.owned, jobs: h.jobs, gigs: h.gigs }, factors }
  return factors
}

const KIND_WORD: Record<ComboRef["kind"], string> = {
  skill: "a skill",
  gig: "a gig",
  job: "a job",
  jobRank: "a job",
  gear: "some gear",
  capital: "a stake in something big",
  tag: "",
}

const PLURAL_KIND: Record<ComboRowKind, string> = { skill: "skills", gig: "gigs", job: "jobs", gear: "pieces of gear", capital: "big stakes" }

function refHint(ref: ComboRef): string {
  return ref.kind === "tag" ? `${ref.count} ${tagLabel(ref.tag)} things` : KIND_WORD[ref.kind]
}

/** A vague clue for a combo not found yet: the kinds of its ingredients, never which ones. */
export function comboHint(row: Combo): string {
  const a = refHint(row.a)
  const b = refHint(row.b)
  if (a !== b) return `${a} and ${b}`
  if (row.a.kind === "tag") return `${a} twice over`
  return `two ${row.a.kind === "jobRank" ? PLURAL_KIND.job : PLURAL_KIND[row.a.kind]}`
}

const EFFECT_WORD: Record<ComboEffect["kind"], string> = { idle: "idle $/s", click: "per click", xp: "idle XP/s" }

/** "+3% per click". */
export function effectLabel(effect: ComboEffect): string {
  return `+${effect.pct}% ${EFFECT_WORD[effect.kind]}`
}
