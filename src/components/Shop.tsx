import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { artFor, EQUIP_ART, GIG_ART, JOB_ART, SKILL_ART } from "../data/art.ts"
import { eraSections, capitalInEra } from "../data/eras.ts"
import { GEAR_KINDS } from "../data/gear.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { ERA_ACCENT, thumbForTier } from "../data/sprites.ts"
import type { Era } from "../data/capital.ts"
import { canAfford, isGearRevealed, isRevealed, isSkillRevealed, nextCost, ownedCount } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { nextUnlock } from "../game/nextUnlock.ts"
import {
  capitalRequirements,
  capitalUnlocked,
  equipmentOpen,
  gigBoardRequirements,
  gearRequirements,
  gigBoardUnlocked,
  gigState,
  jobBoardRequirements,
  jobBoardUnlocked,
  jobState,
  PHASE_NAME,
  phaseRank,
  SHOP_TABS,
} from "../game/phase.ts"
import type { Requirement, ShopTab } from "../game/phase.ts"
import { useGame } from "../game/store.ts"

const PHASE_TAB: Record<ShopTab, { label: string; title: string; hint: string; glow: string }> = {
  A: { label: "Skills", title: "Study the next skill", hint: "Pay in XP", glow: "#6fe08c" },
  B: { label: "Gigs", title: "Take on a gig", hint: "First dollars", glow: "#5aa9ff" },
  C: { label: "Jobs", title: "Climb the ladder", hint: "Salary", glow: "#f3b94a" },
  G: { label: "Gear", title: "Build out your infra", hint: "Repeatable buys", glow: "#4fd1c5" },
  D: { label: "Capital", title: "Deploy capital", hint: "Funds, equity, firms", glow: "#ff7b4f" },
}

function OwnedCount({ value }: { value: number }) {
  const [initial] = useState(value)
  return (
    <span key={value} className={value !== initial ? "own tick-up" : "own"}>
      {formatNumber(value)}
    </span>
  )
}

type OfferProps = {
  artId: number
  glow: string
  index: number
  afford: boolean
  flash?: boolean
  fresh?: boolean
  locked?: boolean
  done?: boolean
  title: string
  children: ReactNode
  actions: ReactNode
}

