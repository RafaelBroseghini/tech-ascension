import { GOLD_SKILLS } from "../data/gold.ts"
import { BALANCE_MILESTONES } from "./milestones.ts"
import { capitalById, equipById, gigById, jobById, skillById } from "./economy.ts"
import { eventById } from "./events.ts"
import { featureById, triggerLabel } from "./features.ts"
import { formatNumber } from "./format.ts"
import { reviewById } from "./reviews.ts"
import { interviewById } from "./studio/interviews.ts"
import { formatPlayTime } from "./stats.ts"
import type { SavedCareer, SavedCareerEntry } from "./save.ts"

/**
 * The career journal: one entry per step of the career, kept in the save. The career log panel (the Git icon)
 * shows it as commits; the console's Output tab prints the same entries as JSON lines.
 */

export const CAREER_TYPES = [
  "start",
  "unlock",
  "learn",
  "gig",
  "hire",
  "gear",
  "invest",
  "phase",
  "era",
  "perk",
  "return",
  "event",
  "review",
  "interview",
  "milestone",
] as const

export type CareerType = (typeof CAREER_TYPES)[number]

/** Flat extras, one level deep, so every entry prints as a single JSON line. */
export type CareerData = Readonly<Record<string, number | string | boolean>>

export type CareerEntry = {
  /** Counts up from 1 for the whole career; trimming old entries never reuses one. */
  seq: number
  /** Epoch ms. */
  at: number
  type: CareerType
  /** What the entry is about: a feature id ("careerLog"), or a row key ("skill:8", "gig:3", "phase:B", "era:mid"). */
  ref: string
  /** Balance and lifetime XP at that moment. */
  money: number
  xpTotal: number
  data?: CareerData
}

/** A step to write. The store stamps it with the time, the next seq and the balances. */
export type CareerNote = { type: CareerType; ref: string; data?: CareerData }

/** The journal keeps the newest entries. A full career is about 1,500. */
export const CAREER_LOG_MAX = 2000

export type CareerJournal = {
  /** The next seq to hand out. */
  seq: number
  entries: CareerEntry[]
}

const TYPE_SET = new Set<string>(CAREER_TYPES)

export function isCareerType(value: unknown): value is CareerType {
  return typeof value === "string" && TYPE_SET.has(value)
}

export function emptyJournal(): CareerJournal {
  return { seq: 1, entries: [] }
}

/** Appends notes in order, all at `at`, and drops the oldest entries past the cap. */
export function appendNotes(
  journal: CareerJournal,
  notes: readonly CareerNote[],
  snapshot: { money: number; xpTotal: number },
  at: number,
): CareerJournal {
  if (notes.length === 0) return journal
  let seq = journal.seq
  const added = notes.map((note) => {
    const entry: CareerEntry = {
      seq: seq++,
      at,
      type: note.type,
      ref: note.ref,
      money: Math.floor(Math.max(0, snapshot.money)),
      xpTotal: Math.floor(Math.max(0, snapshot.xpTotal)),
    }
    if (note.data && Object.keys(note.data).length > 0) entry.data = note.data
    return entry
  })
  const entries = [...journal.entries, ...added]
  return { seq, entries: entries.length > CAREER_LOG_MAX ? entries.slice(entries.length - CAREER_LOG_MAX) : entries }
}

export function toSavedEntries(entries: readonly CareerEntry[]): SavedCareerEntry[] {
  return entries.map((entry) =>
    entry.data
      ? [entry.seq, entry.at, entry.type, entry.ref, entry.money, entry.xpTotal, { ...entry.data }]
      : [entry.seq, entry.at, entry.type, entry.ref, entry.money, entry.xpTotal],
  )
}

function cleanData(raw: unknown): CareerData | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null
  const out: Record<string, number | string | boolean> = {}
  let keys = 0
  for (const [key, value] of Object.entries(raw)) {
    if (++keys > 12 || key.length > 32) return null
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value
    else if (typeof value === "boolean") out[key] = value
    else if (typeof value === "string" && value.length <= 120) out[key] = value
    else return null
  }
  return out
}

