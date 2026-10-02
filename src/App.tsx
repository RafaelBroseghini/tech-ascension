import { useEffect, useRef, useState } from "react"
import { EventModal } from "./components/EventModal.tsx"
import { MetricsBar } from "./components/MetricsBar.tsx"
import { Shop } from "./components/Shop.tsx"
import { Stage } from "./components/Stage.tsx"
import { Toast } from "./components/Toast.tsx"
import { highestOwnedCapital } from "./game/economy.ts"
import { useGame } from "./game/store.ts"
import { useGameLoop } from "./game/useGameLoop.ts"

export default function App() {
  useGameLoop()
  const owned = useGame((state) => state.owned)
  const era = highestOwnedCapital(owned)?.era ?? "early"
  const lastEra = useRef(era)
  const [shifting, setShifting] = useState(false)

  useEffect(() => {
    if (lastEra.current === era) return
    lastEra.current = era
    setShifting(true)
    const id = window.setTimeout(() => setShifting(false), 1000)
    return () => window.clearTimeout(id)
  }, [era])

  return (
    <div className={shifting ? "app era-shift" : "app"} data-era={era}>
      <MetricsBar />
      <main className="layout">
        <Stage />
        <Shop />
      </main>
      <Toast />
      <EventModal />
    </div>
  )
}
