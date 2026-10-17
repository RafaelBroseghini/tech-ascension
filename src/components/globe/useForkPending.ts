import { useGame } from "../../game/store.ts"

/** True while the card has something to say: the choice is open, or the runway is gone. */
export function useForkPending(): boolean {
  return useGame((state) => state.founder.broke || (state.forkModal && state.founder.track === "ladder"))
}
