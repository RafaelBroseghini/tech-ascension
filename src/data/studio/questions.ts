import type { Fault, Feature, RequestType, TargetName } from "../../game/studio/types.ts"
import type { Interview } from "./challenges.ts"
import { COMPONENTS } from "./components.ts"

export type QuestionId =
  | "traffic"
  | "features"
  | "mix"
  | "fresh"
  | "durable"
  | "later"
  | "cache"
  | "fanout"
  | "speed"
  | "uptime"
  | "budget"
  | "lag"
  | "faults"

export interface Question {
  readonly id: QuestionId
  /** What the player asks. */
  readonly ask: string
  /** The label on the note the answer lands on, which is blank until the question is asked. */
  readonly topic: string
  /** The interviewer's answer, written from the interview's own scenario and targets so it cannot drift from them. */
  readonly answer: (interview: Interview) => string
  /** The targets this answer puts on the meters. */
  readonly reveals: readonly TargetName[]
}

const percent = (x: number) => `${Number((x * 100).toFixed(2))}%`
const count = (n: number) => n.toLocaleString("en-US")

const REQUEST_NAMES: Readonly<Record<RequestType, string>> = {
  read: "a read",
  write: "a write",
  static: "a file request",
  fanout: "a post sent to every follower",
  message: "a chat message",
  upload: "an upload",
}

const bullets = (lines: readonly string[]) => lines.map((line) => `• ${line}`).join("\n")

const storiesOf = (features: readonly Feature[], pick: (feature: Feature) => boolean) => features.filter(pick).map((feature) => feature.story)

/** A list answer, or the line to give when no feature qualifies. */
const listed = (features: readonly Feature[], pick: (feature: Feature) => boolean, some: string, none: string) => {
  const stories = storiesOf(features, pick)
  return stories.length > 0 ? `${some}\n${bullets(stories)}` : none
}

function faultLine(fault: Fault): string {
  switch (fault.kind) {
    case "killReplica":
      return `one ${COMPONENTS[fault.target].name} goes down`
    case "killDatabase":
      return "the database goes down"
    case "flushCache":
      return "everything in the cache disappears"
    case "slowDependency":
      return `${COMPONENTS[fault.target].name} slows down`
    case "regionOutage":
      return "a whole region goes dark"
    case "spike":
      return `traffic jumps to ${fault.multiplier}x`
    case "botFlood":
      return `bots arrive at ${fault.bots}x your real traffic`
  }
}

const queued = (interview: Interview) => interview.reference.nodes.some((n) => n.kind === "queue")

