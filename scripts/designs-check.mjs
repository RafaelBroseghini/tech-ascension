// Proves every challenge is solvable and that its naive answers fail for the reason they name.
// Exits 1 when a reference design misses a target or a naive design avoids the target it names.
//
//   npm run designs:check
//
// Needs Node 22.18 or newer, which runs the TypeScript the game is written in without a build step.
import { FIXTURE_CHALLENGES } from "../src/data/studio/fixtures.ts"
import { evaluate } from "../src/game/studio/evaluate.ts"
import { verdict } from "../src/game/studio/score.ts"

const LABEL = { strongHire: "strong hire", hire: "hire", noHire: "no hire" }

const judge = (challenge, design) => verdict(evaluate(design, challenge.scenario), challenge.targets, design)
const missed = (v) => (v.kind === "noHire" ? v.missed.map((m) => m.target) : [])

let broken = 0
for (const challenge of FIXTURE_CHALLENGES) {
  const reference = judge(challenge, challenge.reference)
  const refOk = reference.kind !== "noHire"
  if (!refOk) broken++
  const why = refOk ? "" : ` (${missed(reference).join(", ")})`
  console.log(`${refOk ? "ok  " : "FAIL"} ${challenge.name}: reference ${LABEL[reference.kind]}${why}`)
  for (const naive of challenge.naive) {
    const v = judge(challenge, naive.design)
    const ok = missed(v).includes(naive.fails)
    if (!ok) broken++
    const expected = ok ? "" : `, expected to miss ${naive.fails}`
    console.log(`${ok ? "ok  " : "FAIL"} ${challenge.name}: naive ${naive.name} ${LABEL[v.kind]} (${missed(v).join(", ") || "nothing missed"}${expected})`)
  }
}
if (broken > 0) {
  console.log(`${broken} design${broken === 1 ? "" : "s"} broke the catalog's promise`)
  process.exit(1)
}
