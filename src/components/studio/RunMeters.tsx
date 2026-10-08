import { AnimatePresence, m } from "motion/react"
import { memo, useEffect, useState } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { currentRun, endReveal, REVEAL_MS, useBoard } from "./boardStore.ts"
import type { Run } from "./boardStore.ts"
import { percent } from "./kinds.ts"
import { MeterList } from "./MeterList.tsx"
import { meters } from "./meters.ts"

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const
const VERDICT: Readonly<Record<Run["verdict"]["kind"], string>> = { strongHire: "Strong hire", hire: "Hire", noHire: "No hire" }

/** How many run log lines the reveal has printed; all of them once it ends. */
function usePrinted(run: Run): number {
  const total = run.result.phases.length
  const [printed, setPrinted] = useState(0)
  useEffect(() => {
    if (!run.revealing) return
    const step = REVEAL_MS / total
    const timers = run.result.phases.map((_, i) => window.setTimeout(() => setPrinted(i + 1), step * i))
    timers.push(window.setTimeout(endReveal, Math.max(0, run.startedAt + REVEAL_MS - performance.now())))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [run, total])
  return run.revealing ? printed : total
}

/** The run log as the reveal plays, then the verdict and one meter per constraint. */
export const RunMeters = memo(function RunMeters({ interview, onHired }: { interview: Interview; onHired: () => void }) {
  const run = useBoard((s) => s.run)
  const stale = useBoard((s) => currentRun(s) === null)
  if (!run) return null
  return <RunReport key={run.startedAt} run={run} stale={stale} interview={interview} onHired={onHired} />
})

function RunReport({ run, stale, interview, onHired }: { run: Run; stale: boolean; interview: Interview; onHired: () => void }) {
  const printed = usePrinted(run)
  const missed = new Set(run.verdict.kind === "noHire" ? run.verdict.missed.map((miss) => miss.target) : [])
  const pass = run.verdict.kind !== "noHire"
  const stamp = run.practice ? (pass ? "Passes the bar" : "Misses the bar") : VERDICT[run.verdict.kind]
  return (
    <section className={stale ? "studio-run is-stale" : "studio-run"} aria-label="Run" data-testid="studio-run" data-stale={stale}>
      {stale ? <p className="studio-run-label">Last submission</p> : null}
      <ol className="studio-log" data-testid="studio-log" aria-live="polite">
        {run.result.phases.slice(0, printed).map((phase) => (
          <li key={phase.name} className={phase.fault ? "is-fault" : ""}>
            <span>{`${phase.name}: ${percent(phase.successRate)} answered`}</span>
            {phase.line ? <em>{phase.line}</em> : null}
          </li>
        ))}
      </ol>
      {run.revealing ? (
        <p className="studio-skip">Traffic is running. Click to skip.</p>
      ) : (
        <AnimatePresence>
          <m.div
            className={pass ? "studio-verdict is-pass" : "studio-verdict is-fail"}
            data-testid="studio-verdict"
            data-verdict={run.practice ? (pass ? "passes" : "misses") : run.verdict.kind}
            data-practice={run.practice}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
          >
            <p className="studio-verdict-kind">{stamp}</p>
            {run.newBest ? <p className="studio-new-best" data-testid="studio-new-best">New best</p> : null}
            {run.verdict.kind === "noHire" ? (
              <>
                {run.practice ? null : <p className="studio-xp-lost" data-testid="studio-xp-lost">{`-${run.penalty.toLocaleString("en-US")} XP`}</p>}
                <ul className="studio-misses">
                  {run.verdict.missed.map((miss) => (
                    <li key={miss.target}>{miss.line}</li>
                  ))}
                </ul>
                <p className="studio-retry">{run.practice ? "Change the board and run it again." : "Your board is still here. Fix it and submit again."}</p>
              </>
            ) : run.practice ? null : (
              <button type="button" className="studio-submit" data-testid="studio-to-jobs" onClick={onHired}>
                Back to the Job Board
              </button>
            )}
            <MeterList meters={meters(run.result, interview.targets, run.verdict.faults)} failed={missed} testid="studio-meter" />
          </m.div>
        </AnimatePresence>
      )}
    </section>
  )
}
