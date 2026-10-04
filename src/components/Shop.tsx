import { ArrowDown, Banknote, Check, ChevronRight, Circle, GitBranch, Lock } from "lucide-react"
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import type { ReactNode } from "react"
import { ERA_ACCENT } from "../data/sprites.ts"
import type { EmojiKind } from "../data/emojiAssets.ts"
import { SpriteTap } from "./SpriteView.tsx"
import { eraSections } from "../data/eras.ts"
import { gearSections, gearSidegrades } from "../data/gear.ts"
import { EQUIPMENT, GIG_BOARD_UNLOCK, GIGS, JOB_TIERS, jobBranches, SKILL_TIERS } from "../data/phases.ts"
import { CAPITAL } from "../data/capital.ts"
import type { Era } from "../data/capital.ts"
import { canAfford, isGearRevealed, isRevealed, isSkillRevealed, jobById, nextCost, ownedCount, visibleShopRows } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import { nextUnlock, shopFocus } from "../game/nextUnlock.ts"
import type { NextUnlock } from "../game/nextUnlock.ts"
import {
  capitalRequirements,
  capitalUnlocked,
  equipmentOpen,
  gigBoardRequirements,
  gearRequirements,
  gigBoardUnlocked,
  gigSkillGap,
  gigState,
  jobBoardRequirements,
  jobBoardUnlocked,
  jobState,
  PHASE_NAME,
  phaseRank,
  SHOP_TABS,
} from "../game/phase.ts"
import type { Requirement, ShopTab } from "../game/phase.ts"
import { readSavedShopTab, writeSavedShopTab } from "../game/shopTabPrefs.ts"
import { useGame } from "../game/store.ts"
import { ScrollPanel } from "./ScrollPanel.tsx"

/** A ready row reads "to buy it"; a gap still reads "need 10,000 more XP". */
function nextLine(next: NextUnlock): string {
  const body = next.needs.join(next.either ? " or " : " · ")
  return next.needs.every((line) => line.startsWith("to ")) ? body : `need ${body}`
}

/** Gear that costs less than the row it sits under, and jobs that branch off a pricier one. */
const SIDEGRADES = gearSidegrades(EQUIPMENT)
const BRANCHES = jobBranches(JOB_TIERS)

const PHASE_TAB: Record<ShopTab, { label: string; title: string; hint: string; glow: string }> = {
  A: { label: "Skills", title: "Study the next skill", hint: "Pay in XP", glow: "var(--ide-green)" },
  B: { label: "Gigs", title: "Take on a gig", hint: "First dollars", glow: "var(--ide-blue)" },
  C: { label: "Jobs", title: "Climb the ladder", hint: "Salary", glow: "var(--ide-peach)" },
  G: { label: "Gear", title: "Build out your infra", hint: "Repeatable buys", glow: "var(--ide-sky)" },
  D: { label: "Capital", title: "Deploy capital", hint: "Funds, equity, firms", glow: "var(--ide-mauve)" },
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
  kind: EmojiKind
  id: number
  rowKey: string
  glow: string
  index: number
  afford: boolean
  flash?: boolean
  fresh?: boolean
  locked?: boolean
  done?: boolean
  /** 0–1 progress through a closed reveal gate: the bar along the bottom of the row fills as it closes. Null when the gate is open. */
  gate?: number | null
  /** What is still missing, as counts that fall while you earn. Shown under the row's attributes until the gate opens. */
  unlock?: string[]
  /**
   * Once a row is open but the price is not yet in hand: `fill` is the share of the price held, `left` says how much
   * is missing. The same bottom bar and a money line, counting down as you earn. Ignored while the gate is shut.
   */
  saving?: { fill: number; left: string }
  /** sidegrade: a cheaper piece tucked under its parent. branch: another career path, not the next rung. */
  variant?: "sidegrade" | "branch"
  title: string
  children: ReactNode
  actions: ReactNode
}

function ratio(have: number, need: number): number {
  if (!(need > 0)) return 1
  return Math.max(0, Math.min(1, have / need))
}

