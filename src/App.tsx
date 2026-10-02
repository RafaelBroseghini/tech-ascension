import { MetricsBar } from "./components/MetricsBar.tsx"
import { Shop } from "./components/Shop.tsx"
import { Stage } from "./components/Stage.tsx"
import { Toast } from "./components/Toast.tsx"
import { ERA_ACCENT } from "./data/sprites.ts"
import { highestOwnedTier, production } from "./game/economy.ts"
import { useGame } from "./game/store.ts"
import { useGameLoop } from "./game/useGameLoop.ts"

export default function App() {
  useGameLoop()
  const owned = useGame((state) => state.owned)
  const activeBoost = useGame((state) => state.activeBoost)
  const now = useGame((state) => state.now)
  const tier = highestOwnedTier(owned)
  const accent = ERA_ACCENT[tier?.era ?? "early"]
  const boosted = production(owned, activeBoost, now).mult > 1

  return (
    <div
      className="app"
      style={{
        ["--glow" as string]: accent.glow,
        ["--tint" as string]: accent.tint,
      }}
    >
      {boosted ? <div className="edge-shimmer" aria-hidden="true" /> : null}
      <MetricsBar />
      <main className="layout">
        <Stage />
        <Shop />
      </main>
      <Toast />
    </div>
  )
}
