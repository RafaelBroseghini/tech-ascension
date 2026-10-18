import { useSyncExternalStore } from "react"
import { getAdminMode, subscribeAdminMode } from "../game/adminMode.ts"
import { canExit, exitOpen, prestigeOnExit } from "../game/legacy.ts"
import { useGame } from "../game/store.ts"

/** The Exit and Legacy (docs/PRESTIGE.md) show only in admin mode for now. */
export function useAdmin(): boolean {
  return useSyncExternalStore(subscribeAdminMode, getAdminMode, getAdminMode)
}

/** The Exit as the store has it now: whether it is open, what it would pay, and whether it can be taken. */
export function useExitState() {
  const legacy = useGame((state) => state.legacy)
  const earned = useGame((state) => state.stats.lifetimeEarned)
  const won = useGame((state) => state.company.won)
  const ending = useGame((state) => state.company.ending)
  const win = { won, ending }
  const open = exitOpen(legacy, earned, win)
  return { legacy, open, gain: open ? prestigeOnExit(legacy, earned, win) : 0, can: canExit(legacy, earned, win) }
}

/** The Prestige button on the activity bar, and the Sell button, show once the Exit is open or Prestige has been earned. */
export function useExitVisible(): boolean {
  const admin = useAdmin()
  const { legacy, open } = useExitState()
  return admin && (open || legacy.prestigeTotal > 0)
}