/** The thinnest reading of a closed gate. Null once every part is met. */
function gateFill(parts: number[]): number | null {
  if (parts.length === 0) return null
  const fill = Math.min(...parts)
  return fill >= 1 ? null : fill
}

function scrollRowIntoList(list: HTMLElement, row: HTMLElement) {
  const header = row.previousElementSibling
  const anchor = header instanceof HTMLElement && header.classList.contains("shop-section") ? header : row
  const listRect = list.getBoundingClientRect()
  const anchorRect = anchor.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const align = anchor === row ? Math.max(0, (list.clientHeight - rowRect.height) / 2) : 0
  const top = list.scrollTop + (anchorRect.top - listRect.top) - align
  list.scrollTop = Math.max(0, top)
}

function Offer({ kind, id, rowKey, glow, index, afford, flash, fresh, locked, done, gate, unlock, saving, variant, title, children, actions }: OfferProps) {
  const gated = typeof gate === "number" && gate < 1
  const pending = !gated && saving && saving.fill < 1 ? saving : null
  return (
    <article
      data-row={rowKey}
      className={[
        "offer",
        afford ? "afford" : "",
        flash ? "flash" : "",
        fresh ? "fresh" : "",
        locked ? "is-locked" : "",
        done ? "is-done" : "",
        variant ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--offer-glow" as string]: glow, ["--i" as string]: index }}
    >
      <div className="offer-art-col">
        <SpriteTap kind={kind} id={id} className="offer-art" size={variant === "sidegrade" ? 40 : 64} label={title} />
      </div>
      <div className="offer-copy">
        <h3>
          {title}
          {fresh ? <span className="new-tag">New</span> : null}
          {variant === "sidegrade" ? (
            <span className="side-tag" title="Costs less than the row above, but it is a side purchase, not an earlier tier">
              sidegrade
            </span>
          ) : null}
          {variant === "branch" ? (
            <span className="branch-mark" title="A different path from the job above, priced on its own">
              <GitBranch {...UI_ICON_SM} aria-hidden />
              branch
            </span>
          ) : null}
        </h3>
        <p>{children}</p>
        {gated && unlock && unlock.length > 0 ? (
          <p className="offer-unlock" data-testid="offer-unlock">
            <Lock {...UI_ICON_SM} aria-label="Locked" role="img" />
            <span>{unlock.join(" + ")}</span>
          </p>
        ) : null}
        {pending ? (
          <p className="offer-unlock" data-testid="offer-saving">
            <Banknote {...UI_ICON_SM} aria-label="Money needed" role="img" />
            <span>{pending.left}</span>
          </p>
        ) : null}
      </div>
      <div className="offer-actions">{actions}</div>
      {gated ? (
        <span className="offer-progress" data-kind="unlock" style={{ ["--gate" as string]: String(Math.max(0, gate)) }} data-testid="offer-progress" aria-hidden="true" />
      ) : pending ? (
        <span className="offer-progress" data-kind="money" style={{ ["--gate" as string]: String(Math.max(0, pending.fill)) }} data-testid="offer-progress" aria-hidden="true" />
      ) : null}
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
            {line.met ? <Check {...UI_ICON} strokeWidth={2.5} aria-hidden /> : <Circle {...UI_ICON} aria-hidden />}
            {line.text}
          </li>
        ))}
      </ul>
      {either ? <p className="lock-note">Either one opens it.</p> : null}
    </div>
  )
}