const money0 = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0)

/**
 * Reads saved entries back. Anything that is not a well-formed tuple, a type this build does not know, or out of seq
 * order is dropped; bad extras are dropped from an otherwise good entry.
 */
export function fromSavedEntries(saved: readonly unknown[]): CareerEntry[] {
  const out: CareerEntry[] = []
  let last = 0
  for (const row of saved) {
    if (!Array.isArray(row) || (row.length !== 6 && row.length !== 7)) continue
    const [seq, at, type, ref, money, xpTotal, data] = row as unknown[]
    if (typeof seq !== "number" || !Number.isInteger(seq) || seq <= last) continue
    if (typeof at !== "number" || !Number.isFinite(at) || at < 0) continue
    if (!isCareerType(type) || typeof ref !== "string" || ref.length > 80) continue
    last = seq
    const entry: CareerEntry = { seq, at, type, ref, money: money0(money), xpTotal: money0(xpTotal) }
    const extra = row.length === 7 ? cleanData(data) : null
    if (extra && Object.keys(extra).length > 0) entry.data = extra
    out.push(entry)
  }
  return out.slice(-CAREER_LOG_MAX)
}

export function journalFromSave(saved: SavedCareer | undefined): CareerJournal {
  if (!saved) return emptyJournal()
  const entries = fromSavedEntries(saved.log)
  const top = entries.at(-1)?.seq ?? 0
  return { seq: Math.max(saved.seq, top + 1), entries }
}

const PHASE_NAMES: Record<string, string> = { A: "Skill grind", B: "Gig Board", C: "Job Board", D: "Capital" }
const ERA_NAMES: Record<string, string> = { early: "Early", mid: "Mid", upper: "Upper", q3: "Scale", end: "Endgame" }

function idOf(ref: string): number {
  const id = Number(ref.slice(ref.indexOf(":") + 1))
  return Number.isFinite(id) ? id : 0
}

/** The name of what an entry is about, or "" when there is nothing to name. */
export function entryName(entry: Pick<CareerEntry, "type" | "ref">): string {
  switch (entry.type) {
    case "unlock":
      return featureById(entry.ref)?.name ?? entry.ref
    case "learn":
      return skillById(idOf(entry.ref))?.name ?? entry.ref
    case "gig":
      return gigById(idOf(entry.ref))?.name ?? entry.ref
    case "hire":
      return jobById(idOf(entry.ref))?.name ?? entry.ref
    case "gear":
      return equipById(idOf(entry.ref))?.name ?? entry.ref
    case "invest":
      return capitalById(idOf(entry.ref))?.name ?? entry.ref
    case "phase":
      return PHASE_NAMES[entry.ref.slice("phase:".length)] ?? entry.ref
    case "era":
      return ERA_NAMES[entry.ref.slice("era:".length)] ?? entry.ref
    case "perk":
      return GOLD_SKILLS.find((row) => row.id === idOf(entry.ref))?.name ?? entry.ref
    case "event":
      return eventById(idOf(entry.ref))?.name ?? entry.ref
    case "review":
      return reviewById(idOf(entry.ref))?.question ?? entry.ref
    case "interview":
      return interviewById(entry.ref.slice("interview:".length))?.name ?? entry.ref
    case "milestone":
      return BALANCE_MILESTONES.find((row) => `milestone:${row.id}` === entry.ref)?.label ?? entry.ref
    case "start":
    case "return":
      return ""
  }
}

