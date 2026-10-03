/**
 * Performance reviews for a job you already hold.
 * Each prompt is a ridiculous 1:1 question. The three replies are the rating:
 * exceeds pays a raise, meets changes nothing, and the plan is a trade priced like any other event.
 */

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
  minJobId: number
  maxJobId: number
  question: string
  replies: readonly ReviewReply[]
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
    minJobId: 1,
    maxJobId: 6,
    question: "Walk me through this PR like I'm a golden retriever.",
    replies: replies("Sit. Stay. Here's the diff.", "The tests pass.", "I'll comment every line."),
  },
  {
    id: 2,
    minJobId: 1,
    maxJobId: 6,
    question: "Why is the build red?",
    replies: replies("I reverted it before this meeting.", "It's red a lot.", "I'll postmortem the linter."),
  },
  {
    id: 3,
    minJobId: 1,
    maxJobId: 6,
    question: "Where do you see yourself in five years?",
    replies: replies("On the other side of this table.", "Still here. The build's still red.", "Filling out this form, probably."),
  },
  {
    id: 4,
    minJobId: 7,
    maxJobId: 13,
    question: "Can you own this ambiguous project by Friday?",
    replies: replies("The spec is in your inbox.", "Define own.", "I'll make a tracker for the tracker."),
  },
  {
    id: 5,
    minJobId: 7,
    maxJobId: 13,
    question: "How do you feel about on-call?",
    replies: replies("I slept. The pages were nothing.", "My feelings are offline.", "I'll take every weekend until morale improves."),
  },
  {
    id: 6,
    minJobId: 7,
    maxJobId: 13,
    question: "Your PR description says \"fixes stuff\".",
    replies: replies("The commits tell the story.", "Stuff is fixed.", "I'll rewrite it as a novel."),
  },
  {
    id: 7,
    minJobId: 14,
    maxJobId: 19,
    question: "The exec summary needs to be one slide, and also thirty.",
    replies: replies("Sent. Both.", "I attached the doc.", "I'll schedule a pre-read for the pre-read."),
  },
  {
    id: 8,
    minJobId: 14,
    maxJobId: 19,
    question: "Are you still having fun?",
    replies: replies("The pager and I are fine.", "Fun is a different ticket.", "I'll book a coach and a calendar audit."),
  },
  {
    id: 9,
    minJobId: 14,
    maxJobId: 19,
    question: "We need a staff-level answer on this migration.",
    replies: replies("We don't migrate. We delete it.", "Next quarter.", "I'll form a working group."),
  },
  {
    id: 10,
    minJobId: 20,
    maxJobId: 25,
    question: "The board wants a number for a thing we haven't built.",
    replies: replies("A range and a date. Already sent.", "I said we'd circle back.", "I'll hire someone to own the narrative."),
  },
  {
    id: 11,
    minJobId: 20,
    maxJobId: 25,
    question: "Why did the launch slip?",
    replies: replies("It shipped. The blog is late.", "Dates are a social construct.", "I'll add a standup about the standup."),
  },
  {
    id: 12,
    minJobId: 26,
    maxJobId: 31,
    question: "Earth is asking if the habitat is on track.",
    replies: replies("The lights are on. That's the update.", "I forwarded the dashboard.", "I'll fly back for a listening tour."),
  },
  {
    id: 13,
    minJobId: 26,
    maxJobId: 31,
    question: "What's our moat on Mars?",
    replies: replies("The planet.", "Latency.", "I'll commission a study of the dust."),
  },
]

const REVIEW_BY_ID = new Map<number, ReviewPrompt>(REVIEWS.map((prompt) => [prompt.id, prompt]))

export function reviewById(id: number): ReviewPrompt | undefined {
  return REVIEW_BY_ID.get(id)
}

/** Prompts whose job band includes this id. */
export function promptsForJob(jobId: number): ReviewPrompt[] {
  return REVIEWS.filter((prompt) => jobId >= prompt.minJobId && jobId <= prompt.maxJobId)
}
