import { useMemo } from "react"
import { companyOf } from "../../game/globe/company.ts"
import { useGame } from "../../game/store.ts"

/** The company as the globe and the status page read it, rebuilt only when something it is made of changes. */
export function useCompany() {
  const footprint = useGame((state) => state.footprint)
  const equipment = useGame((state) => state.equipment)
  const { users, resistance, incidents, won } = useGame((state) => state.company)
  return useMemo(() => companyOf({ users, resistance, incidents, won, footprint, equipment }), [users, resistance, incidents, won, footprint, equipment])
}
