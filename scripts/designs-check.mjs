// Proves every interview is solvable with what the career has unlocked by then, that its top verdict is reachable,
// and that each naive design misses the target it names. Exits 1 when any of that breaks.
//
//   npm run designs:check
//
// Needs Node 22.18 or newer, which runs the TypeScript the game is written in without a build step.
import { INTERVIEWS } from "../src/data/studio/challenges.ts"
import { unlockedBeforeJob } from "../src/data/studio/unlocks.ts"
import { evaluate } from "../src/game/studio/evaluate.ts"
import { verdict } from "../src/game/studio/score.ts"

const LABEL = { strongHire: "strong hire ★★", hire: "hire ★", noHire: "no hire" }

let broken = 0
const report = (ok, line) => {
  if (!ok) broken++
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`)
}

for (const challenge of INTERVIEWS) {
  const judge = (design) => {
    const result = evaluate(design, challenge.scenario)
    const v = verdict(result, challenge.targets, design)
    const missed = v.kind === "noHire" ? v.missed.map((m) => m.target) : []
    const locked = [...new Set(design.nodes.map((n) => n.kind).filter((kind) => !unlockedBeforeJob(kind, challenge.jobId)))]
    const notes = [`$${Math.round(result.costPerMonth)}`, ...(locked.length > 0 ? [`locked: ${locked.join(", ")}`] : [])].join(", ")
    return { kind: v.kind, missed, locked, notes }
  }
  const head = `${challenge.name} (job ${challenge.jobId}):`

  // When the catalog names no separate strong hire design, the reference has to be one.
  const ownStrong = challenge.strongHire !== challenge.reference
  const reference = judge(challenge.reference)
  const why = reference.missed.length > 0 ? ` (${reference.missed.join(", ")})` : ""
  const referenceOk = ownStrong ? reference.kind !== "noHire" : reference.kind === "strongHire"
  report(referenceOk && reference.locked.length === 0, `${head} reference ${LABEL[reference.kind]}${why} [${reference.notes}]`)

  if (ownStrong) {
    const strong = judge(challenge.strongHire)
    report(strong.kind === "strongHire" && strong.locked.length === 0, `${head} strong hire design ${LABEL[strong.kind]} [${strong.notes}]`)
  }

  for (const naive of challenge.naive) {
    const run = judge(naive.design)
    const named = run.missed.includes(naive.fails)
    const expected = named ? "" : `, expected to miss ${naive.fails}`
    report(named && run.locked.length === 0, `${head} naive "${naive.name}" ${LABEL[run.kind]} (${run.missed.join(", ") || "nothing missed"}${expected}) [${run.notes}]`)
  }
}
if (broken > 0) {
  console.log(`${broken} design${broken === 1 ? "" : "s"} broke the catalog's promise`)
  process.exit(1)
}
