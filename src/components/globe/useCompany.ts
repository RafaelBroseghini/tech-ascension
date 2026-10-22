import { useMemo } from "react"
import { buildFactsOf } from "../../game/build.ts"
import { companyOf } from "../../game/globe/company.ts"
import { productFactsOf } from "../../game/globe/product.ts"
import { useGame } from "../../game/store.ts"

/** The company as the globe and the status page read it, rebuilt only when something it is made of changes. */
export function useCompany() {
  const footprint = useGame((state) => state.footprint)
  const equipment = useGame((state) => state.equipment)
  const { users, resistance, incidents, won } = useGame((state) => state.company)
  const legacy = useGame((state) => state.legacy)
  const build = useGame((state) => state.build)
  return useMemo(() => {
    const { revenueMult, dropsMult } = productFactsOf({}, legacy, buildFactsOf({ build, jobs: [] }))
    return companyOf({ users, resistance, incidents, won, footprint, equipment, revenueMult, dropsMult })
  }, [users, resistance, incidents, won, footprint, equipment, legacy, build])
}
