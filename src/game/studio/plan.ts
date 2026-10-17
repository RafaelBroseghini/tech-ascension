import { COMPONENTS } from "../../data/studio/components.ts"
import type { ComponentKind, Design, DesignNode } from "./types.ts"

const name = (kind: ComponentKind) => COMPONENTS[kind].name

const list = (names: readonly string[]) => (names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`)

const uniq = <T>(items: readonly T[]) => [...new Set(items)]

const isStore = (kind: ComponentKind) => kind === "sql" || kind === "kv" || kind === "blob"

/**
 * One sentence on what a piece does in this design, built from its wires and the call plan the router follows: a service
 * asks its cache first, then a replica for reads or the primary, and writes the primary. Facts about the board only; it
 * never says whether the board is good.
 */
export function describePlan(design: Design, id: string): string {
  const node = design.nodes.find((n) => n.id === id)
  if (!node) return ""
  const kinds = new Map(design.nodes.map((n) => [n.id, n.kind]))
  const outs = uniq(design.edges.filter((e) => e.from === id).flatMap((e) => (kinds.has(e.to) ? [kinds.get(e.to)!] : [])))
  const ins = uniq(design.edges.filter((e) => e.to === id).flatMap((e) => (kinds.has(e.from) ? [kinds.get(e.from)!] : [])))
  const has = (kind: ComponentKind) => outs.includes(kind)
  const from = ins.length > 0 ? list(ins.map(name)) : null
  const primary = outs.filter((kind) => kind === "sql" || kind === "kv").map(name)
  const wired = (node: DesignNode) => design.edges.some((e) => e.from === node.id || e.to === node.id)
  if (node.kind !== "users" && !wired(node) && !isOps(node.kind)) return "Not wired to anything yet."

  switch (node.kind) {
    case "users":
      return outs.length > 0 ? `Every request starts here and goes to ${list(outs.map(name))}.` : "Every request starts here. Wire it to the first piece that takes requests."
    case "api":
    case "socket": {
      const reads = [has("cache") ? name("cache") : null, has("replica") ? name("replica") : null, ...primary, has("blob") ? name("blob") : null].filter(
        (s): s is string => s !== null,
      )
      const parts = [
        reads.length > 0 ? `reads try ${list(reads)} in that order` : "has nothing to read from",
        primary.length > 0 || has("blob") ? `writes go to ${list([...primary, ...(has("blob") ? [name("blob")] : [])])}${has("cache") ? " and clear the cache" : ""}` : "has nowhere to write",
        ...(has("queue") ? [`async work waits in ${name("queue")}`] : []),
        ...(has("worker") ? [`some work runs inline on ${name("worker")}`] : []),
      ]
      return `${from ? `Takes requests from ${from}: ` : "Runs your code: "}${parts.join("; ")}.`
    }
    case "lb":
      return `Spreads ${from ? `what ${from} sends` : "traffic"} across ${outs.length > 0 ? list(outs.map(name)) : "nothing yet"}, skipping any that are down.`
    case "cache":
      return from ? `Answers repeat reads for ${from} before they reach the store; a miss goes on to the store, and a restart empties it.` : "Answers repeat reads once a server asks it."
    case "replica": {
      const copied = design.edges.some((e) => e.to === id && kinds.get(e.from) === "sql")
      const servers = ins.filter((kind) => kind !== "sql")
      return copied ? `Serves reads for ${servers.length > 0 ? list(servers.map(name)) : "its servers"} from a copy of the database that runs a little behind.` : "Nothing copies the database to it, so it takes no reads."
    }
    case "sql": {
      const copies = outs.filter((kind) => kind === "replica" || kind === "standby")
      return `The primary: takes every write${copies.length > 0 ? `, copies it to ${list(copies.map(name))}` : ""}${has("standby") ? " and fails over to the standby" : ""}.`
    }
    case "standby":
      return design.edges.some((e) => e.to === id && kinds.get(e.from) === "sql") ? "Waits next to the primary and takes over if it falls over." : "Not attached to a database, so it protects nothing."
    case "cdn":
      return `Answers files and repeat reads near the user, and passes the rest on to ${outs.length > 0 ? list(outs.map(name)) : "nothing yet"}.`
    case "bouncer":
      return `Turns bots away at the door, then passes real requests on to ${outs.length > 0 ? list(outs.map(name)) : "nothing yet"}.`
    case "queue":
      return `Holds async work from ${from ?? "servers"} in line until ${has("worker") ? name("worker") : "a worker"} can take it.`
    case "worker":
      return `${from ? `Takes work from ${from}` : "Runs background work"} and writes the result to ${outs.length > 0 ? list(outs.map(name)) : "nowhere yet"}.`
    case "kv":
    case "blob":
      return `${isStore(node.kind) ? "Stores" : "Holds"} what ${from ?? "a server"} sends it, and answers reads and writes for it.`
    case "autoscaler":
    case "breaker":
    case "oncall":
    case "region":
      return `${COMPONENTS[node.kind].goal}`
  }
}

function isOps(kind: ComponentKind): boolean {
  return kind === "autoscaler" || kind === "breaker" || kind === "oncall" || kind === "region"
}
