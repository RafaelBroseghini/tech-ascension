import type { AudienceShare } from "../../data/geo.ts"

/** The kinds of request the company's traffic is drawn as: a read and a write. */
export type RequestType = "read" | "write"

/** A request spends this long crossing the world before it reaches home. */
export const LEAD_MS = 900

/** One request on the globe: where it left from, when, and what became of it. */
export interface Unit {
  readonly id: number
  /** Milliseconds after its phase starts that it leaves its city, which is `LEAD_MS` before it reaches home. */
  readonly at: number
  readonly city: string
  readonly type: RequestType
  readonly fate: { readonly kind: "served" } | { readonly kind: "dropped" }
}

export interface WavePhase {
  readonly startMs: number
  readonly durationMs: number
  readonly units: readonly Unit[]
}

/** A burst of requests from the company's clients to its home region. */
export interface Wave {
  readonly audience: readonly AudienceShare[]
  readonly phases: readonly WavePhase[]
  readonly totalMs: number
}

/** How long a burst takes to leave its clients, and how often one is sent. */
export const BURST_MS = 4000
const MIN_UNITS = 12
const MAX_UNITS = 60

/**
 * One burst of the company's traffic: a request per slice of `rps`, dealt to the clients by share, a write in every
 * fourth. The last `dropShare` of the requests are dropped: capacity cannot serve them.
 */
export function burstOf(audience: readonly AudienceShare[], rps: number, dropShare = 0): Wave {
  const count = Math.max(MIN_UNITS, Math.min(MAX_UNITS, Math.round(Math.sqrt(Math.max(0, rps)) * 4)))
  const sent = audience.flatMap((client) => Array.from({ length: Math.max(1, Math.round(count * client.share)) }, () => client.city))
  const firstDrop = Math.floor(sent.length * (1 - dropShare))
  const units: Unit[] = sent.map((city, i) => ({
    id: i,
    at: Math.round((i / sent.length) * BURST_MS),
    city,
    type: i % 4 === 3 ? "write" : "read",
    fate: i >= firstDrop ? { kind: "dropped" } : { kind: "served" },
  }))
  return { audience, phases: [{ startMs: 0, durationMs: BURST_MS, units }], totalMs: BURST_MS }
}
