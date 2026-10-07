import { ArrowDown, BriefcaseBusiness, Check, ChevronRight, Circle, Lock, MousePointerClick, Trophy } from "lucide-react"
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import type { ReactNode } from "react"
import { ERA_ACCENT } from "../data/eraAccent.ts"
import type { EmojiKind } from "../data/emojiAssets.ts"
import { SpriteTap } from "./SpriteView.tsx"
import { eraSections } from "../data/eras.ts"
import { gearSections } from "../data/gear.ts"
import { EQUIPMENT, GIG_BOARD_UNLOCK, GIGS, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { CAPITAL } from "../data/capital.ts"
import { GOLD_FAMILY_NAME } from "../data/gold.ts"
import type { GoldSkill } from "../data/gold.ts"
import type { Era } from "../data/capital.ts"
import { canAfford, isGearRevealed, isRevealed, isSkillRevealed, jobById, nextCost, ownedCount, quotePurchase, skillCost, visibleShopRows } from "../game/economy.ts"
import { buyAmounts, canBuyGold, goldSectionOpen, isGoldRevealed, visibleGold } from "../game/gold.ts"
import type { BuyAmount } from "../game/gold.ts"
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
import { isCosmetic, rowUnlocks } from "../game/features.ts"
import { NewMark, UnlockBadge } from "./FeatureMarks.tsx"
import { useSurface, useUnlockedSet } from "./useFeature.ts"
import { interviewForJob } from "../game/studio/interviews.ts"
import { loadStudio, onStudioHire, openStudio } from "./studio/launcher.ts"

/** A ready row reads "to buy it"; a gap still reads "need 10,000 more XP". */
function nextLine(next: NextUnlock): string {
  const body = next.needs.join(next.either ? " or " : " · ")
  return next.needs.every((line) => line.startsWith("to ")) ? body : `need ${body}`
}

const PHASE_TAB: Record<ShopTab, { label: string; title: string; hint: string; glow: string; done: string }> = {
  A: { label: "Skills", title: "Study the next skill", hint: "Pay in XP", glow: "var(--ide-green)", done: "Every skill learned" },
  B: { label: "Gigs", title: "Take on a gig", hint: "First dollars", glow: "var(--ide-blue)", done: "Every gig cleared" },
  C: { label: "Jobs", title: "Climb the ladder", hint: "Salary", glow: "var(--ide-peach)", done: "Every job held" },
  G: { label: "Gear", title: "Build out your infra", hint: "Repeatable buys", glow: "var(--ide-sky)", done: "Every gear row bought" },
  D: { label: "Capital", title: "Deploy capital", hint: "Funds, equity, firms", glow: "var(--ide-mauve)", done: "Every capital row bought" },
}

function OwnedCount({ value }: { value: number }) {
  const [initial] = useState(value)
  return (
    <span key={value} className={value !== initial ? "own tick-up" : "own"}>
      {formatNumber(value)}
    </span>
  )
}

/** A row has little room, so "click" and "salary" are glyphs. The word stays as the label for screen readers. */
function StatIcon({ kind }: { kind: "click" | "salary" }) {
  const Icon = kind === "click" ? MousePointerClick : BriefcaseBusiness
  return <Icon {...UI_ICON_SM} className="stat-icon" role="img" aria-label={kind} />
}

/** One stat in a row's line. The icon stays on the same line as its number when the row wraps. */
function Stat({ icon, children }: { icon?: "click" | "salary"; children: ReactNode }) {
  return (
    <span className="stat">
      {icon ? <StatIcon kind={icon} /> : null}
      {children}
    </span>
  )
}

/** Stats joined by a dot, the way the rows always read. */
function Stats({ items }: { items: ReactNode[] }) {
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? " · " : null}
          {item}
        </Fragment>
      ))}
    </>
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
  /** What is still missing, in words with no counts. Shown under the row's attributes until the gate opens. */
  unlock?: string[]
  title: string
  children: ReactNode
  actions: ReactNode
  /** Replaces the sprite in the art column (gold rows carry a trophy). */
  art?: ReactNode
  /** A gold skill row: gold frame, never a sprite. */
  gold?: boolean
  /** What buying this row unlocks on the desk, while that is still closed. */
  unlocks?: readonly { id: string; name: string }[]
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

