import { production } from "../game/economy.ts"
import { modsOf } from "../game/mods.ts"
import { clickPaysMoney } from "../game/phase.ts"
import { useGame } from "../game/store.ts"

/** What the career earns right now: money a second and a click, XP a click and a second. The status bar and the metrics modal both read it. */
export function useLiveRates() {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const build = useGame((state) => state.build)
  const gigs = useGame((state) => state.gigs)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const legacy = useGame((state) => state.legacy)
  const rates = production({ skills, equipment, owned, jobs, gigs, build }, activeBoost, now, modsOf({ skills, equipment, owned, jobs, gigs, foreverMult, tempMults, legacy }))
  const clickPays = clickPaysMoney({ jobs })
  const perSec = rates.idle
  return {
    rates,
    /** Dollars a second: idle income. */
    perSec,
    /** Whether a click pays dollars yet (from the first job). */
    clickPays,
    /** Dollars a click: clickPower is $1 before any gear, but a click does not pay that dollar until the first job. */
    perClick: clickPays ? rates.click : 0,
    xpPerClick: rates.xpClick * rates.mult,
    xpPerSec: rates.xpIdle,
    /** Whether the money slot has anything to say yet. */
    money: perSec > 0 || clickPays,
  }
}
