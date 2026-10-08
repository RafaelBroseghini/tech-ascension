import type { Fault, Mix, RequestType, TargetName } from "../../game/studio/types.ts"
import type { Interview } from "./challenges.ts"
import { COMPONENTS } from "./components.ts"

export type QuestionId = "traffic" | "mix" | "cache" | "fanout" | "speed" | "uptime" | "budget" | "lag" | "faults"

export interface Question {
  readonly id: QuestionId
  /** What the player asks. */
  readonly ask: string
  /** The interviewer's answer, written from the interview's own scenario and targets so it cannot drift from them. */
  readonly answer: (interview: Interview) => string
  /** The targets this answer puts on the meters. */
  readonly reveals: readonly TargetName[]
}

const percent = (x: number) => `${Number((x * 100).toFixed(2))}%`
const count = (n: number) => n.toLocaleString("en-US")

const REQUEST_NAMES: Readonly<Record<RequestType, string>> = {
  read: "reads",
  write: "writes",
  static: "file requests",
  fanout: "posts sent to followers",
  message: "chat messages",
  upload: "uploads",
}

function mixLine(mix: Mix): string {
  const parts = (Object.keys(mix) as RequestType[]).map((type) => `${percent(mix[type] ?? 0)} ${REQUEST_NAMES[type]}`)
  return `${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]}.`
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
    ask: "How much traffic?",
    answer: ({ scenario }) => `About ${count(scenario.phases[0].rps)} requests a second.`,
    reveals: [],
  },
  {
    id: "mix",
    ask: "What kind of requests?",
    answer: ({ scenario }) => mixLine(scenario.phases[0].mix),
    reveals: [],
  },
  {
    id: "cache",
    ask: "Can anything be cached?",
    answer: ({ scenario }) => {
      const parts = [
        ...(scenario.cacheHitRate > 0 ? [`A cache would answer ${percent(scenario.cacheHitRate)} of the requests that reach it.`] : []),
        ...(scenario.edgeHitRate > 0 ? [`A CDN would answer ${percent(scenario.edgeHitRate)} of the requests that reach it.`] : []),
      ]
      if (parts.length > 0) return parts.join(" ")
      return "static" in scenario.phases[0].mix ? "Every file is static, so a CDN can serve them." : "Not much. Nearly every request needs a fresh answer."
    },
    reveals: [],
  },
  {
    id: "fanout",
    ask: "Does anything fan out?",
    answer: ({ scenario }) => (scenario.fanout > 1 ? `Each post becomes ${count(scenario.fanout)} writes, one per follower.` : "No. Each request is one unit of work."),
    reveals: [],
  },
  {
    id: "speed",
    ask: "How fast does it need to be?",
    answer: ({ targets }) => `${percent(targets.successRate)} of requests answered in every phase, and 95% of them within ${targets.p95Ms} ms.`,
    reveals: ["success", "p95"],
  },
  {
    id: "uptime",
    ask: "How much uptime?",
    answer: ({ targets }) => `${percent(targets.availability)} uptime.`,
    reveals: ["availability"],
  },
  {
    id: "budget",
    ask: "What's the budget?",
    answer: ({ targets }) => `At most $${count(targets.budgetPerMonth)} a month.`,
    reveals: ["budget"],
  },
  {
    id: "lag",
    ask: "How far behind can the queue get?",
    answer: ({ targets }) => `No more than ${targets.maxLagSeconds} seconds.`,
    reveals: ["lag"],
  },
  {
    id: "faults",
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
}

/** The targets the player knows from the questions asked. */
export function revealedTargets(asked: readonly QuestionId[]): ReadonlySet<TargetName> {
  return new Set(ROWS.filter((row) => asked.includes(row.id)).flatMap((row) => row.reveals))
}