function Offer({ artId, glow, index, afford, flash, fresh, locked, done, title, children, actions }: OfferProps) {
  return (
    <article
      className={["offer", afford ? "afford" : "", flash ? "flash" : "", fresh ? "fresh" : "", locked ? "is-locked" : "", done ? "is-done" : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--offer-glow" as string]: glow, ["--i" as string]: index }}
    >
      <img src={thumbForTier(artId)} alt="" width={64} height={64} />
      <div className="offer-copy">
        <h3>
          {title}
          {fresh ? <span className="new-tag">New</span> : null}
        </h3>
        <p>{children}</p>
      </div>
      <div className="offer-actions">{actions}</div>
    </article>
  )
}

function LockPanel({ title, lines, either }: { title: string; lines: Requirement[]; either?: boolean }) {
  return (
    <div className="lock-panel" data-testid="lock-panel">
      <p className="lock-title">{title}</p>
      <ul>
        {lines.map((line) => (
          <li key={line.text} className={line.met ? "met" : ""}>
            <i aria-hidden="true" />
            {line.text}
          </li>
        ))}
      </ul>
      {either ? <p className="lock-note">Either one opens it.</p> : null}
    </div>
  )
}

export function Shop() {
  const money = useGame((s) => s.money)
  const xp = useGame((s) => s.xp)
  const xpTotal = useGame((s) => s.xpTotal)
  const peakMoney = useGame((s) => s.peakMoney)
  const skills = useGame((s) => s.skills)
  const equipment = useGame((s) => s.equipment)
  const owned = useGame((s) => s.owned)
  const jobs = useGame((s) => s.jobs)
  const gigs = useGame((s) => s.gigs)
  const phase = useGame((s) => s.phase)
  const buySkill = useGame((s) => s.buySkill)
  const buyEquipment = useGame((s) => s.buyEquipment)
  const buyJob = useGame((s) => s.buyJob)
  const buy = useGame((s) => s.buy)
  const clearGig = useGame((s) => s.clearGig)
  const wipe = useGame((s) => s.wipe)

  const [picked, setPicked] = useState<ShopTab | null>(null)
  const [lastPhase, setLastPhase] = useState(phase)
  // The era tab doubles as the IDE preview: the store holds it and snaps it back to the owned era.
  const pickedEra = useGame((s) => s.previewEra)
  const setPickedEra = useGame((s) => s.setPreviewEra)
  const holdPreview = useGame((s) => s.holdPreview)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)
  const seenRows = useRef(new Map<string, number>())

  // A newly opened phase takes over the tab so the unlock is not missed.
  if (phase !== lastPhase) {
    setLastPhase(phase)
    if (phaseRank(phase) > phaseRank(lastPhase)) setPicked(null)
  }
  const tab = picked ?? phase

  const gates = { xpTotal, peakMoney, skills, owned, jobs, gigs }
  const unlocked: Record<ShopTab, boolean> = {
    A: true,
    B: gigBoardUnlocked(gates),
    C: jobBoardUnlocked(gates),
    G: equipmentOpen({ xpTotal, equipment }),
    D: capitalUnlocked(gates),
  }

  const skillRows = SKILL_TIERS.filter((row) => isSkillRevealed(row, skills, xpTotal))
  const equipRows = EQUIPMENT.filter((row) => isGearRevealed(row, equipment, peakMoney, jobs))
  const next = nextUnlock({ ...gates, equipment })

  const revealedByEra = useMemo(() => {
    const map = new Map<Era, ReturnType<typeof capitalInEra>>()
    for (const section of eraSections()) {
      const rows = capitalInEra(section.id)
        .filter((tier) => isRevealed(tier, owned, peakMoney))
        .sort((a, b) => a.baseCost - b.baseCost)
      if (rows.length > 0) map.set(section.id, rows)
    }
    return map
  }, [owned, peakMoney])
  const eraTabs = eraSections().filter((section) => revealedByEra.has(section.id))
  const topEra = [...eraTabs].reverse().find((section) => (revealedByEra.get(section.id) ?? []).some((tier) => ownedCount(owned, tier.id) > 0))
  const era = pickedEra && revealedByEra.has(pickedEra) ? pickedEra : (topEra?.id ?? eraTabs[0]?.id ?? "mid")
  const capitalRows = revealedByEra.get(era) ?? []

  const rowCount = tab === "A" ? skillRows.length : tab === "G" ? equipRows.length : tab === "D" ? capitalRows.length : 0
  const rowScope = tab === "D" ? `D:${era}` : tab
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const previous = seenRows.current.get(rowScope)
    seenRows.current.set(rowScope, rowCount)
    if (previous === undefined || rowCount <= previous) return
    const row = list.querySelector<HTMLElement>(".offer:last-of-type")
    if (!row) return
    const overflow = row.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom
    if (overflow > 0) list.scrollTop += overflow
  }, [rowScope, rowCount])

  const revealedKeys = [
    ...skillRows.map((row) => `skill:${row.id}`),
    ...equipRows.map((row) => `equip:${row.id}`),
    ...[...revealedByEra.values()].flat().map((tier) => `capital:${tier.id}`),
  ]
  const [known, setKnown] = useState<ReadonlySet<string>>(() => new Set(revealedKeys))
  if (revealedKeys.length !== known.size || revealedKeys.some((key) => !known.has(key))) {
    const added = revealedKeys.filter((key) => !known.has(key))
    setKnown(new Set(revealedKeys))
    setFresh((current) => (revealedKeys.length === 0 ? new Set() : new Set([...current, ...added])))
  }

  function act(key: string, run: () => void) {
    setFlashKey(key)
    run()
    setFresh((current) => {
      if (!current.has(key)) return current
      const next = new Set(current)
      next.delete(key)
      return next
    })
    window.setTimeout(() => setFlashKey((current) => (current === key ? null : current)), 440)
  }

  const tabGlow = PHASE_TAB[tab].glow

  useEffect(() => {
    if (tab !== "D") setPickedEra(null)
  }, [tab, setPickedEra])

  return (
    <aside className="shop" data-testid="shop" data-phase={tab} onPointerMove={holdPreview}>
      <div className="shop-head">
        <div>
          <p className="eyebrow">
            {tab === "G" ? "Gear · Infra" : `Phase ${tab} · ${PHASE_NAME[tab]}`}
          </p>
          <h2>{unlocked[tab] ? PHASE_TAB[tab].title : `${PHASE_TAB[tab].label} locked`}</h2>
        </div>
        <p className="era-hint">{PHASE_TAB[tab].hint}</p>
      </div>
      <div className="era-tabs" role="tablist" aria-label="Career phases">
        {SHOP_TABS.map((id) => {
          const locked = !unlocked[id]
          const affordable =
            !locked &&
            ((id === "A" && skillRows.some((row) => canAfford(xp, nextCost(row.baseXpCost, ownedCount(skills, row.id))))) ||
              (id === "B" && GIGS.some((gig) => gigState(gates, gig) === "ready")) ||
              (id === "C" && JOB_TIERS.some((job) => jobState(gates, job) === "ready" && canAfford(money, job.baseCost))) ||
              (id === "G" && equipRows.some((row) => canAfford(money, nextCost(row.baseCost, ownedCount(equipment, row.id))))) ||
              (id === "D" &&
                [...revealedByEra.values()].flat().some((tier) => canAfford(money, nextCost(tier.baseCost, ownedCount(owned, tier.id))))))
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === tab}
              data-phase={id}
              className={["era-tab", id === tab ? "active" : "", locked ? "is-locked" : ""].filter(Boolean).join(" ")}
              style={{ ["--tab-glow" as string]: PHASE_TAB[id].glow }}
              onClick={() => setPicked(id)}
            >
              {locked ? <i className="lock-pip" aria-label="Locked" /> : null}
              {PHASE_TAB[id].label}
              {affordable ? <i className="deal-dot" aria-label="Something is available" /> : null}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="next-unlock"
        data-testid="next-unlock"
        data-next={next?.key ?? "none"}
        disabled={!next}
        onClick={() => next && setPicked(next.tab)}
      >
        <span className="next-kicker">Next</span>
        {next ? (
          <>
            <strong className="next-name">{next.name}</strong>
            <span className="next-needs">need {next.needs.join(next.either ? " or " : " · ")}</span>
          </>
        ) : (
          <span className="next-needs">Everything is open</span>
        )}
      </button>

      {tab === "D" && unlocked.D && eraTabs.length > 1 ? (
        <div className="era-tabs era-sub" role="tablist" aria-label="Capital eras">
          {eraTabs.map((section) => (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={section.id === era}
              className={section.id === era ? "era-tab active" : "era-tab"}
              style={{ ["--tab-glow" as string]: ERA_ACCENT[section.id].glow }}
              onClick={() => setPickedEra(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="shop-list" key={rowScope} ref={listRef}>
        {tab === "A" ? (
          <>
            {skillRows.map((row, index) => {
              const have = ownedCount(skills, row.id)
              const cost = nextCost(row.baseXpCost, have)
              const afford = canAfford(xp, cost)
              const key = `skill:${row.id}`
              return (
                <Offer
                  key={row.id}
                  artId={artFor(SKILL_ART, row.id)}
                  glow={tabGlow}
                  index={index}
                  afford={afford}
                  flash={flashKey === key}
                  fresh={fresh.has(key)}
                  title={row.name}
                  actions={
                    <>
                      <button type="button" disabled={!afford} onClick={() => act(key, () => buySkill(row.id, "one"))}>
                        Learn {formatNumber(cost)} XP
                      </button>
                      <button type="button" className="ghost" disabled={!afford} onClick={() => act(key, () => buySkill(row.id, "max"))}>
                        Max
                      </button>
                    </>
                  }
                >
                  {[row.xpPerClick > 0 ? `+${formatNumber(row.xpPerClick)} XP/click` : "", row.xpPerSec > 0 ? `+${formatNumber(row.xpPerSec)} XP/s` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                  {" · owned "}
                  <OwnedCount value={have} />
                </Offer>
              )
            })}
            <p className="shop-empty">
              {xpTotal >= 12000 && !unlocked.B ? "Gig Board is waiting on Portfolio and React." : "More skills appear as your lifetime XP grows."}
            </p>
          </>
        ) : null}

        {tab === "B" ? (
          unlocked.B ? (
            GIGS.map((gig, index) => {
              const status = gigState(gates, gig)
              const key = `gig:${gig.id}`
              const gap = [
                xpTotal < gig.xpReq ? `${formatNumber(gig.xpReq)} XP` : "",
                gigs.length < gig.priorGigs ? `${gig.priorGigs} gigs cleared` : "",
              ].filter(Boolean)
              return (
                <Offer
                  key={gig.id}
                  artId={artFor(GIG_ART, gig.id)}
                  glow={tabGlow}
                  index={index}
                  afford={status === "ready"}
                  flash={flashKey === key}
                  locked={status === "locked"}
                  done={status === "done"}
                  title={gig.name}
                  actions={
                    <button type="button" disabled={status !== "ready"} onClick={() => act(key, () => clearGig(gig.id))}>
                      {status === "done" ? "Cleared" : status === "ready" ? "Clear gig" : "Locked"}
                    </button>
                  }
                >
                  {`pays $${formatNumber(gig.lump)}`}
                  {gig.retainerCps > 0 ? ` · retainer +$${formatNumber(gig.retainerCps)}/s` : ""}
                  {status === "locked" ? ` · needs ${gap.join(" + ")}` : ""}
                </Offer>
              )
            })
          ) : (
            <LockPanel title="Gig Board" lines={gigBoardRequirements(gates)} />
          )
        ) : null}

        {tab === "C" ? (
          unlocked.C ? (
            JOB_TIERS.map((job, index) => {
              const status = jobState(gates, job)
              const afford = status === "ready" && canAfford(money, job.baseCost)
              const key = `job:${job.id}`
              return (
                <Offer
                  key={job.id}
                  artId={artFor(JOB_ART, job.id)}
                  glow={tabGlow}
                  index={index}
                  afford={afford}
                  flash={flashKey === key}
                  locked={status === "locked"}
                  done={status === "owned"}
                  title={job.name}
                  actions={
                    <button type="button" disabled={!afford} onClick={() => act(key, () => buyJob(job.id))}>
                      {status === "owned" ? "Hired" : status === "locked" ? "Locked" : job.baseCost > 0 ? `Take $${formatNumber(job.baseCost)}` : "Accept"}
                    </button>
                  }
                >
                  {`salary +$${formatNumber(job.cps)}/s`}
                  {status === "locked" ? ` · needs ${formatNumber(job.xpReq)} XP` : ""}
                </Offer>
              )
            })
          ) : (
            <LockPanel title="Job Board" lines={jobBoardRequirements(gates)} />
          )
        ) : null}

        {tab === "G" ? (
          unlocked.G ? (
            <>
              {equipRows.length === 0 ? <p className="shop-empty">Gear shows up once you have held its price.</p> : null}
              {GEAR_KINDS.map((group) => {
                const rows = equipRows.filter((row) => row.kind === group.id).sort((a, b) => a.baseCost - b.baseCost)
                if (rows.length === 0) return null
                return (
                  <Fragment key={group.id}>
                    <h3 className="shop-section">{group.label}</h3>
                    {rows.map((row, index) => {
                      const have = ownedCount(equipment, row.id)
                      const cost = nextCost(row.baseCost, have)
                      const afford = canAfford(money, cost)
                      const key = `equip:${row.id}`
                      return (
                        <Offer
                          key={row.id}
                          artId={artFor(EQUIP_ART, row.id)}
                          glow={tabGlow}
                          index={index}
                          afford={afford}
                          flash={flashKey === key}
                          fresh={fresh.has(key)}
                          title={row.name}
                          actions={
                            <>
                              <button type="button" disabled={!afford} onClick={() => act(key, () => buyEquipment(row.id, "one"))}>
                                Buy ${formatNumber(cost)}
                              </button>
                              <button type="button" className="ghost" disabled={!afford} onClick={() => act(key, () => buyEquipment(row.id, "max"))}>
                                Max
                              </button>
                            </>
                          }
                        >
                          {[row.cps > 0 ? `+$${formatNumber(row.cps)}/s` : "", row.clickBonus > 0 ? `+$${formatNumber(row.clickBonus)} click` : ""]
                            .filter(Boolean)
                            .join(" · ")}
                          {" · owned "}
                          <OwnedCount value={have} />
                        </Offer>
                      )
                    })}
                  </Fragment>
                )
              })}
            </>
          ) : (
            <LockPanel title="Gear" lines={gearRequirements({ xpTotal })} />
          )
        ) : null}

        {tab === "D" ? (
          unlocked.D ? (
            <>
              {capitalRows.length === 0 ? <p className="shop-empty">No fund or firm within reach yet. Keep earning.</p> : null}
              {capitalRows.map((tier, index) => {
                const have = ownedCount(owned, tier.id)
                const cost = nextCost(tier.baseCost, have)
                const afford = canAfford(money, cost)
                const key = `capital:${tier.id}`
                return (
                  <Offer
                    key={tier.id}
                    artId={tier.artId}
                    glow={ERA_ACCENT[tier.era].glow}
                    index={index}
                    afford={afford}
                    flash={flashKey === key}
                    fresh={fresh.has(key)}
                    title={tier.name}
                    actions={
                      <>
                        <button type="button" disabled={!afford} onClick={() => act(key, () => buy(tier.id, "one"))}>
                          Buy ${formatNumber(cost)}
                        </button>
                        <button type="button" className="ghost" disabled={!afford} onClick={() => act(key, () => buy(tier.id, "max"))}>
                          Max
                        </button>
                      </>
                    }
                  >
                    +${formatNumber(tier.cps)}/s
                    {tier.clickBonus > 0 ? ` · +$${formatNumber(tier.clickBonus)} click` : ""}
                    {" · owned "}
                    <OwnedCount value={have} />
                  </Offer>
                )
              })}
            </>
          ) : (
            <LockPanel title="Capital" lines={capitalRequirements(gates)} either />
          )
        ) : null}
      </div>
      <button
        type="button"
        className="wipe"
        onClick={() => {
          if (window.confirm("Wipe this save? Your career restarts at high school.")) wipe()
        }}
      >
        Wipe save
      </button>
    </aside>
  )
}
