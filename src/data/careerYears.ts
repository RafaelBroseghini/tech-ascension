import type { LeadId } from "./leadership.ts"
import type { OriginId } from "./origins.ts"

/**
 * The career's calendar: moments that fall on a year of the career, for everyone or for one path. The year itself is
 * read off lifetime XP (src/game/careerYear.ts), so a mark lands when the career gets there, not when a timer says.
 * `at` is years since the career began: 0.5 is half a year in, so it reads "Year 1"; 4 reads "Year 5". A path's own
 * marks are about where it came from and where its line leads; the shared ones are the ladder everybody climbs.
 * A drop-in table: nothing assumes how many rows there are.
 */
export type CareerMark = {
  id: string
  at: number
  title: string
  /** One line for the career log. */
  blurb: string
  /** Only a career that came from this origin has it. Left out, every career does. */
  origin?: OriginId
  /** Only a career on this leadership line has it. Left out, every line does. */
  lead?: LeadId
}

export const CAREER_MARKS: readonly CareerMark[] = [
  { id: "orientation", at: 0.5, title: "Orientation week", blurb: "A lanyard, a free tote bag and a very long syllabus.", origin: "college" },
  { id: "intro-cs-final", at: 1, title: "Intro CS final", blurb: "Eight a.m., one cheat sheet, no regrets.", origin: "college" },
  { id: "thesis-topic", at: 2, title: "Thesis topic approved", blurb: "Your advisor says 'interesting' and means it kindly.", origin: "college" },
  { id: "job-fair", at: 3, title: "Campus job fair", blurb: "Forty stickers, three recruiters and one real lead.", origin: "college" },
  { id: "graduation", at: 3.8, title: "Graduation", blurb: "The cap is rented. The degree is yours.", origin: "college" },

  { id: "week-one", at: 0.4, title: "Week 1 of 12", blurb: "The whole stack in a day. The instructor smiles.", origin: "bootcamp" },
  { id: "demo-day", at: 1, title: "Capstone demo day", blurb: "Your app loads on the projector on the first try.", origin: "bootcamp" },
  { id: "resume-review", at: 1.6, title: "Career services résumé review", blurb: "'Lead with the capstone.' You do.", origin: "bootcamp" },
  { id: "two-hundred", at: 2.2, title: "Two hundred applications", blurb: "Eleven replies. Three of them are real.", origin: "bootcamp" },
  { id: "first-callback", at: 3, title: "A callback", blurb: "A human being wants to talk to you on Thursday.", origin: "bootcamp" },

  { id: "form-27b", at: 0.3, title: "Withdrawal form 27-B", blurb: "The registrar wishes you luck. Sincerely.", origin: "dropout" },
  { id: "founders-dm", at: 1, title: "A founder's DM", blurb: "'We should build this together.' You already have.", origin: "dropout" },
  { id: "stealth", at: 1.7, title: "Stealth mode", blurb: "No users, no logo, a lot of confidence.", origin: "dropout" },
  { id: "runway", at: 2.5, title: "Runway check", blurb: "Four months of rent, two of ramen.", origin: "dropout" },
  { id: "pivot", at: 3.4, title: "Pivot number one", blurb: "It is a marketplace now. For what, you will decide later.", origin: "dropout" },

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
