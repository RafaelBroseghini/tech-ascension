import { regionById, REGIONS } from "../../data/regions.ts"
import { formatNumber } from "../../game/format.ts"
import { runwayWords } from "../../game/founderOutlook.ts"
import type { Company } from "../../game/globe/company.ts"
import { INCIDENTS, regionName } from "../../game/globe/world.ts"

/** The one thing the company should do next, as the world pane leads with it. */
export interface NextStep {
  readonly tone: "bad" | "warn" | "calm" | "won"
  readonly text: string
}

/** What a founder's money picture adds to the next step: income minus burn, and the seconds it lasts. */
export interface ForkView {
  readonly net: number
  readonly runwaySec: number | null
}

const hasLivePop = (company: Company, region: string): boolean =>
  company.pops.some((city) => regionById(region)?.cities.includes(city) === true)

/**
 * Picks the bottleneck, most urgent first: no users, a law only a local server answers, dropped requests, other incidents,
 * a tier near its limit, then the cheapest way to grow.
 */
export function nextStep(company: Company, fork?: ForkView): NextStep {
  if (company.users < 1) return { tone: "calm", text: "Clear a gig to sign your first users. Each client brings people from their own region." }
  if (fork?.runwaySec != null && fork.net < 0) {
    return { tone: fork.runwaySec < 600 ? "bad" : "warn", text: `Burning $${formatNumber(-fork.net)}/s more than it earns. Runway: ${runwayWords(fork.runwaySec)}. Serving gear that pays for itself turns it around.` }
  }
  const law = company.incidents.find((i) => INCIDENTS[i.kind].waivedByPop && !hasLivePop(company, i.region))
  if (law) {
    const where = regionName(law.region)
    const how = company.regions.includes(law.region) ? "Deploy a point of presence there" : `Buy ${where} and deploy a point of presence there`
    return { tone: "bad", text: `${where} wants a local server. ${how}, or respond to the ${INCIDENTS[law.kind].name.toLowerCase()}.` }
  }
  if (company.dropShare > 0) {
    return { tone: "bad", text: `Dropping ${Math.max(1, Math.round(company.dropShare * 100))}% of requests. Serving gear in the Gear tab adds capacity.` }
  }
  if (company.incidents.length > 0) {
    const n = company.incidents.length
    return { tone: "warn", text: `${n} incident${n === 1 ? "" : "s"} slowing you down. Respond to end one now, or wait it out.` }
  }
  if (company.health === "d") return { tone: "warn", text: "Serving is near its limit. More serving gear keeps growth going." }
  if (company.won) return { tone: "won", text: "The world is yours. Keep the seven billion served." }
  const unbought = REGIONS.filter((region) => !company.regions.includes(region.id)).sort((a, b) => a.price - b.price)[0]
  if (unbought) return { tone: "calm", text: `Growing. Buying ${unbought.name} lets the app reach far more people there.` }
  return { tone: "calm", text: "Growing. More points of presence bring each region closer." }
}
