import { useMemo } from "react"
import { companyOf } from "../../game/globe/company.ts"
import { useGame } from "../../game/store.ts"

/** The company as the globe and the status page read it, rebuilt only when something it is made of changes. */
export function useCompany() {
  const gigs = useGame((state) => state.gigs)
  const footprint = useGame((state) => state.footprint)
  const equipment = useGame((state) => state.equipment)
  const leads = useGame((state) => state.company.leads)
  const popularity = useGame((state) => state.company.popularity)
  return useMemo(() => companyOf({ gigs, leads, popularity, footprint, equipment }), [gigs, leads, popularity, footprint, equipment])
}
