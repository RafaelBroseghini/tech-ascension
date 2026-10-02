import { useEffect } from "react"
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
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
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
