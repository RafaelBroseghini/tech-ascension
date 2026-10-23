/**
 * Performance reviews for a job you already hold. A prompt serves a band of job ranks, `minJobRank` to `maxJobRank`.
 * Each prompt is a ridiculous 1:1 question. The three replies are the rating:
 * exceeds pays a raise, meets changes nothing, and the plan is a trade priced like any other event.
 */

import type { LeadId } from "./leadership.ts"
import { jobRank } from "./phases.ts"
import type { SpecId } from "./specializations.ts"

export type ReviewChoiceId = "exceeds" | "meets" | "pip"

export type ReviewReply = {
  choice: ReviewChoiceId
  /** What you say in the room. */
  label: string
  /** What the manager writes down. */
  rating: string
}

export type ReviewPrompt = {
  id: number
  minJobRank: number
  maxJobRank: number
  question: string
  replies: readonly ReviewReply[]
  /** Only a career on one of these specializations is asked (the build's own questions). Left out, any. */
  specs?: readonly SpecId[]
  /** Only a career on one of these leadership lines is asked. Left out, any. */
  leads?: readonly LeadId[]
}

function replies(exceeds: string, meets: string, pip: string): readonly ReviewReply[] {
  return [
    { choice: "exceeds", label: exceeds, rating: "Exceeds expectations" },
    { choice: "meets", label: meets, rating: "Meets expectations" },
    { choice: "pip", label: pip, rating: "Performance improvement plan" },
  ]
}