/** One JSON object per entry, flat, in a stable key order: what the Output tab prints. */
export function careerJson(entry: CareerEntry): Record<string, number | string | boolean> {
  const line: Record<string, number | string | boolean> = {
    seq: entry.seq,
    time: new Date(entry.at).toISOString(),
    type: entry.type,
  }
  if (entry.ref) line.ref = entry.ref
  const name = entryName(entry)
  if (name) line.name = name
  if (entry.type === "unlock") {
    const row = featureById(entry.ref)
    if (row) {
      line.size = row.size
      line.via = triggerLabel(row.trigger)
    }
  }
  if (entry.data) for (const [key, value] of Object.entries(entry.data)) line[key] = value
  line.money = entry.money
  line.xpTotal = entry.xpTotal
  return line
}

/** Marker colour in the career log. */
export type CareerTone = "unlock" | "career" | "work" | "buy" | "away" | "event"

export type CareerRow = { title: string; detail: string; tone: CareerTone }

const money = (n: number) => `$${formatNumber(n)}`

/** The human line for the career log panel. */
export function describeEntry(entry: CareerEntry): CareerRow {
  const name = entryName(entry)
  const data = entry.data ?? {}
  switch (entry.type) {
    case "start":
      return { title: "init: high school", detail: "a new career", tone: "career" }
    case "unlock": {
      const row = featureById(entry.ref)
      return { title: name, detail: row ? triggerLabel(row.trigger) : "", tone: "unlock" }
    }
    case "learn":
      return { title: `Learned ${name}`, detail: "skill", tone: "work" }
    case "gig": {
      const gig = gigById(idOf(entry.ref))
      return {
        title: `Cleared ${name}`,
        detail: gig ? `${money(gig.lump)}${gig.retainerCps > 0 ? ` · ${money(gig.retainerCps)}/s retainer` : ""}` : "gig",
        tone: "work",
      }
    }
    case "hire": {
      const job = jobById(idOf(entry.ref))
      return { title: `Hired: ${name}`, detail: job && job.cps > 0 ? `${money(job.cps)}/s salary` : "job", tone: "career" }
    }
    case "gear":
      return { title: `Bought ${name}`, detail: "gear", tone: "buy" }
    case "invest":
      return { title: `Invested: ${name}`, detail: "capital", tone: "buy" }
    case "phase":
      return { title: `${name} opened`, detail: "a new board", tone: "career" }
    case "era":
      return { title: `${name} era`, detail: "a new era of capital", tone: "career" }
    case "perk":
      return { title: `Claimed ${name}`, detail: "10x dev skill", tone: "buy" }
    case "return": {
      const away = typeof data.awayMs === "number" ? formatPlayTime(data.awayMs) : "a while"
      const got = [
        typeof data.creditedMoney === "number" && data.creditedMoney > 0 ? `+${money(data.creditedMoney)}` : "",
        typeof data.creditedXp === "number" && data.creditedXp > 0 ? `+${formatNumber(data.creditedXp)} XP` : "",
      ].filter(Boolean)
      return { title: `Back after ${away}`, detail: got.join(" · ") || "time away", tone: "away" }
    }
    case "event":
      return { title: name, detail: data.accepted === true ? "event · took it" : "event · passed", tone: "event" }
    case "review":
      return { title: "1:1", detail: typeof data.choice === "string" ? `answered: ${data.choice}` : "left without a reply", tone: "event" }
    case "interview": {
      if (data.verdict !== "noHire") {
        return { title: `Whiteboard: ${name}`, detail: data.verdict === "strongHire" ? "Strong hire" : "Hire", tone: "career" }
      }
      const missed = typeof data.missed === "string" ? data.missed.split(",").join(", ") : ""
      const cost = typeof data.penalty === "number" && data.penalty > 0 ? ` · -${formatNumber(data.penalty)} XP` : ""
      return { title: `Whiteboard: ${name}`, detail: `No hire${missed ? ` · missed ${missed}` : ""}${cost}`, tone: "event" }
    }
    case "milestone":
      return { title: name, detail: "milestone", tone: "career" }
  }
}

/** "now", "4m", "3h", "2d": how long ago, for the career log. */
export function agoLabel(at: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000))
  if (seconds < 45) return "now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}