export function Shop({ onCollapse }: { onCollapse: () => void }) {
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

  const [picked, setPickedState] = useState<ShopTab | null>(() => readSavedShopTab())
  const setPicked = (tab: ShopTab | null) => {
    writeSavedShopTab(tab)
    setPickedState(tab)
  }
  const [lastPhase, setLastPhase] = useState(phase)
  // The era tab doubles as the IDE preview: the store holds it and snaps it back to the owned era.
  const pickedEra = useGame((s) => s.previewEra)
  const setPickedEra = useGame((s) => s.setPreviewEra)
  const holdPreview = useGame((s) => s.holdPreview)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const [pinnedRow, setPinnedRow] = useState<string | null>(null)
  const [jumpSeq, setJumpSeq] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const seenRows = useRef(new Map<string, number>())
  const jumpRow = useRef<string | null>(null)
  const jumped = useRef(0)
  const pin = (kind: string, id: number) => pinnedRow === `${kind}:${id}`

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

  const skillRows = visibleShopRows(
    SKILL_TIERS,
    (row) => ownedCount(skills, row.id) > 0,
    (row) => pin("skill", row.id),
  )
  const gigRows = visibleShopRows(GIGS, (gig) => gigs.includes(gig.id), (gig) => pin("gig", gig.id))
  const jobRows = visibleShopRows(JOB_TIERS, (job) => jobs.includes(job.id), (job) => pin("job", job.id))
  const equipRows = visibleShopRows(
    EQUIPMENT,
    (row) => ownedCount(equipment, row.id) > 0,
    (row) => pin("gear", row.id),
  )
  const next = nextUnlock({ ...gates, equipment, money, xp })

  const revealedByEra = useMemo(() => {
    const visible = visibleShopRows(
      CAPITAL,
      (tier) => ownedCount(owned, tier.id) > 0,
      (tier) => pinnedRow === `capital:${tier.id}`,
    )
    const map = new Map<Era, typeof visible>()
    for (const tier of visible) {
      const rows = map.get(tier.era)
      if (rows) rows.push(tier)
      else map.set(tier.era, [tier])
    }
    for (const rows of map.values()) rows.sort((a, b) => a.baseCost - b.baseCost)
    return map
  }, [owned, pinnedRow])
  const eraTabs = eraSections().filter((section) => revealedByEra.has(section.id))
  const topEra = [...eraTabs].reverse().find((section) => (revealedByEra.get(section.id) ?? []).some((tier) => ownedCount(owned, tier.id) > 0))
  const era = pickedEra && revealedByEra.has(pickedEra) ? pickedEra : (topEra?.id ?? eraTabs[0]?.id ?? "mid")
  const capitalRows = revealedByEra.get(era) ?? []

  const rowCount =
    tab === "A" ? skillRows.length : tab === "B" ? gigRows.length : tab === "C" ? jobRows.length : tab === "G" ? equipRows.length : capitalRows.length
  const rowScope = tab === "D" ? `D:${era}` : tab
  const [listOverflows, setListOverflows] = useState(false)
  const showJumpEnd = unlocked[tab] && listOverflows

  function scrollToLastAvailable() {
    const list = listRef.current
    if (!list) return
    const offers = [...list.querySelectorAll<HTMLElement>(".offer")]
    const target =
      [...offers].reverse().find((el) => !el.classList.contains("is-done") && !el.classList.contains("is-locked")) ??
      offers.at(-1)
    if (!target) return
    target.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const previous = seenRows.current.get(rowScope)
    seenRows.current.set(rowScope, rowCount)
    if (jumpRow.current && jumped.current !== jumpSeq) return
    if (previous === undefined || rowCount <= previous) return
    const row =
      [...list.querySelectorAll<HTMLElement>(".offer.fresh")].at(-1) ??
      list.querySelector<HTMLElement>(".offer:last-of-type")
    if (!row) return
    const listBox = list.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()
    const below = rowBox.bottom - listBox.bottom
    const above = listBox.top - rowBox.top
    if (below > 0) list.scrollTop += below
    else if (above > 0) list.scrollTop -= above
  }, [rowScope, rowCount, jumpSeq])

  useLayoutEffect(() => {
    const rowKey = jumpRow.current
    if (!rowKey || jumpSeq === 0 || jumped.current === jumpSeq) return
    const list = listRef.current
    const row = list?.querySelector<HTMLElement>(`[data-row="${rowKey}"]`)
    if (!list || !row) return
    scrollRowIntoList(list, row)
    jumped.current = jumpSeq
  }, [jumpSeq, tab, era, rowScope, rowCount])

  function openNext(target: NextUnlock) {
    const focus = shopFocus({ ...gates, equipment, money, xp }, target)
    if (!focus) {
      jumpRow.current = null
      setPicked(target.tab)
      return
    }
    jumpRow.current = focus.row
    setPinnedRow(focus.row)
    setPicked(focus.tab)
    if (focus.era && focus.era !== era) setPickedEra(focus.era)
    setJumpSeq((n) => n + 1)
    const flash = focus.row.startsWith("gear:") ? `equip:${focus.row.slice("gear:".length)}` : focus.row
    setFlashKey(flash)
    window.setTimeout(() => setFlashKey((current) => (current === flash ? null : current)), 440)
  }

  const revealedKeys = [
    ...skillRows.map((row) => `skill:${row.id}`),
    ...equipRows.map((row) => `equip:${row.id}`),
    ...[...revealedByEra.values()].flat().map((tier) => `capital:${tier.id}`),
  ]
  const ownedKeys = new Set<string>()
  for (const [id, count] of Object.entries(skills)) if (count > 0) ownedKeys.add(`skill:${id}`)
  for (const [id, count] of Object.entries(equipment)) if (count > 0) ownedKeys.add(`equip:${id}`)
  for (const [id, count] of Object.entries(owned)) if (count > 0) ownedKeys.add(`capital:${id}`)
  const [known, setKnown] = useState<ReadonlySet<string>>(() => new Set(revealedKeys))
  const revealedGrew = revealedKeys.length !== known.size || revealedKeys.some((key) => !known.has(key))
  // A row that shows up already bought must not keep the badge. Clicking buy also clears it.
  const staleFresh = [...fresh].some((key) => ownedKeys.has(key))
  if (revealedGrew || staleFresh) {
    const added = revealedKeys.filter((key) => !known.has(key) && !ownedKeys.has(key))
    if (revealedGrew) setKnown(new Set(revealedKeys))
    setFresh((current) => {
      const next = new Set<string>()
      for (const key of current) if (!ownedKeys.has(key)) next.add(key)
      for (const key of added) next.add(key)
      if (next.size === current.size && [...next].every((key) => current.has(key))) return current
      return next
    })
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
        <div className="shop-head-top">
          <p className="eyebrow">
            {tab === "G" ? "Gear · Infra" : `Phase ${tab} · ${PHASE_NAME[tab]}`}
          </p>
          {showJumpEnd ? (
            <button
              type="button"
              className="shop-panel-toggle shop-jump-end"
              data-testid="shop-jump-end"
              aria-label="Jump to latest available option"
              title="Latest available"
              onClick={scrollToLastAvailable}
            >
              <ArrowDown {...UI_ICON} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="shop-panel-toggle shop-panel-hide"
            data-testid="shop-panel-hide"
            aria-label="Hide shop"
            onClick={onCollapse}
          >
            <ChevronRight {...UI_ICON} aria-hidden />
          </button>
        </div>
        <div className="shop-head-row">
          <h2>{unlocked[tab] ? PHASE_TAB[tab].title : `${PHASE_TAB[tab].label} locked`}</h2>
          <p className="era-hint">{PHASE_TAB[tab].hint}</p>
        </div>
      </div>
      <div className="era-tabs" role="tablist" aria-label="Career phases">
        {SHOP_TABS.map((id) => {
          const locked = !unlocked[id]
          const affordable =
            !locked &&
            ((id === "A" && skillRows.some((row) => canAfford(xp, nextCost(row.baseXpCost, ownedCount(skills, row.id))))) ||
              (id === "B" && gigRows.some((gig) => gigState(gates, gig) === "ready")) ||
              (id === "C" && jobRows.some((job) => jobState(gates, job) === "ready" && canAfford(money, job.baseCost))) ||
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
        onClick={() => next && openNext(next)}
      >
        <span className="next-kicker">Next</span>
        {next ? (
          <>
            <strong className="next-name">{next.name}</strong>
            <span className="next-needs">{nextLine(next)}</span>
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

      <ScrollPanel
        key={rowScope}
        wrapClassName="shop-list-wrap"
        className="shop-list"
        scrollRef={listRef}
        showArrow={false}
        onOverflowChange={setListOverflows}
      >
        {tab === "A" ? (
          <>
            {skillRows.map((row, index) => {
              const have = ownedCount(skills, row.id)
              const cost = nextCost(row.baseXpCost, have)
              const revealed = isSkillRevealed(row, skills, xpTotal)
              const afford = revealed && canAfford(xp, cost)
              const key = `skill:${row.id}`
              const gate = revealed || have > 0 ? null : gateFill([ratio(xpTotal, row.unlockAtXp)])
              return (
                <Offer
                  key={row.id}
                  kind="skill"
                  id={row.id}
                  rowKey={`skill:${row.id}`}
                  glow={tabGlow}
                  index={index}
                  afford={afford}
                  flash={flashKey === key}
                  fresh={fresh.has(key) && have === 0}
                  locked={!revealed && have === 0}
                  gate={gate}
                  unlock={[`${formatNumber(Math.ceil(row.unlockAtXp - xpTotal))} more lifetime XP`]}
                  title={row.name}
                  actions={
                    <>
                      <button type="button" disabled={!afford} onClick={() => act(key, () => buySkill(row.id, "one"))}>
                        {`Learn ${formatNumber(cost)} XP`}
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
            {xpTotal >= GIG_BOARD_UNLOCK.minXp && !unlocked.B ? (
              <p className="shop-empty">Gig Board is waiting on Portfolio and React.</p>
            ) : null}
          </>
        ) : null}

        {tab === "B" ? (
          unlocked.B ? (
            gigRows.map((gig, index) => {
              const status = gigState(gates, gig)
              const key = `gig:${gig.id}`
              const gap = [
                xpTotal < gig.xpReq ? `${formatNumber(Math.ceil(gig.xpReq - xpTotal))} more XP` : "",
                gigs.length < gig.priorGigs ? `${gig.priorGigs - gigs.length} more ${gig.priorGigs - gigs.length === 1 ? "gig" : "gigs"} cleared` : "",
                gigSkillGap(gates, gig) ?? "",
              ].filter(Boolean)
              const skillMet = gig.skillIds.filter((id) => ownedCount(skills, id) > 0).length
              const gate =
                status === "locked"
                  ? gateFill([ratio(xpTotal, gig.xpReq), ratio(gigs.length, gig.priorGigs), ratio(skillMet, gig.skillIds.length)])
                  : null
              return (
                <Offer
                  key={gig.id}
                  kind="gig"
                  id={gig.id}
                  rowKey={`gig:${gig.id}`}
                  glow={tabGlow}
                  index={index}
                  afford={status === "ready"}
                  flash={flashKey === key}
                  locked={status === "locked"}
                  done={status === "done"}
                  gate={gate}
                  unlock={gap}
                  title={gig.name}
                  actions={
                    <button type="button" disabled={status !== "ready"} onClick={() => act(key, () => clearGig(gig.id))}>
                      {status === "done" ? "Cleared" : "Clear gig"}
                    </button>
                  }
                >
                  {`pays $${formatNumber(gig.lump)}`}
                  {gig.retainerCps > 0 ? ` · retainer +$${formatNumber(gig.retainerCps)}/s` : ""}
                </Offer>
              )
            })
          ) : (
            <LockPanel title="Gig Board" lines={gigBoardRequirements(gates)} />
          )
        ) : null}

        {tab === "C" ? (
          unlocked.C ? (
            jobRows.map((job, index) => {
              const status = jobState(gates, job)
              const afford = status === "ready" && canAfford(money, job.baseCost)
              const key = `job:${job.id}`
              const gate = status === "locked" ? gateFill([ratio(xpTotal, job.xpReq)]) : null
              return (
                <Offer
                  key={job.id}
                  kind="job"
                  id={job.id}
                  rowKey={`job:${job.id}`}
                  glow={tabGlow}
                  index={index}
                  afford={afford}
                  flash={flashKey === key}
                  locked={status === "locked"}
                  done={status === "owned"}
                  gate={gate}
                  unlock={[`${formatNumber(Math.ceil(job.xpReq - xpTotal))} more XP`]}
                  saving={
                    status === "ready" && job.baseCost > 0
                      ? { fill: ratio(money, job.baseCost), left: `$${formatNumber(Math.ceil(job.baseCost - money))} more` }
                      : undefined
                  }
                  variant={BRANCHES.has(job.id) ? "branch" : undefined}
                  title={job.name}
                  actions={
                    <button type="button" disabled={!afford} onClick={() => act(key, () => buyJob(job.id))}>
                      {status === "owned" ? "Hired" : job.baseCost > 0 ? `Take $${formatNumber(job.baseCost)}` : "Accept"}
                    </button>
                  }
                >
                  {`salary +$${formatNumber(job.cps)}/s`}
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
              {gearSections(equipRows).map((group) => (
                <Fragment key={group.id}>
                  <h3 className="shop-section">{group.label}</h3>
                  {group.rows.map((row, index) => {
                      const have = ownedCount(equipment, row.id)
                      const cost = nextCost(row.baseCost, have)
                      const revealed = isGearRevealed(row, equipment, peakMoney, jobs)
                      const afford = revealed && canAfford(money, cost)
                      const key = `equip:${row.id}`
                      const gate =
                        revealed || have > 0
                          ? null
                          : gateFill([
                              ratio(peakMoney, row.unlockMoney),
                              row.unlockJobId > 0 ? (jobs.includes(row.unlockJobId) ? 1 : 0) : 1,
                            ])
                      return (
                        <Offer
                          key={row.id}
                          kind="equipment"
                          id={row.id}
                          rowKey={`gear:${row.id}`}
                          glow={tabGlow}
                          index={index}
                          afford={afford}
                          flash={flashKey === key}
                          fresh={fresh.has(key) && have === 0}
                          locked={!revealed && have === 0}
                          gate={gate}
                          unlock={[
                            ...(peakMoney < row.unlockMoney ? [`$${formatNumber(Math.ceil(row.unlockMoney - peakMoney))} more held`] : []),
                            ...(row.unlockJobId > 0 && !jobs.includes(row.unlockJobId) ? [`the ${jobById(row.unlockJobId)?.name ?? `job ${row.unlockJobId}`} job`] : []),
                          ]}
                          variant={SIDEGRADES.has(row.id) ? "sidegrade" : undefined}
                          title={row.name}
                          actions={
                            <>
                              <button type="button" disabled={!afford} onClick={() => act(key, () => buyEquipment(row.id, "one"))}>
                                {`Buy $${formatNumber(cost)}`}
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
              ))}
            </>
          ) : (
            <LockPanel title="Gear" lines={gearRequirements({ xpTotal })} />
          )
        ) : null}

        {tab === "D" ? (
          unlocked.D ? (
            <>
              {capitalRows.map((tier, index) => {
                const have = ownedCount(owned, tier.id)
                const cost = nextCost(tier.baseCost, have)
                const revealed = isRevealed(tier, owned, peakMoney)
                const afford = revealed && canAfford(money, cost)
                const key = `capital:${tier.id}`
                const gate = revealed || have > 0 ? null : gateFill([ratio(peakMoney, tier.baseCost)])
                return (
                  <Offer
                    key={tier.id}
                    kind="capital"
                    id={tier.id}
                    rowKey={`capital:${tier.id}`}
                    glow={ERA_ACCENT[tier.era].glow}
                    index={index}
                    afford={afford}
                    flash={flashKey === key}
                    fresh={fresh.has(key) && have === 0}
                    locked={!revealed && have === 0}
                    gate={gate}
                    unlock={[`$${formatNumber(Math.ceil(tier.baseCost - peakMoney))} more held`]}
                    title={tier.name}
                    actions={
                      <>
                        <button type="button" disabled={!afford} onClick={() => act(key, () => buy(tier.id, "one"))}>
                          {`Buy $${formatNumber(cost)}`}
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
      </ScrollPanel>
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