function Offer({ kind, id, rowKey, glow, index, afford, flash, fresh, locked, done, unlock, title, children, actions, art, gold, unlocks }: OfferProps) {
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
        gold ? "gold-offer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--offer-glow" as string]: glow, ["--i" as string]: index }}
    >
      <div className="offer-art-col">
        {art ?? <SpriteTap kind={kind} id={id} className="offer-art" size={64} label={title} />}
      </div>
      <div className="offer-copy">
        <h3>
          {title}
          {fresh ? <span className="new-tag">New</span> : null}
          {unlocks?.map((feature) => (
            <UnlockBadge key={feature.id} id={feature.id} />
          ))}
        </h3>
        <p>{children}</p>
        {locked && unlock && unlock.length > 0 ? (
          <p className="offer-unlock" data-testid="offer-unlock">
            <Lock {...UI_ICON_SM} aria-label="Locked" role="img" />
            <span>{unlock.join(" + ")}</span>
          </p>
        ) : null}
      </div>
      <div className="offer-actions">{actions}</div>
    </article>
  )
}

/** `Learn 480 XP` for one copy; `Learn ×5 2,400 XP` when a gold amount is set and the budget covers more than one. */
function buyLabel(verb: string, currency: "xp" | "money", baseCost: number, have: number, budget: number, amount: BuyAmount, firstCost?: number): string {
  const price = (n: number) => (currency === "money" ? `$${formatNumber(n)}` : `${formatNumber(n)} XP`)
  const one = have === 0 && firstCost !== undefined ? firstCost : nextCost(baseCost, have)
  if (amount === 1) return `${verb} ${price(one)}`
  const quote = quotePurchase(budget, baseCost, have, amount, firstCost)
  if (quote.count <= 1) return `${verb} ${price(one)}`
  return `${verb} ×${quote.count} ${price(quote.total)}`
}

/** 10x dev skills (gold in the code) carry a trophy in the art column instead of a sprite. */
function GoldArt({ row }: { row: GoldSkill }) {
  return (
    <span className="gold-art" role="img" aria-label={`Gold skill: ${row.name}`}>
      <Trophy size={34} strokeWidth={2.2} aria-hidden />
    </span>
  )
}

