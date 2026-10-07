import { expect, test } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { evaluate } from "./evaluate.ts"

const size = (d: { nodes: readonly unknown[]; edges: readonly unknown[] }) => d.nodes.length + d.edges.length
const [largest] = INTERVIEWS.flatMap((challenge) =>
  [challenge.reference, challenge.strongHire, ...challenge.naive.map((n) => n.design)].map((design) => ({ design, scenario: challenge.scenario })),
).sort((a, b) => size(b.design) - size(a.design))

test("one evaluate call on the largest interview design stays under 2 ms at the median", async ({ bench }) => {
  let served = 0
  const results = await bench.compare(
    bench("no-op", () => {}),
    bench("evaluate", () => {
      served += evaluate(largest.design, largest.scenario).successRate
    }),
    { iterations: 1000, time: 0, warmupIterations: 100, warmupTime: 0 },
  )
  const noop = results.get("no-op").latency
  const run = results.get("evaluate").latency
  console.log(
    `nodes+edges ${size(largest.design)} | no-op median ${noop.p50.toFixed(5)} ms | evaluate median ${run.p50.toFixed(4)} ms, p99 ${run.p99.toFixed(4)} ms, samples ${run.samplesCount}`,
  )
  expect(served).toBeGreaterThanOrEqual(run.samplesCount)
  expect(run.p50).toBeLessThan(2)
})
