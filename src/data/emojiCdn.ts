/**
 * emoji.gg art for catalog rows.
 *
 * The license allows use on a site that does not charge for the emoji, and
 * forbids redistributing the files. These are CDN URLs. Run
 * `node scripts/generate-emoji-manifest.mjs` to rebuild the assignment.
 */
import manifest from "./emojiManifest.json"

/** How long click-reaction art stays visible after a tap (all catalog rows). */
export const EMOJI_CLICK_MS = 500

export type EmojiArt = {
  label: string
  idle: string
  click: string
}

function table(section: Record<string, EmojiArt>): Readonly<Record<number, EmojiArt>> {
  return Object.fromEntries(Object.entries(section).map(([id, row]) => [Number(id), row]))
}

export const EMOJI_SKILLS = table(manifest.skill as Record<string, EmojiArt>)
export const EMOJI_GIGS = table(manifest.gig as Record<string, EmojiArt>)
export const EMOJI_JOBS = table(manifest.job as Record<string, EmojiArt>)
export const EMOJI_GEAR = table(manifest.gear as Record<string, EmojiArt>)
export const EMOJI_CAPITAL = table(manifest.capital as Record<string, EmojiArt>)

export const DESK_CAT_EMOJI = manifest.ui.deskCat
export const DESK_CAT_TITLE = manifest.ui.deskCatTitle
