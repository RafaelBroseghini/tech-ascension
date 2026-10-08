import {
  Archive,
  Cog,
  Copy,
  Database,
  DatabaseBackup,
  Globe,
  KeyRound,
  ListOrdered,
  MapPin,
  Plug,
  Scale,
  Server,
  ShieldBan,
  Siren,
  TrendingUp,
  Unplug,
  Users,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { designsOf } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { COMPONENTS } from "../../data/studio/components.ts"
import { unlockedIn } from "../../data/studio/unlocks.ts"
import type { CareerSoFar } from "../../data/studio/unlocks.ts"
import type { ComponentKind, RequestType } from "../../game/studio/types.ts"

export const KIND_ICON: Readonly<Record<ComponentKind, LucideIcon>> = {
  users: Users,
  api: Server,
  sql: Database,
  lb: Scale,
  cache: Zap,
  replica: Copy,
  standby: DatabaseBackup,
  cdn: Globe,
  blob: Archive,
  queue: ListOrdered,
  worker: Cog,
  kv: KeyRound,
  socket: Plug,
  bouncer: ShieldBan,
  autoscaler: TrendingUp,
  breaker: Unplug,
  region: MapPin,
  oncall: Siren,
}

/** Palette order: the request path first, then storage, async work and the safety nets. */
export const PALETTE_ORDER: readonly ComponentKind[] = [
  "lb",
  "api",
  "cache",
  "sql",
  "replica",
  "standby",
  "cdn",
  "blob",
  "queue",
  "worker",
  "kv",
  "socket",
  "bouncer",
  "autoscaler",
  "breaker",
  "oncall",
  "region",
]

export const money = (x: number): string => `$${Math.round(x).toLocaleString("en-US")}`
export const percent = (x: number, digits = 1): string => `${Number((x * 100).toFixed(digits))}%`

/** The numbers a tile and a hover card show: monthly cost, uptime and capacity. */
export function specLine(kind: ComponentKind): string {
  const c = COMPONENTS[kind]
  const parts = [kind === "region" ? "2x the bill" : `${money(c.costPerMonth)}/mo`]
  if (c.effect.kind === "failover") parts.push(`${percent(c.effect.pairUptime, 3)} for the pair`)
  else if (c.uptime !== null) parts.push(`${percent(c.uptime, 2)} up`)
  if (c.capacity !== null) parts.push(`${c.capacity.toLocaleString("en-US")} ${kind === "socket" ? "connections" : "rps"}`)
  return parts.join(" · ")
}

const REQUESTS: Readonly<Record<RequestType, string>> = {
  read: "reads",
  write: "writes",
  static: "file requests",
  fanout: "fan-out posts",
  message: "messages",
  upload: "uploads",
}

/** "reads and writes", for the warning line. */
export function requestList(types: readonly RequestType[]): string {
  const names = types.map((type) => REQUESTS[type])
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

export function paletteKinds(career: CareerSoFar): ComponentKind[] {
  return PALETTE_ORDER.filter((kind) => unlockedIn(kind, career))
}


/** How many nodes of `kind` the board takes: the most any design of the interview uses, and one for a decoy. */
export function trayLimit(interview: Interview, kind: ComponentKind): number {
  if (kind === "users") return 1
  const most = Math.max(0, ...designsOf(interview).map((design) => design.nodes.filter((n) => n.kind === kind).length))
  return Math.max(1, most)
}

export interface TrayPiece {
  readonly kind: ComponentKind
  readonly limit: number
}

/**
 * The tray: the kinds this interview's designs use plus its decoys, in palette order, that the career has unlocked.
 * Nothing in the tray says which are decoys.
 */
export function trayFor(interview: Interview, career: CareerSoFar): TrayPiece[] {
  const used = new Set<ComponentKind>([...interview.decoys, ...designsOf(interview).flatMap((design) => design.nodes.map((n) => n.kind))])
  return paletteKinds(career)
    .filter((kind) => used.has(kind))
    .map((kind) => ({ kind, limit: trayLimit(interview, kind) }))
}

/** Kinds the interview's own designs use, so the tray can count what the career has not unlocked yet. */
export function trayWanted(interview: Interview): number {
  return new Set<ComponentKind>([...interview.decoys, ...designsOf(interview).flatMap((design) => design.nodes.map((n) => n.kind))].filter((kind) => kind !== "users")).size
}
