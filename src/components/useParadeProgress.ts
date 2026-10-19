import { useMemo } from "react"
import type { ParadeProgress } from "../game/paradePool.ts"
import { useGame } from "../game/store.ts"

/** What the gif parade's pool reads: cats found and the rows held. Changes only when one of those does. */
export function useParadeProgress(): ParadeProgress {
  const catsFound = useGame((state) => state.stats.catsFound)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  // XP and peak money only open boards, and every row held latches its board open, so they are read once.
  return useMemo(() => {
    const { xpTotal, peakMoney } = useGame.getState()
    return { catsFound, skills, equipment, owned, jobs, gigs, xpTotal, peakMoney }
  }, [catsFound, skills, equipment, owned, jobs, gigs])
}
