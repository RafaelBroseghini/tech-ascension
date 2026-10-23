// Prints the progression tree (docs/TREE.md): what every row needs and what it opens.
//
//   npm run tree                         the tracks, in order, with how many rows each holds and what it hangs off
//   npm run tree -- track gigs           one track's rows in order, each with its gate in words
//   npm run tree -- gig:5                one row: its gate, what it sits under, what it opens, everything it needs back to the start
//   npm run tree -- job:14 --xp 200000 --gigs 6 --jobs 1,2,3,4,5,6,7 --spec backend --users 5000
//                                        the same row against a career: which leaves hold and which do not
//
// Career flags: --xp N (lifetime XP) --money N (the most held) --gigs N (the first N gigs cleared) --jobs 1,2,3 --skills 1-16
// --gear 42,43 --capital 1 --spec id --lead id --origin id --users N.
// Needs Node 22.18 or newer, which runs the TypeScript the game is written in without a build step.
import { closure, check, dependents, describe, holds, NODE_MAP, NODES, nodeOf, prereqs, TRACK_LIST } from "../src/game/tree/index.ts"

const args = process.argv.slice(2)
const flags = {}
const rest = []
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) flags[args[i].slice(2)] = args[++i]
  else rest.push(args[i])
}

function list(spec) {
  if (!spec) return []
  return spec.split(",").flatMap((part) => {
    const range = part.match(/^(\d+)-(\d+)$/)
    return range ? Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, i) => Number(range[1]) + i) : [Number(part)]
  })
}
const count = (spec, id) => Object.fromEntries(list(spec).map((n) => [String(n), id ?? 1]))
const career = {
  xpTotal: Number(flags.xp ?? 0),
  peakMoney: Number(flags.money ?? 0),
  skills: count(flags.skills),
  owned: count(flags.capital),
  equipment: count(flags.gear),
  gold: [],
  jobs: list(flags.jobs),
  gigs: flags.gigs ? Array.from({ length: Number(flags.gigs) }, (_, i) => i + 1) : [],
  build: flags.spec || flags.lead || flags.origin ? { spec: flags.spec ?? null, switched: false, ...(flags.lead ? { leadership: flags.lead } : {}), ...(flags.origin ? { origin: flags.origin } : {}) } : undefined,
  ...(flags.users ? { company: { users: { "americas-east": Number(flags.users) } } } : {}),
}
const given = Object.keys(flags).length > 0

const line = (req, indent = "  ") => {
  if (req.t === "all") return req.of.map((child) => line(child, indent)).join("\n")
  const mark = given ? (holds(req, career) ? "✓ " : "✗ ") : "- "
  if (req.t === "any") return `${indent}${mark}one of:\n${req.of.map((child) => line(child, indent + "    ")).join("\n")}`
  return `${indent}${mark}${describe(req, given ? career : undefined)}`
}

if (rest[0] === "track") {
  const track = TRACK_LIST.find((row) => row.id === rest[1])
  if (!track) {
    console.error(`No track ${rest[1]}. Tracks: ${TRACK_LIST.map((row) => row.id).join(", ")}`)
    process.exit(1)
  }
  console.log(`${track.label} (${track.id}) — ${track.strict ? "strict: each row needs the one before it" : "loose: order is layout, XP and the other gates do the ordering"}`)
  for (const ref of track.nodes) {
    const node = nodeOf(ref)
    console.log(`\n${ref}  ${node.name}${node.after ? `   (under ${node.after})` : ""}`)
    console.log(line(node.requires))
  }
} else if (rest[0]) {
  const node = nodeOf(rest[0])
  if (!node) {
    console.error(`No row ${rest[0]}. Try gig:5, job:14, skill:15, gear:42, capital:3, board:jobs, pick:spec, gold:2`)
    process.exit(1)
  }
  const track = TRACK_LIST.find((row) => row.nodes.includes(node.ref))
  console.log(`${node.ref}  ${node.name}`)
  console.log(`track ${track.id} (${track.strict ? "strict" : "loose"}), row ${node.index + 1} of ${track.nodes.length}${node.after ? `, under ${node.after}` : ""}\n`)
  console.log("needs:")
  console.log(line(node.requires))
  if (given) {
    const result = check(node.ref, career)
    console.log(result.met ? "\nOpen." : `\nShort of ${result.missing.length}: ${result.missing.map((m) => m.text).join("; ")}`)
  }
  const opens = dependents(node.ref)
  console.log(`\nopens: ${opens.length ? opens.slice(0, 12).join(", ") + (opens.length > 12 ? `, … (${opens.length})` : "") : "nothing"}`)
  const back = closure(node.ref)
  console.log(`needs back to the start: ${back.length} rows${back.length ? ` (${back.slice(0, 8).join(", ")}${back.length > 8 ? ", …" : ""})` : ""}`)
  console.log(`direct prerequisites: ${prereqs(node.ref).join(", ") || "none"}`)
} else {
  console.log(`${NODES.length} rows in ${TRACK_LIST.length} tracks\n`)
  for (const track of TRACK_LIST) {
    const first = nodeOf(track.nodes[0])
    console.log(`${track.id.padEnd(16)} ${String(track.nodes.length).padStart(3)} rows  ${track.strict ? "strict" : "loose "}  ${first.after ? `hangs off ${first.after}` : "starts the game"}`)
  }
  console.log(`\nnpm run tree -- track <id>   one track     npm run tree -- <row>   one row (add career flags to see what is missing)`)
}
