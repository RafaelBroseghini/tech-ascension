import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { CITIES } from "../../data/geo.ts"
import { CityFlag } from "./CityFlag.tsx"
import { popCostOf, REGIONS, regionById, regionOfCity } from "../../data/regions.ts"
import { formatNumber } from "../../game/format.ts"
import { canSetPop, canSetRegion, popIsOn } from "../../game/globe/footprint.ts"
import { useGame } from "../../game/store.ts"

const money = (n: number) => `$${formatNumber(n)}`

/** A small on/off knob. */
function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={label} disabled={disabled} className={`knob${on ? " is-on" : ""}`} onClick={() => onChange(!on)}>
      <i aria-hidden />
    </button>
  )
}

/** Regions to buy with money, and the cities of the regions you own to deploy points of presence in and switch on and off. */
export function FootprintPanel() {
  const footprint = useGame((state) => state.footprint)
  const cash = useGame((state) => state.money)
  const buyRegion = useGame((state) => state.buyRegion)
  const deployPop = useGame((state) => state.deployPop)
  const setPopActive = useGame((state) => state.setPopActive)
  const setRegionActive = useGame((state) => state.setRegionActive)
  /** Regions the player opened or closed by hand; the rest are open when they have a server live. */
  const [shut, setShut] = useState<Readonly<Record<string, boolean>>>({})
  const owned = REGIONS.filter((row) => footprint.regions.includes(row.id))
  const buyable = REGIONS.filter((row) => !footprint.regions.includes(row.id))
  return (
    <section className="footprint" data-testid="company-footprint" aria-label="Regions and points of presence">
      <h4>Regions</h4>
      <ul className="footprint-regions">
        {buyable.map((row) => (
          <li key={row.id}>
            <span>{row.name}</span>
            <button type="button" disabled={cash < row.price} onClick={() => buyRegion(row.id)}>
              {`Buy · ${money(row.price)}`}
            </button>
          </li>
        ))}
      </ul>
      {owned.map((row) => {
        const deployed = row.cities.filter((city) => footprint.pops.includes(city))
        const live = deployed.filter((city) => popIsOn(footprint, city))
        const dark = footprint.dark.includes(row.id)
        const open = shut[row.id] ?? deployed.length > 0
        return (
          <div key={row.id} className={`footprint-owned${dark ? " is-dark" : ""}`} data-region={row.id} data-open={open ? "true" : "false"} data-dark={dark ? "true" : "false"}>
            <header>
              <button type="button" className="footprint-fold" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${row.name}`} onClick={() => setShut({ ...shut, [row.id]: !open })}>
                {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                <strong>{row.name}</strong>
              </button>
              <small>{dark ? "Off, traffic goes elsewhere" : `${live.length} of ${row.cities.length} live`}</small>
              <Switch on={!dark} label={`${row.name} ${dark ? "off" : "on"}`} disabled={deployed.length === 0 || !canSetRegion(footprint, row.id, dark)} onChange={(on) => setRegionActive(row.id, on)} />
            </header>
            {open ? (
              <ul>
                {[...row.cities].sort((a, b) => Number(footprint.pops.includes(b)) - Number(footprint.pops.includes(a))).map((city) => {
                  const deployedHere = footprint.pops.includes(city)
                  const on = popIsOn(footprint, city)
                  const cost = popCostOf(regionById(regionOfCity(city)?.id ?? "") ?? row)
                  return (
                    <li key={city} data-pop={!deployedHere ? "free" : on ? "live" : "off"}>
                      <span className="footprint-city" title={CITIES[city]?.name ?? city}>
                        <CityFlag country={CITIES[city]?.country ?? ""} />
                        <span>{CITIES[city]?.name ?? city}</span>
                      </span>
                      {deployedHere ? (
                        <Switch on={!footprint.off.includes(city)} label={`${CITIES[city]?.name ?? city} ${footprint.off.includes(city) ? "off" : "on"}`} disabled={dark || !canSetPop(footprint, city, footprint.off.includes(city))} onChange={(next) => setPopActive(city, next)} />
                      ) : (
                        <button type="button" disabled={cash < cost} onClick={() => deployPop(city)}>
                          {`Deploy ${money(cost)}`}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
