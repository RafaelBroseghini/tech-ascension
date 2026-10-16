import { Maximize2 } from "lucide-react"
import { lazy, memo, Suspense, useMemo } from "react"
import "../../styles/globe.css"
import { HOME } from "../../data/geo.ts"
import { cityRows } from "../../game/globe/tip.ts"
import { openSurface } from "../../game/surfaces.ts"
import { useFeatureOpen } from "../useFeature.ts"
import { canDrawWave } from "./support.ts"
import { useCompany } from "./useCompany.ts"

/** The three.js chunk is fetched when the globe first shows, and never in a browser that cannot draw it. */
const GlobeCanvas = lazy(() => import("./GlobeCanvas.tsx"))

/** The company's globe on the desk, bottom left: small and always turning, with a button for the numbers and the status page. */
export const MiniGlobe = memo(function MiniGlobe() {
  const open = useFeatureOpen("studio")
  const company = useCompany()
  const rows = useMemo(() => cityRows(company.audience, company.demand, company.pops), [company])
  if (!open || !canDrawWave()) return null
  return (
    <aside className="mini-globe" data-testid="mini-globe" aria-label="Where the clients are">
      <Suspense fallback={null}>
        <GlobeCanvas company={company} rows={rows} home={HOME.name} compact />
      </Suspense>
      <button type="button" className="mini-globe-open" aria-label="Your company" title="Your company" onClick={() => openSurface("studio")}>
        <Maximize2 size={12} aria-hidden />
      </button>
    </aside>
  )
})
