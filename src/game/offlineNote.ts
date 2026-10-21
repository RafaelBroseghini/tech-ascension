import { formatNumber } from "./format.ts"
import { highestJobRank } from "./economy.ts"

/**
 * One sentence for the sticky note left on the desk while the player was away.
 * The first line of each pool is the short absence. Later hours rotate through the rest.
 * No payouts live here — hydrate still credits the idle cash and study XP.
 */

const STUDYING = [
  "The cat slept on the warm laptop.",
  "The notebook stayed open on the same page.",
  "A tutorial tab was still playing when you sat down.",
] as const

const RETAINER = [
  "The build stayed green.",
  "The retainer kept paying while you were out.",
  "CI didn't page anyone.",
] as const

const EMPLOYED = [
  "A recruiter emailed. You didn't answer.",
  "Standup happened without you.",
  "Your manager assumed you were heads-down.",
] as const

const SENIOR = [
  "The cluster kept training.",
  "A board thread grew while you were gone.",
  "Someone forwarded the deck. You can read it later.",
] as const

const EMPIRE = [
  "The habitat lights stayed on.",
  "Earth sent a meeting for a time you were asleep.",
  "The relay kept the link up.",
] as const

export type OfflineDiaryInput = {
  credit: number
  xpCredit: number
  jobs: readonly number[]
  elapsed: number
}

function diaryIndex(elapsed: number, size: number): number {
  if (!(size > 0)) return 0
  const hours = Math.floor(Math.max(0, elapsed) / 3_600_000)
  return hours % size
}

function poolFor(input: OfflineDiaryInput): readonly string[] {
  const rank = highestJobRank(input.jobs)
  if (rank >= 26) return EMPIRE
  if (rank >= 14) return SENIOR
  if (rank > 0) return EMPLOYED
  if (input.credit > 0) return RETAINER
  return STUDYING
}

/** The sentence stuck to the monitor. Stable for the same absence. */
export function offlineDiary(input: OfflineDiaryInput): string {
  const pool = poolFor(input)
  return pool[diaryIndex(input.elapsed, pool.length)] ?? pool[0] ?? ""
}

/** The credit line under the sentence. Null when the absence paid nothing. */
export function offlineCreditLine(credit: number, xpCredit: number): string | null {
  const money = credit > 0 ? `credited $${formatNumber(credit)}` : ""
  const study = xpCredit > 0 ? `studied +${formatNumber(xpCredit)} XP` : ""
  if (money && study) return `${money} and ${study}`
  return money || study || null
}

/**
 * Toast text for a return: the diary sentence, a newline, then the credit.
 * Null when nothing was earned, so a short or empty absence stays quiet.
 */
export function offlineToastText(input: OfflineDiaryInput): string | null {
  const credit = offlineCreditLine(input.credit, input.xpCredit)
  if (!credit) return null
  return `${offlineDiary(input)}\n${credit}`
}

/** Split a hydrated toast into the note and the credit line. Other toasts stay a single line. */
export function noteToast(
  text: string | null,
  id: number,
): { id: number; text: string; note?: string } | null {
  if (!text) return null
  const split = text.indexOf("\n")
  if (split <= 0) return { id, text }
  const sentence = text.slice(0, split)
  const credit = text.slice(split + 1)
  if (!sentence || !credit) return { id, text }
  return { id, text: credit, note: sentence }
}
