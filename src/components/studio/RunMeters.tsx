import { AnimatePresence, m } from "motion/react"
import { memo, useEffect, useState } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import type { TargetName } from "../../game/studio/types.ts"
import { endReveal, REVEAL_MS, useBoard } from "./boardStore.ts"
import type { Run } from "./boardStore.ts"
import { money, percent } from "./kinds.ts"

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const
const VERDICT: Readonly<Record<Run["verdict"]["kind"], string>> = { strongHire: "Strong hire", hire: "Hire", noHire: "No hire" }

const ms = (x: number) => (Number.isFinite(x) ? `${Math.round(x)} ms` : "forever")

interface Meter {
  readonly name: string
  readonly value: string
  readonly target: string
  /** How full the bar is, 0 to 1. */
  readonly fill: number
  readonly targets: readonly TargetName[]
}

function meters(run: Run, interview: Interview): Meter[] {
  const r = run.result
  const t = interview.targets
  const faults = run.verdict.faults
  return [
    {
      name: "Money",
      value: `${money(r.costPerMonth)}/mo`,
      target: `budget ${money(t.budgetPerMonth)}`,
      fill: Math.min(1, r.costPerMonth / t.budgetPerMonth),
      targets: ["budget"],
    },
    {
      name: "Performance",
      value: `${percent(r.successRate)} answered, p95 ${ms(r.p95Ms)}${r.lagSeconds > 0 ? `, ${Math.round(r.lagSeconds)} s behind` : ""}`,
      target: `${percent(t.successRate)} within ${t.p95Ms} ms`,
      fill: r.successRate,
      targets: ["success", "p95", "lag"],
    },
    {
      name: "Availability",
      value: `${percent(r.availability, 3)}, ${Math.round(r.downtimeMinutesPerMonth)} min down a month`,
      target: `${percent(t.availability, 3)} up`,
      fill: r.availability,
      targets: ["availability"],
    },
    {
      name: "Fault tolerance",
      value: faults.total === 0 ? "No faults in this interview" : `${faults.survived} of ${faults.total} faults survived`,
      target: "survive every fault",
      fill: faults.total === 0 ? 1 : faults.survived / faults.total,
      targets: ["faults"],
    },
  ]
}

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
  if (!run) return null
  return <RunReport key={run.startedAt} run={run} interview={interview} onHired={onHired} />
})

function RunReport({ run, interview, onHired }: { run: Run; interview: Interview; onHired: () => void }) {
  const printed = usePrinted(run)
  const missed = new Set(run.verdict.kind === "noHire" ? run.verdict.missed.map((miss) => miss.target) : [])
  const pass = run.verdict.kind !== "noHire"
  return (
    <section className="studio-run" aria-label="Run" data-testid="studio-run">
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
            data-verdict={run.verdict.kind}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
          >
            <p className="studio-verdict-kind">{VERDICT[run.verdict.kind]}</p>
            {run.verdict.kind === "noHire" ? (
              <>
                <p className="studio-xp-lost" data-testid="studio-xp-lost">{`-${run.penalty.toLocaleString("en-US")} XP`}</p>
                <ul className="studio-misses">
                  {run.verdict.missed.map((miss) => (
                    <li key={miss.target}>{miss.line}</li>
                  ))}
                </ul>
                <p className="studio-retry">Your board is still here. Fix it and submit again.</p>
              </>
            ) : (
              <button type="button" className="studio-submit" data-testid="studio-to-jobs" onClick={onHired}>
                Back to the Job Board
              </button>
            )}
            <dl className="studio-meters">
              {meters(run, interview).map((meter) => {
                const fail = meter.targets.some((target) => missed.has(target))
                return (
                  <div key={meter.name} className={fail ? "studio-meter is-fail" : "studio-meter"} data-testid="studio-meter" data-meter={meter.name}>
                    <dt>{meter.name}</dt>
                    <dd>
                      <span>{meter.value}</span>
                      <span className="studio-meter-target">{meter.target}</span>
                      <i className="studio-meter-bar" style={{ ["--fill" as string]: meter.fill }} aria-hidden />
                    </dd>
                  </div>
                )
              })}
            </dl>
          </m.div>
        </AnimatePresence>
      )}
    </section>
  )
}
