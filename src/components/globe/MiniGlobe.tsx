import { Maximize2 } from "lucide-react"
import { lazy, memo, Suspense, useMemo, useSyncExternalStore } from "react"
import "../../styles/globe.css"
import { HOME } from "../../data/geo.ts"
import { formatCompact } from "../../game/format.ts"
import { isMobileViewport, subscribeMobileViewport } from "../../game/mobileViewport.ts"
import { cityRows } from "../../game/globe/tip.ts"
import { INCIDENTS } from "../../game/globe/world.ts"
import { useGame } from "../../game/store.ts"
import { openSurface } from "../../game/surfaces.ts"
import { useFeatureOpen } from "../useFeature.ts"
import { canDrawWave } from "./support.ts"
import { alertOf } from "./feed.ts"
import { GlobeFeed } from "./GlobeFeed.tsx"
import { useCompany } from "./useCompany.ts"

/** The three.js chunk is fetched when the globe first shows, and never in a browser that cannot draw it. */
const GlobeCanvas = lazy(() => import("./GlobeCanvas.tsx"))

/** The company's globe on the desk, bottom left: small and always turning, with a button for the numbers and the status page. */
export const MiniGlobe = memo(function MiniGlobe() {
  const open = useFeatureOpen("studio")
  const narrow = useSyncExternalStore(subscribeMobileViewport, isMobileViewport, () => false)
  const product = useGame((state) => state.profile.product)
  const company = useCompany()
  const rows = useMemo(() => cityRows(company.audience, company.demand, company.pops), [company])
  // Below the breakpoint the CSS hides the globe, so it is not mounted: no render loop, and the three.js chunk is never fetched.
  if (!open || narrow || !canDrawWave()) return null
  const alert = alertOf(company)
  const count = company.incidents.length
  return (
    <>
      <GlobeFeed company={company} />
      <aside className="mini-globe" data-testid="mini-globe" data-alert={alert} aria-label="Where the users are">
        <Suspense fallback={null}>
          <GlobeCanvas company={company} rows={rows} home={HOME.name} compact />
        </Suspense>
        <span className="mini-globe-users" data-testid="mini-globe-users">
          {company.users > 0 ? `${formatCompact(Math.round(company.users))} users` : "No users yet"}
        </span>
        <button type="button" className="mini-globe-open" aria-label={product} title={product} onClick={() => openSurface("studio")}>
          <Maximize2 size={12} aria-hidden />
        </button>
      </aside>
      {count > 0 ? (
        <button
          type="button"
          className="mini-globe-badge"
          data-testid="mini-globe-badge"
          aria-label={`${count} incident${count === 1 ? "" : "s"}. Open ${product}`}
          title={company.incidents.map((i) => INCIDENTS[i.kind].name).join(", ")}
          onClick={() => openSurface("studio")}
        >
          {count}
        </button>
      ) : null}
    </>
  )
})
