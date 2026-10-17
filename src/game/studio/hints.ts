import type { Interview } from "../../data/studio/challenges.ts"
import { COMPONENTS } from "../../data/studio/components.ts"
import type { ComponentKind, Design } from "./types.ts"

/** What a hint calls each component: the plain term, with the whiteboard's name beside it so the palette tile is easy to find. */
const NOUN: Readonly<Record<ComponentKind, string>> = {
  users: "users",
  api: "API server",
  sql: "SQL database",
  lb: "load balancer",
  cache: "cache",
  replica: "read replica",
  standby: "standby database",
  cdn: "CDN",
  blob: "blob store",
  queue: "queue",
  worker: "background worker",
  kv: "key-value store",
  socket: "socket server",
  bouncer: "rate limiter",
  autoscaler: "autoscaler",
  breaker: "circuit breaker",
  region: "second region",
  oncall: "on-call rotation",
}

const named = (kind: ComponentKind) => `${NOUN[kind]} (${COMPONENTS[kind].name})`
const article = (noun: string) => (/^[aeiou]/i.test(noun) ? "an" : "a")

const kindsOf = (design: Design, kind: ComponentKind) => design.nodes.filter((n) => n.kind === kind)

const kindOfNode = (design: Design, id: string): ComponentKind | undefined => design.nodes.find((n) => n.id === id)?.kind

/** The kinds in a design, once each, in the order the design first uses them. */
const distinctKinds = (design: Design): ComponentKind[] => [...new Set(design.nodes.map((n) => n.kind))]

/**
 * The next thing to give away about the interview's reference design, from the least revealing to the most: a
 * component kind the board lacks, then a wire between two kinds it lacks, then a replica count it falls short of.
 * Null once the board covers the reference. A board that differs from the reference but passes (a Strong hire design)
 * can still get a hint, since the reference is the only yardstick.
 */
export function nextHint(interview: Interview, design: Design): string | null {
  const { reference } = interview

  for (const kind of distinctKinds(reference)) {
    const needed = kindsOf(reference, kind).length
    const have = kindsOf(design, kind).length
    if (have < needed) return have === 0 ? `Add ${article(NOUN[kind])} ${named(kind)}.` : `Add another ${named(kind)}.`
  }

  for (const edge of reference.edges) {
    const from = kindOfNode(reference, edge.from)
    const to = kindOfNode(reference, edge.to)
    if (!from || !to) continue
    const wired = design.edges.some((e) => kindOfNode(design, e.from) === from && kindOfNode(design, e.to) === to)
    if (!wired) return `Connect the ${NOUN[from]} to the ${NOUN[to]}.`
  }

  for (const kind of distinctKinds(reference)) {
    const needed = kindsOf(reference, kind).reduce((sum, n) => sum + n.replicas, 0)
    const have = kindsOf(design, kind).reduce((sum, n) => sum + n.replicas, 0)
    if (have < needed) return `Run ${needed} replicas of the ${NOUN[kind]}.`
  }

  return null
}
