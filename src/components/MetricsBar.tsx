import { GOLD_MULT_THRESHOLD } from "../data/boosts.ts"
import { CornerActions } from "./CornerActions.tsx"
import { production } from "../game/economy.ts"
import { formatMult, TARGET_LABEL } from "../game/events.ts"
import { TEMP_TARGETS } from "../game/mods.ts"
import { modsOf } from "../game/mods.ts"
import { formatMultiplier, formatNumber } from "../game/format.ts"
import { PHASE_NAME, stageOf } from "../game/phase.ts"
import { useGame } from "../game/store.ts"

export function MetricsBar() {
  const xp = useGame((state) => state.xp)
  const phase = useGame((state) => state.phase)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const rates = production({ skills, equipment, owned, jobs, gigs }, activeBoost, now, modsOf({ foreverMult, tempMults }))
  const stage = stageOf({ skills, owned, jobs, gigs })
  const seconds =
    activeBoost && activeBoost.endsAt > now ? Math.ceil((activeBoost.endsAt - now) / 1000) : 0

  return (
    <header className="topbar">
      <div className="brand">
        <p className="eyebrow">Career clicker</p>
        <h1>Tech Ascension</h1>
      </div>
      <dl className="metrics">
        <div className="m-phase">
          <dt>Phase {phase}</dt>
          <dd data-testid="phase">{PHASE_NAME[phase]}</dd>
        </div>
        {rates.idle > 0 ? (
          <div className="metric-in m-rate">
            <dt>$/s</dt>
            <dd data-testid="per-sec">${formatNumber(rates.idle)}</dd>
          </div>
        ) : null}
        <div className="m-rate">
          <dt>$/click</dt>
          <dd data-testid="per-click">${formatNumber(rates.click)}</dd>
        </div>
        <div className="m-xp-rate">
          <dt>XP/click</dt>
          <dd data-testid="xp-per-click">{formatNumber(rates.xpClick * rates.mult)}</dd>
        </div>
        {rates.xpIdle > 0 ? (
          <div className="metric-in m-xp-rate">
            <dt>XP/s</dt>
            <dd data-testid="xp-per-sec">{formatNumber(rates.xpIdle)}</dd>
          </div>
        ) : null}
        <div className="m-xp">
          <dt>XP</dt>
          <dd data-testid="xp">{formatNumber(Math.floor(xp))}</dd>
        </div>
        {seconds > 0 ? (
          <div className={rates.mult >= GOLD_MULT_THRESHOLD ? "m-boost m-click-boost is-gold" : "m-boost m-click-boost"}>
            <dt>Click boost</dt>
            <dd data-testid="boost">
              ×{formatMultiplier(rates.mult)} · {seconds}s
            </dd>
          </div>
        ) : null}
        {foreverMult !== 1 ? (
          <div className="m-boost">
            <dt>Event bonus</dt>
            <dd data-testid="forever-mult">x{formatMult(foreverMult)}</dd>
          </div>
        ) : null}
        {TEMP_TARGETS.map((target) => {
          const entry = tempMults[target]
          if (!entry || !(entry.endsAt > now)) return null
          return (
            <div key={target} className="m-boost">
              <dt>{TARGET_LABEL[target]}</dt>
              <dd data-testid={`temp-${target}`}>
                x{formatMult(entry.mult)} · {Math.ceil((entry.endsAt - now) / 1000)}s
              </dd>
            </div>
          )
        })}
        <div className="m-stage">
          <dt>Stage</dt>
          <dd data-testid="stage-name">{stage?.name ?? "High school"}</dd>
        </div>
      </dl>
      <CornerActions />
    </header>
  )
}