const ROWS: readonly Question[] = [
  {
    id: "traffic",
    topic: "Traffic",
    ask: "How much traffic?",
    answer: ({ scenario }) => `About ${count(scenario.phases[0].rps)} requests a second.`,
    reveals: [],
  },
  {
    id: "features",
    topic: "What users do",
    ask: "What can users do?",
    answer: ({ scenario }) => `Users can:\n${bullets(scenario.features.map((feature) => feature.story))}`,
    reveals: ["features"],
  },
  {
    id: "mix",
    topic: "Reads and writes",
    ask: "Who reads, and who writes?",
    answer: ({ scenario }) =>
      bullets(scenario.features.map((feature) => `${feature.story}: ${REQUEST_NAMES[feature.request]}, ${percent(feature.share)} of requests`)),
    reveals: [],
  },
  {
    id: "fresh",
    topic: "Fresh data",
    ask: "Do users need to see their own changes right away?",
    answer: ({ scenario }) =>
      listed(
        scenario.features,
        (feature) => feature.consistency === "strong",
        "Yes, for these. A copy that is a few seconds behind is not good enough:",
        "No. A few seconds of staleness goes unnoticed.",
      ),
    reveals: [],
  },
  {
    id: "durable",
    topic: "Lost data",
    ask: "Can we ever lose this data?",
    answer: ({ scenario }) =>
      listed(
        scenario.features,
        (feature) => feature.durable,
        "Never, for these. If it only lived in a cache, a restart would take it:",
        "Yes. Nothing here is worth a restore from backup.",
      ),
    reveals: [],
  },
  {
    id: "later",
    topic: "After the response",
    ask: "Does anything happen after the response?",
    answer: ({ scenario }) =>
      listed(
        scenario.features,
        (feature) => feature.async,
        "Yes. The user can be told it worked before these finish:",
        "No. Everything has to finish before the answer.",
      ),
    reveals: [],
  },
  {
    id: "cache",
    topic: "Caching",
    ask: "Can anything be cached?",
    answer: ({ scenario }) => {
      const parts = [
        ...(scenario.cacheHitRate > 0 ? [`A cache would answer ${percent(scenario.cacheHitRate)} of the requests that reach it.`] : []),
        ...(scenario.edgeHitRate > 0 ? [`A CDN would answer ${percent(scenario.edgeHitRate)} of the requests that reach it.`] : []),
      ]
      if (parts.length > 0) return parts.join(" ")
      return scenario.features.some((feature) => feature.request === "static")
        ? "Every file is static, so a CDN can serve them."
        : "Not much. Nearly every request needs a fresh answer."
    },
    reveals: [],
  },
  {
    id: "fanout",
    topic: "Fan-out",
    ask: "Does anything fan out?",
    answer: ({ scenario }) => (scenario.fanout > 1 ? `Each post becomes ${count(scenario.fanout)} writes, one per follower.` : "No. Each request is one unit of work."),
    reveals: [],
  },
  {
    id: "speed",
    topic: "Speed",
    ask: "How fast does it need to be?",
    answer: ({ targets }) => `${percent(targets.successRate)} of requests answered in every phase, and 95% of them within ${targets.p95Ms} ms.`,
    reveals: ["success", "p95"],
  },
  {
    id: "uptime",
    topic: "Uptime",
    ask: "How much uptime?",
    answer: ({ targets }) => `${percent(targets.availability)} uptime.`,
    reveals: ["availability"],
  },
  {
    id: "budget",
    topic: "Budget",
    ask: "What's the budget?",
    answer: ({ targets }) => `At most $${count(targets.budgetPerMonth)} a month.`,
    reveals: ["budget"],
  },
  {
    id: "lag",
    topic: "Queue lag",
    ask: "How far behind can the queue get?",
    answer: ({ targets }) => `No more than ${targets.maxLagSeconds} seconds.`,
    reveals: ["lag"],
  },
  {
    id: "faults",
    topic: "Curveballs",
    ask: "What could go wrong?",
    answer: ({ scenario }) => {
      const hits = scenario.phases.flatMap((phase) => (phase.fault ? [`${phase.name}: ${faultLine(phase.fault)}`] : []))
      return hits.length > 0 ? `${hits.join(". ")}.` : "Nothing. This one is a clean run."
    },
    reveals: ["faults"],
  },
]

/** The questions this interview can ask. The lag question only appears where the reference has a queue, as in the pass bar. */
export function questionsFor(interview: Interview): readonly Question[] {
  return ROWS.filter((row) => row.id !== "lag" || queued(interview))
}

export function questionById(id: string): Question | undefined {
  return ROWS.find((row) => row.id === id)
}

/** The question whose answer puts each target on the meters. */
export const QUESTION_FOR: Readonly<Record<TargetName, QuestionId>> = {
  budget: "budget",
  success: "speed",
  p95: "speed",
  lag: "lag",
  availability: "uptime",
  faults: "faults",
  features: "features",
}

/** The targets the player knows from the questions asked. */
export function revealedTargets(asked: readonly QuestionId[]): ReadonlySet<TargetName> {
  return new Set(ROWS.filter((row) => asked.includes(row.id)).flatMap((row) => row.reveals))
}

/** Every target this interview judges: what a passed interview, a practice run and the pass bar all show. */
export function allTargets(interview: Interview): ReadonlySet<TargetName> {
  return revealedTargets(questionsFor(interview).map((question) => question.id))
}
