import type { LeadId } from "./leadership.ts"

/**
 * The career's calendar: moments that fall on a year of the career, for everyone or for one path. The year itself is
 * read off lifetime XP (src/game/careerYear.ts), so a mark lands when the career gets there, not when a timer says.
 * `at` is years since the career began: 0.5 is half a year in, so it reads "Year 1"; 4 reads "Year 5". A line's own
 * marks are about where it leads; the shared ones are the ladder everybody climbs.
 * A drop-in table: nothing assumes how many rows there are.
 */
export type CareerMark = {
  id: string
  at: number
  title: string
  /** One line for the career log. */
  blurb: string
  /** Only a career on this leadership line has it. Left out, every line does. */
  lead?: LeadId
}

export const CAREER_MARKS: readonly CareerMark[] = [
  { id: "first-client", at: 2, title: "A client who pays", blurb: "An invoice, an actual invoice, with your name on it." },
  { id: "first-job", at: 4, title: "A real badge", blurb: "Your own laptop, an onboarding doc and a very long Slack channel list." },
  { id: "first-promotion", at: 5.5, title: "First promotion", blurb: "Your manager 'wants to recognize your impact'." },
  { id: "owns-a-service", at: 7.5, title: "You own a service", blurb: "It is yours. So is the pager." },
  { id: "senior", at: 11, title: "Senior", blurb: "The new hires ask you before they ask the docs." },
  { id: "pick-a-line", at: 12.5, title: "The fork", blurb: "Keep building, or start building the people who build." },
  { id: "design-doc", at: 19, title: "The design doc everyone cites", blurb: "Linked in forty other docs. Read in none.", lead: "ic" },
  { id: "industry-voice", at: 25, title: "Industry voice", blurb: "They invite you to talk. You say yes to one in five.", lead: "ic" },
  { id: "first-report", at: 15, title: "A first direct report", blurb: "Your one-on-ones have an agenda, and now so do you.", lead: "manager" },
  { id: "org-of-forty", at: 21, title: "An org of forty", blurb: "You have a skip-level. You have a skip-skip-level.", lead: "manager" },
  { id: "sabbatical", at: 33, title: "Sabbatical", blurb: "A beach, a laptop you swear you will not open." },
]
