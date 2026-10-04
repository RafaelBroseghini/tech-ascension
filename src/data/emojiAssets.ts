/** A catalog row with emoji.gg art, hotlinked from their CDN. */
import type { EmojiArt } from "./emojiCdn.ts"
import {
  DESK_CAT_CLICK_POOL,
  DESK_CAT_EMOJI,
  EMOJI_CLICK_MS,
  EMOJI_CAPITAL,
  EMOJI_GEAR,
  EMOJI_GIGS,
  EMOJI_JOBS,
  EMOJI_SKILLS,
} from "./emojiCdn.ts"

export type EmojiKind = "skill" | "gig" | "job" | "equipment" | "capital"

/** Stage art before the first skill (Used laptop). Manifest skill id 0, not a shop row. */
export const STAGE_START_EMOJI = { kind: "skill", id: 0 } as const

/** Cat sleeping on a computer, from emoji.gg, for the desk cat settings toggle. */
export function deskCatEmojiUrl(): string {
  return DESK_CAT_EMOJI
}

/** Random cat from emoji.gg when you tap the desk cat (idle art unchanged). */
export function randomDeskCatReactionUrl(): string {
  const pool = DESK_CAT_CLICK_POOL
  if (pool.length === 0) return DESK_CAT_EMOJI
  return pool[Math.floor(Math.random() * pool.length)]!
}

const TABLE: Readonly<Record<EmojiKind, Readonly<Record<number, EmojiArt>>>> = {
  skill: EMOJI_SKILLS,
  gig: EMOJI_GIGS,
  job: EMOJI_JOBS,
  equipment: EMOJI_GEAR,
  capital: EMOJI_CAPITAL,
}

/**
 * emoji.gg file that draws the word ERROR. It is a stamp, not catalog art.
 * The manifest is left as assigned; display swaps the stamp for a real emoji.
 */
const ERROR_STAMP = "https://cdn3.emoji.gg/emojis/Error.png"

/** Crown already used for Lab director. Board advisor (job 25) is the row still stuck on the stamp. */
const CROWN = "https://cdn3.emoji.gg/emojis/158897-crown.png"

const STAMP_IDLE: Partial<Record<EmojiKind, Readonly<Record<number, string>>>> = {
  job: { 25: CROWN },
}

function withoutStamp(kind: EmojiKind, id: number, url: string, other: string): string {
  if (url !== ERROR_STAMP) return url
  return STAMP_IDLE[kind]?.[id] ?? (other !== ERROR_STAMP ? other : CROWN)
}

function rowFor(kind: EmojiKind, id: number): EmojiArt | null {
  const row = TABLE[kind][id]
  if (!row) return null
  if (row.idle !== ERROR_STAMP && row.click !== ERROR_STAMP) return row
  const idle = withoutStamp(kind, id, row.idle, row.click)
  const click = withoutStamp(kind, id, row.click, idle)
  return { ...row, idle, click }
}

/** Click-reaction image, or null when this row has no emoji yet. */
export function emojiClickUrl(kind: EmojiKind, id: number): string | null {
  return rowFor(kind, id)?.click ?? null
}

/** Idle art. Shop, owned strip, stage between clicks. */
export function emojiIdleUrl(kind: EmojiKind, id: number): string | null {
  return rowFor(kind, id)?.idle ?? null
}

/** How long the click image stays up. */
export function emojiClickMs(_kind: EmojiKind, _id: number): number {
  return EMOJI_CLICK_MS
}

/** @deprecated use emojiIdleUrl */
export const emojiStillUrl = emojiIdleUrl

export function hasEmoji(kind: EmojiKind, id: number): boolean {
  return rowFor(kind, id) !== null
}

/** Furthest owned catalog row with art, else the opening high-school emoji. */
export function stageEmojiSource(source: { kind: EmojiKind; id: number } | undefined): {
  kind: EmojiKind
  id: number
} | null {
  if (source && hasEmoji(source.kind, source.id)) return source
  if (hasEmoji(STAGE_START_EMOJI.kind, STAGE_START_EMOJI.id)) return STAGE_START_EMOJI
  return null
}
