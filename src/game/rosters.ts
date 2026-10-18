import { CAPITAL } from "../data/capital.ts"
import type { Era } from "../data/capital.ts"
import { GEAR_KINDS } from "../data/gear.ts"
import type { EmojiKind } from "../data/emojiAssets.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { ownedCount } from "./economy.ts"
import { formatNumber } from "./format.ts"
import { capitalUnlocked, equipmentOpen, gigBoardUnlocked, jobBoardUnlocked } from "./phase.ts"
import type { Gates } from "./phase.ts"

export type RosterKind = "skills" | "gigs" | "jobs" | "gear" | "capital"

/** Shop tab order. */
export const ROSTER_KINDS: readonly RosterKind[] = ["skills", "gigs", "jobs", "gear", "capital"]

export const ROSTER_LABEL: Record<RosterKind, string> = {
  skills: "Skills",
  gigs: "Gigs",
  jobs: "Jobs",
  gear: "Gear",
  capital: "Capital",
}

const ART_KIND: Record<RosterKind, EmojiKind> = {
  skills: "skill",
  gigs: "gig",
  jobs: "job",
  gear: "equipment",
  capital: "capital",
}

const ERA_LABEL: Record<Era, string> = {
  early: "Early era",
  mid: "Mid era",
  upper: "Upper era",
  q3: "Q3 era",
  end: "Endgame",
}

const GEAR_LABEL = new Map(GEAR_KINDS.map((kind) => [kind.id, kind.label]))

export type RosterProgress = Gates & { equipment: Record<string, number> }

export type RosterEntry = {
  key: string
  /** Emoji table and id for the row's art. */
  art: { kind: EmojiKind; id: number }
  /** 1-based slot in the catalog, so a gap shows how much is still out there. */
  no: number
  name: string
  /** Copies held. 1 for gigs and jobs. */
  count: number
  /** What the row gives, for the copies held. */
  lines: string[]
  /** Gear section or capital era. */
  group: string | null
}

/** A roster opens with its shop panel. */
export function rosterOpen(kind: RosterKind, p: RosterProgress): boolean {
  if (kind === "gigs") return gigBoardUnlocked(p)
  if (kind === "jobs") return jobBoardUnlocked(p)
  if (kind === "gear") return equipmentOpen(p)
  if (kind === "capital") return capitalUnlocked(p)
  return true
}

export function openRosters(p: RosterProgress): RosterKind[] {
  return ROSTER_KINDS.filter((kind) => rosterOpen(kind, p))
}

function money(n: number): string {
  return `$${formatNumber(n)}`
}

function entry(kind: RosterKind, id: number, no: number, name: string, count: number, lines: string[], group: string | null = null): RosterEntry {
  return { key: `${kind}:${id}`, art: { kind: ART_KIND[kind], id }, no, name, count, lines: lines.filter(Boolean), group }
}

/** Only what the player holds, in catalog order. Nothing locked or unbought ever shows. */
export function rosterEntries(kind: RosterKind, p: RosterProgress): RosterEntry[] {
  const rows: RosterEntry[] = []
  if (kind === "skills") {
    SKILL_TIERS.forEach((row, index) => {
      const count = ownedCount(p.skills, row.id)
      if (count === 0) return
      rows.push(
        entry(kind, row.id, index + 1, row.name, count, [
          row.xpPerClick > 0 ? `+${formatNumber(row.xpPerClick * count)} XP/click` : "",
          row.xpPerSec > 0 ? `+${formatNumber(row.xpPerSec * count)} XP/s` : "",
        ]),
      )
    })
  } else if (kind === "gigs") {
    GIGS.forEach((gig, index) => {
      if (!p.gigs.includes(gig.id)) return
      rows.push(
        entry(kind, gig.id, index + 1, gig.name, 1, [
          `${money(gig.lump)} paid`,
          gig.retainerCps > 0 ? `${money(gig.retainerCps)}/s retainer` : "",
        ]),
      )
    })
  } else if (kind === "jobs") {
    JOB_TIERS.forEach((job, index) => {
      if (!p.jobs.includes(job.id)) return
      rows.push(
        entry(kind, job.id, index + 1, job.name, 1, [
          job.cps > 0 ? `${money(job.cps)}/s salary` : "Unpaid",
          job.clickBonus > 0 ? `+${money(job.clickBonus)}/click` : "",
          job.clickPct > 0 ? `+${job.clickPct}% of $/s per click` : "",
          job.xpPerSec > 0 ? `+${formatNumber(job.xpPerSec)} XP/s` : "",
          job.xpLump > 0 ? `+${formatNumber(job.xpLump)} XP on hire` : "",
        ]),
      )
    })
  } else if (kind === "gear") {
    EQUIPMENT.forEach((row, index) => {
      const count = ownedCount(p.equipment, row.id)
      if (count === 0) return
      rows.push(
        entry(
          kind,
          row.id,
          index + 1,
          row.name,
          count,
          [row.clickBonus > 0 ? `+${money(row.clickBonus * count)}/click` : "", row.cps > 0 ? `${money(row.cps * count)}/s` : ""],
          GEAR_LABEL.get(row.kind) ?? null,
        ),
      )
    })
  } else {
    CAPITAL.forEach((tier, index) => {
      const count = ownedCount(p.owned, tier.id)
      if (count === 0) return
      rows.push(
        entry(
          kind,
          tier.id,
          index + 1,
          tier.name,
          count,
          [tier.cps > 0 ? `${money(tier.cps * count)}/s` : "", tier.clickBonus > 0 ? `+${money(tier.clickBonus * count)}/click` : ""],
          ERA_LABEL[tier.era],
        ),
      )
    })
  }
  return rows
}
