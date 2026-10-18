import { useEffect } from "react"
import { RETURN_BREAK_MS } from "./save.ts"
import { persistNow, useGame } from "./store.ts"

export function useGameLoop(): void {
  const tick = useGame((state) => state.tick)
  useEffect(() => {
    const id = window.setInterval(() => {
      tick(Date.now())
    }, 100)
    const flush = () => {
      tick(Date.now())
      persistNow()
    }
    // A tab left in the background for a long while and then picked up again is a return, like a reload.
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now()
        flush()
        return
      }
      const away = hiddenAt > 0 ? Date.now() - hiddenAt : 0
      hiddenAt = 0
      if (away >= RETURN_BREAK_MS) useGame.getState().noteReturn(away)
    }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(id)
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [tick])
}
