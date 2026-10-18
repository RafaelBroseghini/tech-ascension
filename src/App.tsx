import { ChevronLeft } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { GigCard } from "./components/GigCard.tsx"
import { EventModal } from "./components/EventModal.tsx"
import { ReviewModal } from "./components/ReviewModal.tsx"
import { MetricsBar } from "./components/MetricsBar.tsx"
import { Shop } from "./components/Shop.tsx"
import { Stage } from "./components/Stage.tsx"
import { Toast } from "./components/Toast.tsx"
import { UnlockReveals } from "./components/UnlockReveals.tsx"
import { ExitHeadline } from "./components/ExitPanel.tsx"
import { IdentityPicker } from "./components/IdentityPicker.tsx"
import { UI_ICON } from "./components/icons/ui.tsx"
import { highestOwnedCapital } from "./game/economy.ts"
import { readShopPanelOpen, subscribeShopPanelOpen, writeShopPanelOpen } from "./game/shopPanelPrefs.ts"
import { isMobileViewport, subscribeMobileViewport } from "./game/mobileViewport.ts"
import { useGame } from "./game/store.ts"
import { useGameLoop } from "./game/useGameLoop.ts"
import { watchUnlockChime } from "./game/unlockChime.ts"

export default function App() {
  useGameLoop()
  const shopPref = useSyncExternalStore(subscribeShopPanelOpen, readShopPanelOpen, () => true)
  // A phone has no room to hide the shop, and no side column to put it in, so the desktop preference does not apply.
  const narrow = useSyncExternalStore(subscribeMobileViewport, isMobileViewport, () => false)
  const shopOpen = shopPref || narrow
  const owned = useGame((state) => state.owned)
  const era = highestOwnedCapital(owned)?.era ?? "early"
  const lastEra = useRef(era)
  const [shifting, setShifting] = useState(false)

  useEffect(() => watchUnlockChime(), [])

  useEffect(() => {
    if (lastEra.current === era) return
    lastEra.current = era
    setShifting(true)
    const id = window.setTimeout(() => setShifting(false), 1000)
    return () => window.clearTimeout(id)
  }, [era])

  return (
    <>
      <div className={shifting ? "app era-shift" : "app"} data-era={era}>
        <MetricsBar />
        <main className={shopOpen ? "layout" : "layout is-shop-collapsed"}>
          <Stage />
          {shopOpen ? <Shop onCollapse={() => writeShopPanelOpen(false)} /> : null}
          {!shopOpen ? (
            <button
              type="button"
              className="shop-panel-toggle shop-panel-show"
              data-testid="shop-panel-show"
              aria-label="Show shop"
              onClick={() => writeShopPanelOpen(true)}
            >
              <ChevronLeft {...UI_ICON} aria-hidden />
            </button>
          ) : null}
        </main>
        <Toast />
        <GigCard />
        <EventModal />
        <ReviewModal />
        <UnlockReveals />
        <IdentityPicker />
        <ExitHeadline />
      </div>
    </>
  )
}
