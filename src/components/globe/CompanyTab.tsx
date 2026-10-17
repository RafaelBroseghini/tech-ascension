import { useMemo } from "react"
import "../../styles/globe.css"
import { GEAR } from "../../data/gear.ts"
import { GIGS } from "../../data/phases.ts"
import { formatNumber } from "../../game/format.ts"
import { RPS_PER_CPS, SERVING_KINDS } from "../../game/globe/load.ts"
import { STATUS_DAYS } from "../../game/globe/growth.ts"
import { HEALTH_LABEL, statusOf } from "../../game/globe/status.ts"
import { useGame } from "../../game/store.ts"
import { GlobePane } from "./GlobePane.tsx"
import { ForkCard } from "./ForkCard.tsx"
import { FootprintPanel } from "./FootprintPanel.tsx"
import { useCompany } from "./useCompany.ts"

const money = (n: number) => `$${formatNumber(n)}`

/** The short line under each component, as a status page words it. */
const STATUS_LABEL = { operational: "Normal", degraded: "Degraded performance", partial: "Partial outage", major: "Major outage" } as const

/** The company on the shop: one narrow column with the numbers behind the globe on the desk, the fleet that serves it, and the status page for the app. */
export function CompanyTab() {
  const product = useGame((state) => state.profile.product)
  const gigs = useGame((state) => state.gigs)
  const equipment = useGame((state) => state.equipment)
  const uptime = useGame((state) => state.company.uptime)
  const company = useCompany()
  const fleet = useMemo(
    () =>
      GEAR.filter((item) => SERVING_KINDS.includes(item.kind) && (equipment[String(item.id)] ?? 0) > 0).map((item) => {
        const count = equipment[String(item.id)] ?? 0
        return { id: item.id, name: item.name, count, rps: Math.round(count * item.cps * RPS_PER_CPS) }
      }),
    [equipment],
  )
  const board = useMemo(() => {
    const retained = GIGS.filter((gig) => gig.retainerCps > 0 && gigs.includes(gig.id))
    return statusOf({
      company,
      retainers: { count: retained.length, perSec: retained.reduce((sum, gig) => sum + gig.retainerCps, 0) },
      uptime,
      money,
    })
  }, [company, gigs, uptime])

  return (
    <div className="company-tab" data-testid="company-tab" aria-label={product}>
      <ForkCard />
      <section className="status-page" data-testid="company-status" aria-label="Status">
        <div className={`status-banner is-${board.health}`} data-testid="status-banner">
          <span aria-hidden>{board.health === "operational" ? "✓" : "!"}</span>
          {board.banner}
        </div>
        {board.incident ? (
          <article className="status-incident" data-testid="status-incident">
            <h3>{board.incident.title}</h3>
            <ol>
              {board.incident.updates.map((u) => (
                <li key={u.state}>
                  <b>{u.state}</b>
                  <span>{u.text}</span>
                </li>
              ))}
            </ol>
          </article>
        ) : null}
      </section>
      <GlobePane company={company} fleet={fleet} />
      <FootprintPanel />
      <section className="status-page" aria-label="Uptime">
        <div className="status-heading">
          <h3>Current Status: {product}</h3>
          <span>{`Uptime over the past ${STATUS_DAYS} days.`}</span>
        </div>
        <ul className="status-components">
          {board.components.map((c) => (
            <li key={c.id} data-status={c.health} data-testid={`status-${c.id}`}>
              <div className="status-title">
                <strong>{c.name}</strong>
                <span className="status-help" title={c.detail} aria-label={c.detail}>?</span>
                <span className={`status-icon is-${c.health}`} aria-label={HEALTH_LABEL[c.health]} />
              </div>
              <div className="status-bars" aria-label={`${c.name} uptime over the last ${STATUS_DAYS} days`}>
                {Array.from({ length: STATUS_DAYS }, (_, i) => {
                  const ch = c.bars[i - (STATUS_DAYS - c.bars.length)]
                  return <span key={i} className={`bar is-${ch ?? "none"}`} />
                })}
              </div>
              <div className="status-axis">
                <span>{`${STATUS_DAYS} days ago`}</span>
                <i aria-hidden />
                <span>{`${c.uptime.toFixed(2)} % uptime`}</span>
                <i aria-hidden />
                <span>Today</span>
              </div>
              <em className="status-label">{STATUS_LABEL[c.health]}</em>
            </li>
          ))}
        </ul>
        {board.past.length > 0 ? (
          <>
            <h4>Past incidents</h4>
            <ul className="status-past">
              {board.past.map((p) => (
                <li key={p.daysAgo}>
                  <strong>{HEALTH_LABEL[p.health]}</strong>
                  <span>{p.daysAgo === 0 ? "Today" : `${p.daysAgo} day${p.daysAgo === 1 ? "" : "s"} ago`}</span>
                  <small>{p.duration}</small>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  )
}