export const REVIEWS: readonly ReviewPrompt[] = [
  {
    id: 1,
    minJobRank: 1,
    maxJobRank: 6,
    question: "Walk me through this PR like I'm a golden retriever.",
    replies: replies("Sit. Stay. Here's the diff.", "The tests pass.", "I'll comment every line."),
  },
  {
    id: 2,
    minJobRank: 1,
    maxJobRank: 6,
    question: "Why is the build red?",
    replies: replies("I reverted it before this meeting.", "It's red a lot.", "I'll postmortem the linter."),
  },
  {
    id: 3,
    minJobRank: 1,
    maxJobRank: 6,
    question: "Where do you see yourself in five years?",
    replies: replies("On the other side of this table.", "Still here. The build's still red.", "Filling out this form, probably."),
  },
  {
    id: 4,
    minJobRank: 7,
    maxJobRank: 13,
    question: "Can you own this ambiguous project by Friday?",
    replies: replies("The spec is in your inbox.", "Define own.", "I'll make a tracker for the tracker."),
  },
  {
    id: 5,
    minJobRank: 7,
    maxJobRank: 13,
    question: "How do you feel about on-call?",
    replies: replies("I slept. The pages were nothing.", "My feelings are offline.", "I'll take every weekend until morale improves."),
  },
  {
    id: 6,
    minJobRank: 7,
    maxJobRank: 13,
    question: "Your PR description says \"fixes stuff\".",
    replies: replies("The commits tell the story.", "Stuff is fixed.", "I'll rewrite it as a novel."),
  },
  {
    id: 7,
    minJobRank: 14,
    maxJobRank: 19,
    question: "The exec summary needs to be one slide, and also thirty.",
    replies: replies("Sent. Both.", "I attached the doc.", "I'll schedule a pre-read for the pre-read."),
  },
  {
    id: 8,
    minJobRank: 14,
    maxJobRank: 19,
    question: "Are you still having fun?",
    replies: replies("The pager and I are fine.", "Fun is a different ticket.", "I'll book a coach and a calendar audit."),
  },
  {
    id: 9,
    minJobRank: 14,
    maxJobRank: 19,
    question: "We need a staff-level answer on this migration.",
    replies: replies("We don't migrate. We delete it.", "Next quarter.", "I'll form a working group."),
  },
  {
    id: 10,
    minJobRank: 20,
    maxJobRank: 25,
    question: "The board wants a number for a thing we haven't built.",
    replies: replies("A range and a date. Already sent.", "I said we'd circle back.", "I'll hire someone to own the narrative."),
  },
  {
    id: 11,
    minJobRank: 20,
    maxJobRank: 25,
    question: "Why did the launch slip?",
    replies: replies("It shipped. The blog is late.", "Dates are a social construct.", "I'll add a standup about the standup."),
  },
  {
    id: 12,
    minJobRank: 26,
    maxJobRank: 31,
    question: "Earth is asking if the habitat is on track.",
    replies: replies("The lights are on. That's the update.", "I forwarded the dashboard.", "I'll fly back for a listening tour."),
  },
  {
    id: 13,
    minJobRank: 26,
    maxJobRank: 31,
    question: "What's our moat on Mars?",
    replies: replies("The planet.", "Latency.", "I'll commission a study of the dust."),
  },
  {
    id: 14,
    minJobRank: 8,
    maxJobRank: 31,
    specs: ["frontend"],
    question: "Why does the button jump when the font loads?",
    replies: replies("It doesn't. I have a screen recording.", "Layout shift is a feature.", "I'll write a manifesto on font loading."),
  },
  {
    id: 15,
    minJobRank: 8,
    maxJobRank: 31,
    specs: ["backend"],
    question: "Why is the endpoint called /v2/final-FINAL?",
    replies: replies("The deprecation notice went out. Six months ago.", "The v1 clients are loyal.", "I'll version the versioning."),
  },
  {
    id: 16,
    minJobRank: 8,
    maxJobRank: 31,
    specs: ["infra"],
    question: "How many nines is this, exactly?",
    replies: replies("As many as you can afford.", "We round up.", "I'll count them in a spreadsheet."),
  },
  {
    id: 17,
    minJobRank: 8,
    maxJobRank: 31,
    specs: ["ai"],
    question: "Is the model hallucinating, or is the roadmap?",
    replies: replies("Both, and the eval says so.", "Temperature is a state of mind.", "I'll put a disclaimer on the disclaimer."),
  },
  {
    id: 18,
    minJobRank: 8,
    maxJobRank: 31,
    specs: ["fde"],
    question: "The customer wants it \"more intuitive\". What does that mean?",
    replies: replies("I sat next to them. It means the blue one.", "We'll get a call.", "I'll fly out with a whiteboard."),
  },
  {
    id: 19,
    minJobRank: 8,
    maxJobRank: 31,
    specs: ["security"],
    question: "Who has root on the coffee machine?",
    replies: replies("Nobody. I rotated the beans.", "A shared account, probably.", "I'll threat-model the espresso."),
  },
  {
    id: 20,
    minJobRank: 16,
    maxJobRank: 31,
    leads: ["ic"],
    question: "When did you last ship something yourself?",
    replies: replies("This morning. It was small and it was right.", "Last quarter. It was a doc.", "I'll pair with the sticker on my laptop."),
  },
  {
    id: 21,
    minJobRank: 16,
    maxJobRank: 31,
    leads: ["manager"],
    question: "Who owns this when you're on vacation?",
    replies: replies("The team. Nobody paged me.", "Slack knows.", "I'll write a handoff doc for the handoff doc."),
  },
]

const REVIEW_BY_ID = new Map<number, ReviewPrompt>(REVIEWS.map((prompt) => [prompt.id, prompt]))

export function reviewById(id: number): ReviewPrompt | undefined {
  return REVIEW_BY_ID.get(id)
}

/** The career's build, which picks the 1:1s that are its own. */
export type ReviewBuild = { spec?: SpecId | null; lead?: LeadId | null }

/**
 * Prompts whose rank band includes this job's rank. A prompt that names specializations or lines is only asked of a
 * career on one of them (`build`); without a build only the prompts for everyone are left.
 */
export function promptsForJob(jobId: number, build: ReviewBuild = {}): ReviewPrompt[] {
  const rank = jobRank(jobId)
  return REVIEWS.filter(
    (prompt) =>
      rank >= prompt.minJobRank &&
      rank <= prompt.maxJobRank &&
      (!prompt.specs || (build.spec != null && prompt.specs.includes(build.spec))) &&
      (!prompt.leads || (build.lead != null && prompt.leads.includes(build.lead))),
  )
}