/** The Buy amount control. It only appears once a gold skill adds an amount beyond one copy. */
function AmountPicker({ amounts, value, onPick }: { amounts: readonly BuyAmount[]; value: BuyAmount; onPick: (amount: BuyAmount) => void }) {
  if (amounts.length < 2) return null
  return (
    <div className="buy-amount" role="group" aria-label="Buy amount" data-testid="buy-amount">
      <span className="buy-amount-label">Buy</span>
      {amounts.map((amount) => (
        <button
          key={amount}
          type="button"
          className="buy-amount-step"
          aria-pressed={amount === value}
          data-amount={amount}
          onClick={() => onPick(amount)}
        >
          {amount === "max" ? "Max" : `×${amount}`}
        </button>
      ))}
    </div>
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
  const interviews = useGame((s) => s.interviews)
  const gold = useGame((s) => s.gold)
  const buyAmount = useGame((s) => s.buyAmount)
  const setBuyAmount = useGame((s) => s.setBuyAmount)
  const buyGold = useGame((s) => s.buyGold)
  const phase = useGame((s) => s.phase)
  const buySkill = useGame((s) => s.buySkill)
  const buyEquipment = useGame((s) => s.buyEquipment)
  const buyJob = useGame((s) => s.buyJob)
  const buy = useGame((s) => s.buy)
  const clearGig = useGame((s) => s.clearGig)

  const [picked, setPickedState] = useState<ShopTab | null>(() => readSavedShopTab())
  const setPicked = (tab: ShopTab | null) => {
    writeSavedShopTab(tab)
    setPickedState(tab)
  }
  const [skillView, setSkillView] = useState<"skills" | "tenx">("skills")
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
  const gates = { xpTotal, peakMoney, skills, owned, jobs, gigs, interviews }
  const unlocked: Record<ShopTab, boolean> = {
    A: true,
    B: gigBoardUnlocked(gates),
    C: jobBoardUnlocked(gates),
    G: equipmentOpen({ xpTotal, equipment }),
    D: capitalUnlocked(gates),
  }
  // Closed boards stay out of the bar, except the next one to open, which waits there dimmed.
  const nextLockedTab = (["G", "B", "C", "D"] as const).find((id) => !unlocked[id]) ?? null
  // A pick saved from another career can point at a board this one has not reached: show the phase instead.
  const tab = picked && (unlocked[picked] || picked === nextLockedTab) ? picked : phase
  const unlockedSet = useUnlockedSet()
  const seeFeature = useGame((s) => s.seeFeature)
  /** The features a row opens that are still closed. A picker and its first cosmetic arrive together: name the picker. */
  const teaseFor = (rowKey: string) => {
    const rows = rowUnlocks(rowKey).filter((row) => !unlockedSet.has(row.id))
    const main = rows.filter((row) => !isCosmetic(row))
    return (main.length > 0 ? main : rows).map((row) => ({ id: row.id, name: row.name }))
  }
  useSurface("tenx", () => {
    seeFeature("tenx")
    setSkillView("tenx")
    setPicked("A")
  })
  // A Hire closes the whiteboard here, on the job's row. Every setter below is stable, so the first render's closure holds.
  useEffect(
    () =>
      onStudioHire((jobId) => {
        const row = `job:${jobId}`
        jumpRow.current = row
        setPinnedRow(row)
        setPicked("C")
        setJumpSeq((n) => n + 1)
        setFlashKey(row)
        window.setTimeout(() => setFlashKey((current) => (current === row ? null : current)), 1600)
      }),
    [],
  )
  useSurface("boardGear", () => {
    seeFeature("boardGear")
    setPicked("G")
  })


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
  // The banner speaks for the open panel only: its closed board, or its first row not bought yet.
  const next = nextUnlock({ ...gates, equipment, money, xp }, tab)
  const goldOpen = goldSectionOpen({ xpTotal, gold })
  // The Skills tab splits in two once the first 10x dev skill is in reach: the 104 skills, or the perks.
  const tenx = tab === "A" && goldOpen && skillView === "tenx"
  const goldRows = visibleGold(gold)
  const amounts = buyAmounts(gold)

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
    tab === "A" ? (tenx ? goldRows.length : skillRows.length) : tab === "B" ? gigRows.length : tab === "C" ? jobRows.length : tab === "G" ? equipRows.length : capitalRows.length
  const rowScope = tab === "D" ? `D:${era}` : tenx ? "A:tenx" : tab
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

  // One list serves every tab, so it keeps its scroll offset across a switch. The newest rows sit at the bottom: land there.
  // This runs before the "Next" jump below, which still wins when it targets a specific row.
  const shownScope = useRef(rowScope)
  useLayoutEffect(() => {
    if (shownScope.current === rowScope) return
    shownScope.current = rowScope
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [rowScope])

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
    if (target.tab === "A") setSkillView("skills")
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
  const nextTease = next ? teaseFor(next.key) : []

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
          if (locked && id !== nextLockedTab) return null
          const affordable =
            !locked &&
            ((id === "A" &&
              (skillRows.some((row) => canAfford(xp, skillCost(row, ownedCount(skills, row.id)))) ||
                visibleGold(gold).some((row) => canBuyGold({ xp, xpTotal, gold }, row)))) ||
              (id === "B" && gigRows.some((gig) => gigState(gates, gig) === "ready")) ||
              (id === "C" && jobRows.some((job) => jobState(gates, job) === "ready" && canAfford(xp, job.xpCost))) ||
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
              className={["era-tab", id === tab ? "active" : "", locked ? "is-locked is-next" : ""].filter(Boolean).join(" ")}
              style={{ ["--tab-glow" as string]: PHASE_TAB[id].glow }}
              data-feature-anchor={id === "G" ? "boardGear" : undefined}
              onClick={() => {
                if (id === "G") seeFeature("boardGear")
                setPicked(id)
              }}
            >
              {locked ? <i className="lock-pip" aria-label="Locked" /> : null}
              {PHASE_TAB[id].label}
              {affordable ? <i className="deal-dot" aria-label="Something is available" /> : null}
              {id === "G" ? <NewMark id="boardGear" pill /> : null}
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
            <strong className="next-name">
              {next.name}
              {nextTease.map((feature) => (
                <UnlockBadge key={feature.id} id={feature.id} named />
              ))}
            </strong>
            <span className="next-needs">{nextLine(next)}</span>
          </>
        ) : (
          <span className="next-needs">{PHASE_TAB[tab].done}</span>
        )}
      </button>

      {tab === "A" && goldOpen ? (
        <div className="era-tabs era-sub" role="tablist" aria-label="Skill kinds">
          <button
            type="button"
            role="tab"
            data-view="skills"
            aria-selected={!tenx}
            className={!tenx ? "era-tab active" : "era-tab"}
            style={{ ["--tab-glow" as string]: PHASE_TAB.A.glow }}
            onClick={() => setSkillView("skills")}
          >
            Skills
          </button>
          <button
            type="button"
            role="tab"
            data-view="tenx"
            aria-selected={tenx}
            className={tenx ? "era-tab active tenx-tab" : "era-tab tenx-tab"}
            style={{ ["--tab-glow" as string]: "var(--boost-gold)" }}
            data-feature-anchor="tenx"
            onClick={() => {
              seeFeature("tenx")
              setSkillView("tenx")
            }}
          >
            <Trophy {...UI_ICON_SM} aria-hidden />
            10x dev
            {visibleGold(gold).some((row) => canBuyGold({ xp, xpTotal, gold }, row)) ? <i className="deal-dot" aria-label="Something is available" /> : null}
            <NewMark id="tenx" pill />
          </button>
        </div>
      ) : null}

      {tab !== "B" && tab !== "C" && !tenx && unlocked[tab] ? <AmountPicker amounts={amounts} value={buyAmount} onPick={setBuyAmount} /> : null}

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
        {tab === "A" && !tenx ? (
          <>
            {skillRows.map((row, index) => {
              const have = ownedCount(skills, row.id)
              const cost = skillCost(row, have)
              const revealed = isSkillRevealed(row, skills, xpTotal)
              const afford = revealed && canAfford(xp, cost)
              const key = `skill:${row.id}`
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
                  unlock={["More lifetime XP"]}
                  unlocks={have === 0 ? teaseFor(key) : undefined}
                  title={row.name}
                  actions={
                    <>
                      <button type="button" disabled={!afford} onClick={() => act(key, () => buySkill(row.id, buyAmount))}>
                        {!revealed && have === 0 ? "Locked" : buyLabel("Learn", "xp", row.baseXpCost, have, xp, buyAmount, row.firstXpCost)}
                      </button>
                    </>
                  }
                >
                  <Stats
                    items={[
                      ...(row.xpPerClick > 0 ? [<Stat key="click" icon="click">{`+${formatNumber(row.xpPerClick)} XP`}</Stat>] : []),
                      ...(row.xpPerSec > 0 ? [<Stat key="sec">{`+${formatNumber(row.xpPerSec)} XP/s`}</Stat>] : []),
                    ]}
                  />
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

        {tenx ? (
          <>
            <p className="gold-intro">
              <Trophy {...UI_ICON_SM} aria-hidden />
              Perks, not income. Each is bought once with XP.
            </p>
            {goldRows.map((row, index) => {
              const owns = gold.includes(row.id)
              const revealed = isGoldRevealed(row, { xpTotal, gold })
              const afford = canBuyGold({ xp, xpTotal, gold }, row)
              const key = `gold:${row.id}`
              return (
                <Offer
                  key={row.id}
                  kind="skill"
                  id={row.id}
                  rowKey={key}
                  glow="var(--boost-gold)"
                  index={index}
                  afford={afford}
                  flash={flashKey === key}
                  locked={!revealed && !owns}
                  done={owns}
                  gold
                  unlock={["More lifetime XP"]}
                  title={row.name}
                  art={<GoldArt row={row} />}
                  actions={
                    owns ? (
                      <button type="button" disabled>
                        Owned
                      </button>
                    ) : (
                      <button type="button" disabled={!afford} onClick={() => act(key, () => buyGold(row.id))}>
                        {!revealed && !owns ? "Locked" : `Claim ${formatNumber(row.cost)} XP`}
                      </button>
                    )
                  }
                >
                  <span className="gold-family">{GOLD_FAMILY_NAME[row.family]}</span>
                  {" · "}
                  {row.blurb}
                </Offer>
              )
            })}
          </>
        ) : null}

        {tab === "B" ? (
          unlocked.B ? (
            gigRows.map((gig, index) => {
              const status = gigState(gates, gig)
              const key = `gig:${gig.id}`
              const gap = [
                xpTotal < gig.xpReq ? "More XP" : "",
                gigs.length < gig.priorGigs ? "Earlier gigs cleared" : "",
                gigSkillGap(gates, gig) !== null ? "More skills" : "",
              ].filter(Boolean)
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
              const afford = status === "ready" && canAfford(xp, job.xpCost)
              const key = `job:${job.id}`
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
                  unlock={["More XP"]}
                  title={job.name}
                  actions={
                    status === "interview" ? (
                      <button
                        type="button"
                        data-testid="job-interview"
                        onPointerEnter={() => void loadStudio()}
                        onFocus={() => void loadStudio()}
                        onClick={() => openStudio(interviewForJob(job.id)?.id)}
                      >
                        Interview
                      </button>
                    ) : (
                      <button type="button" disabled={!afford} onClick={() => act(key, () => buyJob(job.id))}>
                        {status === "owned" ? "Hired" : status === "locked" ? "Locked" : job.xpCost > 0 ? `Take ${formatNumber(job.xpCost)} XP` : "Accept"}
                      </button>
                    )
                  }
                >
                  <Stats
                    items={[
                      <Stat key="salary" icon="salary">{`+$${formatNumber(job.cps)}/s`}</Stat>,
                      <Stat key="click" icon="click">{`+$${formatNumber(job.clickBonus)} +${job.clickPct}% of $/s`}</Stat>,
                      ...(job.xpPerSec > 0 ? [<Stat key="xp">{`+${formatNumber(job.xpPerSec)} XP/s`}</Stat>] : []),
                      ...(job.xpLump > 0 ? [<Stat key="lump">{`+${formatNumber(job.xpLump)} XP once`}</Stat>] : []),
                    ]}
                  />
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
                          unlock={[
                            ...(peakMoney < row.unlockMoney ? ["A bigger balance"] : []),
                            ...(row.unlockJobId > 0 && !jobs.includes(row.unlockJobId) ? [`the ${jobById(row.unlockJobId)?.name ?? `job ${row.unlockJobId}`} job`] : []),
                          ]}
                          unlocks={have === 0 ? teaseFor(`gear:${row.id}`) : undefined}
                          title={row.name}
                          actions={
                            <>
                              <button type="button" disabled={!afford} onClick={() => act(key, () => buyEquipment(row.id, buyAmount))}>
                                {!revealed && have === 0 ? "Locked" : buyLabel("Buy", "money", row.baseCost, have, money, buyAmount)}
                              </button>
                            </>
                          }
                        >
                          <Stats
                            items={[
                              ...(row.cps > 0 ? [<Stat key="sec">{`+$${formatNumber(row.cps)}/s`}</Stat>] : []),
                              ...(row.clickBonus > 0 ? [<Stat key="click" icon="click">{`+$${formatNumber(row.clickBonus)}`}</Stat>] : []),
                            ]}
                          />
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
                    title={tier.name}
                    actions={
                      <>
                        <button type="button" disabled={!afford} onClick={() => act(key, () => buy(tier.id, buyAmount))}>
                          {buyLabel("Buy", "money", tier.baseCost, have, money, buyAmount)}
                        </button>
                      </>
                    }
                  >
                    <Stats
                      items={[
                        <Stat key="sec">{`+$${formatNumber(tier.cps)}/s`}</Stat>,
                        ...(tier.clickBonus > 0 ? [<Stat key="click" icon="click">{`+$${formatNumber(tier.clickBonus)}`}</Stat>] : []),
                      ]}
                    />
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
    </aside>
  )
}
