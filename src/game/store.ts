import { create } from "zustand"
import { advanceBoostClock } from "./boosts.ts"
import type { BoostClock } from "./boosts.ts"
import {
  gigById,
  isGearRevealed,
  isRevealed,
  highestOwnedSkill,
  highestOwnedCapital,
  idlePerSec,
  highestJobId,
  jobById,
  ownedCount,
  production,
  quotePurchase,
  skillById,
  equipById,
  capitalById,
  xpPerSec,
} from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { advanceEventClock, eventById, resolveOffer } from "./events.ts"
import { canBuyGold, clampBuyAmount, goldById, offlineCapMs, toBuyAmount } from "./gold.ts"
import type { BuyAmount } from "./gold.ts"
import type { EarningRates, EventLine } from "./events.ts"
import {
  freshHackMeta,
  hackReady,
  isFreshHackMeta,
  normalizeHackMeta,
  pickPerk,
  refactorCards,
  setHandSort,
  settleRun,
  shipCards,
  startRun,
} from "./hackathon.ts"
import type { HackMeta, HackPrize, HackSort } from "./hackathon.ts"
import { hackUnlocked, roundPrize } from "./hackathonEconomy.ts"
import { noteToast } from "./offlineNote.ts"
import { advanceReviewClock, isReviewChoice, pickPrompt, promptsForJob, resolveReviewChoice } from "./reviews.ts"
import type { ReviewChoiceId } from "./reviews.ts"
import { PREVIEW_HOLD_MS } from "./ide.ts"
import type { IdeSelection } from "./ide.ts"
import { modFactors, modsOf, pruneTemp } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import type { Era } from "../data/capital.ts"
import { canBuyJob, capitalUnlocked, clickPaysMoney, equipmentOpen, eraOf, gigState, moneyMode, phaseOf, phaseRank } from "./phase.ts"
import type { Phase } from "./phase.ts"
import { loadCareerForBoot, stageCareer, writeCareer } from "./ledger.ts"
import { freshSave, OFFLINE_CAP_MS, SAVE_VERSION } from "./save.ts"
import type { SaveData } from "./save.ts"
import {
  creditMoney,
  emptyStats,
  emptyStatsClock,
  normalizeStats,
  recordClick,
  touchIdleRecord,
} from "./stats.ts"
import type { GameStats, StatsClock } from "./stats.ts"
import { addCatFound } from "./catRoster.ts"
import { setDeskPref } from "./desk.ts"
import type { ActiveBoost } from "../data/boosts.ts"
import { MONEY_POP } from "../data/phases.ts"
import { firstNewMilestone } from "./milestones.ts"

const SAVE_EVERY_MS = 4_000

export type ToastMessage = {
  id: number
  text: string
  /** Diary sentence when this toast is the offline sticky note. `text` is the credit line. */
  note?: string
  /** Clicking the toast opens this instead of only dismissing it. */
  action?: "hackathon"
}

/** A 1:1 on screen. Nothing is applied until a reply is chosen. */
export type ActiveReview = {
  id: number
  promptId: number
  jobId: number
  lines: EventLine[]
  choice: ReviewChoiceId | null
}

export type PopKind = keyof typeof MONEY_POP
export type PopSize = (typeof MONEY_POP)[PopKind]

/** A money pop for the stage: medium on a click, large on gig clear and phase unlock. */
export type MoneyPop = {
  id: number
  kind: PopKind
  size: PopSize
  /** Dollars behind the pop. Zero for a phase unlock. */
  amount: number
  label: string
}

/** What a caller asks for. The store never buys more than the gold skills allow (see `clampBuyAmount`). */
export type BuyMode = "one" | "max" | number

/** A random event on screen. Nothing is applied until the player accepts. */
export type ActiveEvent = {
  id: number
  eventId: number
  /** Filled when the choice is resolved, so lastEvent keeps the numbers that landed. */
  lines: EventLine[]
}

type GameState = {
  money: number
  /** Spendable XP. */
  xp: number
  /** Lifetime XP earned. Phase gates read this. */
  xpTotal: number
  peakMoney: number
  stats: GameStats
  skills: OwnedMap
  equipment: OwnedMap
  /** Phase D capital rows. */
  owned: OwnedMap
  jobs: number[]
  gigs: number[]
  /** Owned gold skill ids. */
  gold: number[]
  /** The amount the Buy control is set to. Always one of the unlocked amounts. */
  buyAmount: BuyAmount
  phase: Phase
  activeBoost: ActiveBoost | null
  nextBoostAt: number | null
  idleSince: number
  now: number
  /** Permanent event multiplier on every income stream. */
  foreverMult: number
  /** Timed event multipliers, one per target. */
  tempMults: TempMults
  event: ActiveEvent | null
  /** The most recent event, kept after dismissal. */
  lastEvent: ActiveEvent | null
  eventSeq: number
  nextEventAt: number | null
  /** A 1:1 on screen, or null. */
  review: ActiveReview | null
  /** The most recent 1:1, kept after it closes. */
  lastReview: ActiveReview | null
  reviewSeq: number
  nextReviewAt: number | null
  ideSel: IdeSelection
  /** Era the shop is browsing, shown in the IDE pane until it snaps back. Null means the owned era. */
  previewEra: Era | null
  previewUntil: number
  toast: ToastMessage | null
  toastSeq: number
  pop: MoneyPop | null
  popSeq: number
  seenMilestones: string[]
  buyStamp: number
  celebrationNonce: number
  /** Hackathon league, record, cooldown and the run in progress. */
  hack: HackMeta
  /** The hackathon overlay is on screen. Events and 1:1s wait while it is. */
  hackOpen: boolean
  click: () => { money: number; xp: number }
  /** Buy a Phase D capital row. */
  buy: (tierId: number, mode?: BuyMode) => void
  buySkill: (skillId: number, mode?: BuyMode) => void
  buyEquipment: (equipId: number, mode?: BuyMode) => void
  buyJob: (jobId: number) => boolean
  /** Buy a gold skill with spendable XP. False when it is unknown, owned, still locked, behind an earlier one of its family, or too dear. */
  buyGold: (goldId: number) => boolean
  /** Set the Buy control. The amount drops to the largest one the gold skills unlock. */
  setBuyAmount: (amount: BuyAmount) => void
  /** Clear a gig. `force` skips the XP and prior-gig requirements (harness only). */
  clearGig: (gigId: number, force?: boolean) => boolean
  /** Note a cat the desk cat turned into. True the first time this cat is seen. */
  discoverCat: (url: string) => boolean
  dismissToast: () => void
  /** Open an event now (harness only). False for an unknown id. Replaces an open one without applying it. */
  fireEvent: (eventId: number) => boolean
  /** Take the open deal. False when nothing is open or the cost cannot be paid. */
  acceptEvent: () => boolean
  /** Decline the open event. Balances stay put. */
  dismissEvent: () => void
  /** Open a 1:1 for the highest job. False with no job or for a prompt outside that job's band. */
  fireReview: (promptId?: number) => boolean
  /** Take a reply. False when nothing is open, the choice is unknown, or the plan cannot be paid. */
  answerReview: (choice: ReviewChoiceId) => boolean
  /** Leave the 1:1. Balances stay put. */
  dismissReview: () => void
  /** Show the hackathon overlay. False while hackathons are still locked. */
  openHackathon: () => boolean
  closeHackathon: () => void
  /**
   * Register for the next hackathon. False when locked, on cooldown, or a run is already on. `seed` fixes the deal.
   * `force` skips the unlock and the cooldown and closes a finished run (harness only); a run being played still wins.
   */
  startHackathon: (seed?: number, force?: boolean) => boolean
  /** Take swag `slot` from the draft and deal the round. */
  hackPick: (slot: number) => boolean
  /** Ship the cards at these hand positions. Pays the round prize when the target falls. */
  hackShip: (indices: readonly number[]) => boolean
  /** Toss the cards at these hand positions and draw as many. */
  hackRefactor: (indices: readonly number[]) => boolean
  hackSort: (sort: HackSort) => void
  /** Close a won or lost run. The cooldown already started when it ended. */
  finishHackathon: () => boolean
  selectIde: (packId: string, index: number) => void
  setPreviewEra: (era: Era | null) => void
  /** Keep a browsed era alive while the shop or the IDE is being used. */
  holdPreview: () => void
  tick: (now: number) => void
  wipe: () => void
}

function toSave(state: GameState, now: number): SaveData {
  const save: SaveData = {
    version: SAVE_VERSION,
    money: state.money,
    xp: state.xp,
    xpTotal: state.xpTotal,
    skills: state.skills,
    equipment: state.equipment,
    owned: state.owned,
    jobs: state.jobs,
    gigs: state.gigs,
    savedAt: now,
    peakMoney: Math.max(state.peakMoney, state.money),
    stats: state.stats,
  }
  if (state.gold.length > 0) save.gold = state.gold
  if (state.buyAmount !== 1) save.buyAmount = state.buyAmount
  if (state.foreverMult !== 1) save.foreverMult = state.foreverMult
  const temp = pruneTemp(state.tempMults, now)
  if (Object.keys(temp).length > 0) save.tempMults = temp
  if (state.seenMilestones.length > 0) save.seenMilestones = state.seenMilestones
  if (state.activeBoost && state.activeBoost.endsAt > now) {
    save.activeBoost = state.activeBoost
  }
  // The replay of the last ship is screen state; the run itself is saved card by card.
  if (!isFreshHackMeta(state.hack)) save.hackathon = { ...state.hack, run: state.hack.run ? { ...state.hack.run, shot: null } : null }
  return save
}

function eraAlreadyOwned(owned: OwnedMap, era: string): boolean {
  return Object.keys(owned).some((key) => capitalById(Number(key))?.era === era && ownedCount(owned, Number(key)) > 0)
}

/** A request is held to the amounts the gold skills unlock: without any, every purchase is one copy. */
function allowedMode(state: Pick<GameState, "gold">, mode: BuyMode): BuyAmount {
  return clampBuyAmount(state.gold, toBuyAmount(mode))
}

let lastSaveAt = 0
let statsClock: StatsClock = emptyStatsClock()
/** The "registration is open" nudge shows once a session until the first hackathon is played. */
let hackNudged = false

function applyClickStats(stats: GameStats, now: number): GameStats {
  const next = recordClick(stats, statsClock, now)
  statsClock = next.clock
  return next.stats
}

function boot() {
  const now = Date.now()
  const { save, toast } = loadCareerForBoot(now)
  lastSaveAt = save.savedAt
  const message = noteToast(toast, 1)
  return { save, toast: message, toastSeq: message ? 1 : 0, now }
}

const booted = boot()

function makePop(state: Pick<GameState, "popSeq">, kind: PopKind, amount: number, label: string) {
  const popSeq = state.popSeq + 1
  const pop: MoneyPop = { id: popSeq, kind, size: MONEY_POP[kind], amount, label }
  return { pop, popSeq }
}

export const PHASE_UNLOCK_COPY: Record<Phase, string> = {
  A: "",
  B: "Gig Board unlocked",
  C: "Job Board unlocked",
  D: "Capital unlocked",
}

function earningRates(state: GameState, now: number): EarningRates {
  const rates = production(state, state.activeBoost, now, modsOf(state))
  return {
    cps: rates.idle,
    click: rates.click,
    xpPerSec: rates.xpIdle,
    xpPerClick: rates.xpClick * rates.mult,
  }
}

function resolutionOf(state: GameState) {
  const event = state.event
  if (!event) return null
  const def = eventById(event.eventId)
  if (!def) return null
  const now = Math.max(Date.now(), state.now)
  return resolveOffer(state.money, state.xp, state.xpTotal, def.offer, earningRates(state, now))
}

/** Credit a round prize: money counts as earned, XP lifts lifetime XP too. */
function paidPrize(state: GameState, prize: HackPrize) {
  return {
    money: state.money + prize.money,
    xp: state.xp + prize.xp,
    xpTotal: state.xpTotal + prize.xp,
    stats: prize.money > 0 ? creditMoney(state.stats, prize.money, "other") : state.stats,
  }
}

function hackNudge(state: GameState): ToastMessage | null {
  if (hackNudged || state.toast || state.event || state.review || state.hackOpen) return null
  if (state.hack.runs > 0 || !hackUnlocked(state, state.hack)) return null
  hackNudged = true
  return { id: state.toastSeq + 1, text: "Hackathon registration is open", action: "hackathon" }
}

function reviewResolution(state: GameState, choice: ReviewChoiceId) {
  if (!state.review) return null
  const now = Math.max(Date.now(), state.now)
  return resolveReviewChoice(choice, state.money, state.xp, state.xpTotal, earningRates(state, now))
}

export const useGame = create<GameState>((set, get) => ({
  money: booted.save.money,
  xp: booted.save.xp,
  xpTotal: booted.save.xpTotal,
  peakMoney: booted.save.peakMoney,
  stats: normalizeStats(booted.save.stats),
  skills: booted.save.skills,
  equipment: booted.save.equipment,
  owned: booted.save.owned,
  jobs: booted.save.jobs,
  gigs: booted.save.gigs,
  gold: booted.save.gold ?? [],
  buyAmount: booted.save.buyAmount ?? 1,
  phase: phaseOf(booted.save),
  activeBoost: booted.save.activeBoost ?? null,
  nextBoostAt: null,
  idleSince: booted.now,
  now: booted.now,
  foreverMult: booted.save.foreverMult ?? 1,
  tempMults: booted.save.tempMults ?? {},
  event: null,
  lastEvent: null,
  eventSeq: 0,
  nextEventAt: null,
  review: null,
  lastReview: null,
  reviewSeq: 0,
  nextReviewAt: null,
  ideSel: { packId: "", index: 0 },
  previewEra: null,
  previewUntil: 0,
  toast: booted.toast,
  toastSeq: booted.toastSeq,
  pop: null,
  popSeq: 0,
  seenMilestones: booted.save.seenMilestones ?? [],
  buyStamp: 0,
  celebrationNonce: 0,
  // The save checked the numbers; the run is checked against the hackathon tables here, in the app chunk.
  hack: normalizeHackMeta(booted.save.hackathon),
  hackOpen: false,

  click: () => {
    const state = get()
    const now = Date.now()
    const stats = applyClickStats(state.stats, now)
    const rates = production(state, state.activeBoost, now, modsOf(state))
    const xpGain = rates.xpClick * rates.mult
    const clickMoney = clickPaysMoney(state) ? rates.click : 0
    set({
      money: state.money + clickMoney,
      // Kept here so the peak subscriber below does not notify everyone a second time.
      peakMoney: Math.max(state.peakMoney, state.money + clickMoney),
      xp: state.xp + xpGain,
      xpTotal: state.xpTotal + xpGain,
      stats: clickMoney > 0 ? creditMoney(stats, clickMoney, "click") : stats,
      now,
      ...(clickMoney > 0 ? makePop(state, "click", clickMoney, "") : {}),
    })
    return { money: clickMoney, xp: xpGain }
  },

  discoverCat: (url) => {
    const stats = get().stats
    const catsFound = addCatFound(stats.catsFound, url)
    if (catsFound === stats.catsFound) return false
    set({ stats: { ...stats, catsFound } })
    // A find is rare and the periodic save could miss it on a quick reload.
    persistNow()
    return true
  },

  buy: (tierId, mode = "one") => {
    const tier = capitalById(tierId)
    if (!tier) return
    const state = get()
    if (!capitalUnlocked(state)) return
    const have = ownedCount(state.owned, tier.id)
    if (have === 0 && !isRevealed(tier, state.owned, state.peakMoney)) return
    const quote = quotePurchase(state.money, tier.baseCost, have, allowedMode(state, mode))
    if (quote.count <= 0) return

    const owned: OwnedMap = { ...state.owned, [String(tier.id)]: have + quote.count }
    const prevBest = highestOwnedCapital(state.owned)
    const nextBest = highestOwnedCapital(owned)
    const newHighest = Boolean(nextBest && (!prevBest || nextBest.id > prevBest.id))
    const newEra = !eraAlreadyOwned(state.owned, tier.era)
    const celebrate = have === 0 && (newHighest || newEra)
    const now = Date.now()

    set({
      money: Math.max(0, state.money - quote.total),
      owned,
      previewEra: eraOf({ owned }) === eraOf(state) ? state.previewEra : null,
      now,
      buyStamp: state.buyStamp + 1,
      celebrationNonce: celebrate ? state.celebrationNonce + 1 : state.celebrationNonce,
    })
    persistNow()
  },

  buySkill: (skillId, mode = "one") => {
    const skill = skillById(skillId)
    if (!skill) return
    const state = get()
    const have = ownedCount(state.skills, skill.id)
    if (have === 0 && state.xpTotal < skill.unlockAtXp) return
    const quote = quotePurchase(state.xp, skill.baseXpCost, have, allowedMode(state, mode))
    if (quote.count <= 0) return

    const prevBest = highestOwnedSkill(state.skills)
    const celebrate = have === 0 && (!prevBest || skill.id > prevBest.id)
    const now = Date.now()
    set({
      xp: Math.max(0, state.xp - quote.total),
      skills: { ...state.skills, [String(skill.id)]: have + quote.count },
      now,
      buyStamp: state.buyStamp + 1,
      celebrationNonce: celebrate ? state.celebrationNonce + 1 : state.celebrationNonce,
    })
    persistNow()
  },

  buyEquipment: (equipId, mode = "one") => {
    const equip = equipById(equipId)
    if (!equip) return
    const state = get()
    if (!equipmentOpen(state)) return
    const have = ownedCount(state.equipment, equip.id)
    if (have === 0 && !isGearRevealed(equip, state.equipment, state.peakMoney, state.jobs)) return
    const quote = quotePurchase(state.money, equip.baseCost, have, allowedMode(state, mode))
    if (quote.count <= 0) return
    set({
      money: Math.max(0, state.money - quote.total),
      equipment: { ...state.equipment, [String(equip.id)]: have + quote.count },
      now: Date.now(),
      buyStamp: state.buyStamp + 1,
    })
    persistNow()
  },

  buyGold: (goldId) => {
    const row = goldById(goldId)
    const state = get()
    if (!row || !canBuyGold(state, row)) return false
    set({
      xp: Math.max(0, state.xp - row.cost),
      gold: [...state.gold, row.id].sort((a, b) => a - b),
      now: Date.now(),
      buyStamp: state.buyStamp + 1,
      celebrationNonce: state.celebrationNonce + 1,
    })
    persistNow()
    return true
  },

  setBuyAmount: (amount) => {
    set({ buyAmount: clampBuyAmount(get().gold, amount) })
    persistNow()
  },

  buyJob: (jobId) => {
    const job = jobById(jobId)
    const state = get()
    if (!job || !canBuyJob(state, job)) return false
    set({
      money: Math.max(0, state.money - job.baseCost),
      // A job that teaches pays its lump of XP once, on hire. Lifetime XP rises with it.
      xp: state.xp + job.xpLump,
      xpTotal: state.xpTotal + job.xpLump,
      jobs: [...state.jobs, job.id].sort((a, b) => a - b),
      now: Date.now(),
      buyStamp: state.buyStamp + 1,
      celebrationNonce: state.celebrationNonce + 1,
    })
    persistNow()
    return true
  },

  clearGig: (gigId, force = false) => {
    const gig = gigById(gigId)
    const state = get()
    if (!gig || state.gigs.includes(gig.id)) return false
    if (!force && gigState(state, gig) !== "ready") return false
    set({
      money: state.money + gig.lump,
      gigs: [...state.gigs, gig.id].sort((a, b) => a - b),
      stats: creditMoney(state.stats, gig.lump, "other"),
      now: Date.now(),
      buyStamp: state.buyStamp + 1,
      celebrationNonce: state.celebrationNonce + 1,
      ...makePop(state, "gigClear", gig.lump, gig.name),
    })
    persistNow()
    return true
  },

  dismissToast: () => set({ toast: null }),

  fireEvent: (eventId) => {
    const def = eventById(eventId)
    const state = get()
    if (!def) return false
    const eventSeq = state.eventSeq + 1
    const event: ActiveEvent = { id: eventSeq, eventId: def.id, lines: [] }
    set({ event, lastEvent: event, eventSeq, nextEventAt: null, review: null })
    persistNow()
    return true
  },

  acceptEvent: () => {
    const state = get()
    const resolved = resolutionOf(state)
    if (!state.event || !resolved?.applied) return false
    const moneyGain = Math.max(0, resolved.money - state.money)
    set({
      money: resolved.money,
      xp: resolved.xp,
      xpTotal: resolved.xpTotal,
      stats: moneyGain > 0 ? creditMoney(state.stats, moneyGain, "other") : state.stats,
      event: null,
      lastEvent: { ...state.event, lines: resolved.lines },
      nextEventAt: null,
    })
    persistNow()
    return true
  },

  dismissEvent: () => {
    const state = get()
    const resolved = state.event ? resolutionOf(state) : null
    set({
      event: null,
      nextEventAt: null,
      lastEvent: state.event ? { ...state.event, lines: resolved?.lines ?? state.event.lines } : state.lastEvent,
    })
  },

  fireReview: (promptId) => {
    const state = get()
    const jobId = highestJobId(state.jobs)
    if (jobId == null) return false
    const pool = promptsForJob(jobId)
    const prompt = promptId == null ? pickPrompt(pool, Math.random()) : pool.find((row) => row.id === promptId) ?? null
    if (!prompt) return false
    const reviewSeq = state.reviewSeq + 1
    const review: ActiveReview = { id: reviewSeq, promptId: prompt.id, jobId, lines: [], choice: null }
    set({ review, lastReview: review, reviewSeq, nextReviewAt: null, event: null })
    persistNow()
    return true
  },

  answerReview: (choice) => {
    const state = get()
    if (!state.review || !isReviewChoice(choice)) return false
    const resolved = reviewResolution(state, choice)
    if (!resolved?.applied) return false
    const moneyGain = Math.max(0, resolved.money - state.money)
    set({
      money: resolved.money,
      xp: resolved.xp,
      xpTotal: resolved.xpTotal,
      stats: moneyGain > 0 ? creditMoney(state.stats, moneyGain, "other") : state.stats,
      review: null,
      lastReview: { ...state.review, lines: resolved.lines, choice },
      nextReviewAt: null,
    })
    persistNow()
    return true
  },

  dismissReview: () => {
    const state = get()
    if (!state.review) return
    set({
      review: null,
      nextReviewAt: null,
      lastReview: state.review,
    })
  },

  openHackathon: () => {
    const state = get()
    if (!hackUnlocked(state, state.hack)) return false
    set({ hackOpen: true })
    return true
  },

  closeHackathon: () => set({ hackOpen: false }),

  startHackathon: (seed, force = false) => {
    const state = get()
    const now = Date.now()
    const stage = state.hack.run?.stage
    if (force ? stage === "draft" || stage === "play" : !hackUnlocked(state, state.hack) || !hackReady(state.hack, now)) return false
    const run = startRun({ league: state.hack.league, skills: state.skills, seed: seed ?? Math.floor(Math.random() * 0x100000000) })
    if (!run) return false
    set({ hack: { ...state.hack, runs: state.hack.runs + 1, run }, now })
    persistNow()
    return true
  },

  hackPick: (slot) => {
    const state = get()
    const run = state.hack.run ? pickPerk(state.hack.run, slot) : null
    if (!run) return false
    set({ hack: { ...state.hack, run } })
    persistNow()
    return true
  },

  hackShip: (indices) => {
    const state = get()
    const shipped = state.hack.run ? shipCards(state.hack.run, indices) : null
    if (!shipped) return false
    const now = Math.max(Date.now(), state.now)
    let { run } = shipped
    const outcome = shipped.shot.outcome
    let balance = {}
    if (outcome === "cleared" || outcome === "won") {
      const round = state.hack.run?.round ?? 0
      const prize = roundPrize(round, run.league, earningRates(state, now), { money: state.money, xp: state.xp }, moneyMode(state))
      balance = paidPrize(state, prize)
      run = {
        ...run,
        earned: { money: run.earned.money + prize.money, xp: run.earned.xp + prize.xp },
        cleared: { round, ...prize },
      }
    }
    const over = outcome === "won" || outcome === "lost"
    set({ ...balance, hack: over ? settleRun(state.hack, run, now) : { ...state.hack, run } })
    persistNow()
    return true
  },

  hackRefactor: (indices) => {
    const state = get()
    const run = state.hack.run ? refactorCards(state.hack.run, indices) : null
    if (!run) return false
    set({ hack: { ...state.hack, run } })
    persistNow()
    return true
  },

  hackSort: (sort) => {
    const state = get()
    if (!state.hack.run) return
    set({ hack: { ...state.hack, run: setHandSort(state.hack.run, sort) } })
  },

  finishHackathon: () => {
    const state = get()
    const stage = state.hack.run?.stage
    if (stage !== "won" && stage !== "lost") return false
    set({ hack: { ...state.hack, run: null }, hackOpen: false })
    persistNow()
    return true
  },

  selectIde: (packId, index) => {
    const held = get().previewEra
    set({
      ideSel: { packId, index },
      ...(held ? { previewUntil: Math.max(Date.now(), get().now) + PREVIEW_HOLD_MS } : {}),
    })
  },

  setPreviewEra: (era) =>
    set({ previewEra: era, previewUntil: era ? Math.max(Date.now(), get().now) + PREVIEW_HOLD_MS : 0 }),

  holdPreview: () => {
    const state = get()
    if (!state.previewEra) return
    const until = Math.max(Date.now(), state.now) + PREVIEW_HOLD_MS
    if (until - state.previewUntil > 1_000) set({ previewUntil: until })
  },

  tick: (now) => {
    const state = get()
    const dt = Math.max(0, Math.min(now - state.now, offlineCapMs(state.gold, OFFLINE_CAP_MS)))
    const era = eraOf(state)
    const clock: BoostClock = {
      activeBoost: state.activeBoost,
      nextBoostAt: state.nextBoostAt,
      idleSince: state.idleSince,
    }
    const advanced = advanceBoostClock(clock, era, now, Math.random)
    const fx = modFactors(modsOf(state), state.now, state.now + dt)
    const gain = idlePerSec(state) * fx.cps * (dt / 1000)
    const xpGain = xpPerSec(state) * fx.xpIdle * (dt / 1000)
    const tempMults = pruneTemp(state.tempMults, now)
    let stats = touchIdleRecord(state.stats, statsClock, now)
    stats = { ...stats, playTimeMs: stats.playTimeMs + dt }
    if (gain > 0) stats = creditMoney(stats, gain, "idle")
    const balance = { money: state.money + gain, xp: state.xp + xpGain, xpTotal: state.xpTotal + xpGain }
    // Events wait out each other and 1:1s: one slot, never stacked.
    const eventAdvance = advanceEventClock(
      state.nextEventAt,
      {
        era,
        paying: moneyMode(state),
        blocked: state.event !== null || state.review !== null || state.hackOpen,
        owned: { jobs: state.jobs, gigs: state.gigs, equipment: state.equipment },
      },
      now,
      Math.random,
    )
    const fired = eventAdvance.fire
    const eventSeq = fired ? state.eventSeq + 1 : state.eventSeq
    const opened: ActiveEvent | null = fired ? { id: eventSeq, eventId: fired.id, lines: [] } : null
    const event: ActiveEvent | null = opened ?? state.event
    const reviewJob = highestJobId(state.jobs)
    const reviewAdvance = advanceReviewClock(
      state.nextReviewAt,
      {
        jobId: reviewJob,
        blocked: state.event !== null || state.review !== null || state.hackOpen || fired !== null,
      },
      now,
      Math.random,
    )
    const reviewFired = reviewAdvance.fire
    const reviewSeq = reviewFired ? state.reviewSeq + 1 : state.reviewSeq
    const openedReview: ActiveReview | null =
      reviewFired && reviewJob != null
        ? { id: reviewSeq, promptId: reviewFired.id, jobId: reviewJob, lines: [], choice: null }
        : null
    const review: ActiveReview | null = openedReview ?? (fired ? null : state.review)
    const nudge = fired || openedReview ? null : hackNudge(state)
    set({
      money: balance.money,
      peakMoney: Math.max(state.peakMoney, balance.money),
      xp: balance.xp,
      xpTotal: balance.xpTotal,
      stats,
      foreverMult: state.foreverMult,
      tempMults,
      event,
      lastEvent: fired ? event : state.lastEvent,
      eventSeq,
      nextEventAt: eventAdvance.nextEventAt,
      review,
      lastReview: openedReview ?? state.lastReview,
      reviewSeq,
      nextReviewAt: reviewAdvance.nextReviewAt,
      previewEra: state.previewEra && now >= state.previewUntil ? null : state.previewEra,
      now,
      activeBoost: advanced.clock.activeBoost,
      nextBoostAt: advanced.clock.nextBoostAt,
      idleSince: advanced.clock.idleSince,
      ...(nudge ? { toast: nudge, toastSeq: nudge.id } : {}),
    })

    if (now - lastSaveAt >= SAVE_EVERY_MS) {
      writeCareer(toSave(get(), now))
      lastSaveAt = now
    }
  },

  wipe: () => {
    const now = Date.now()
    const save = freshSave(now)
    writeCareer(save)
    lastSaveAt = now
    statsClock = emptyStatsClock()
    hackNudged = false
    // The roster is found cat by cat, so the cat on the desk goes back to the default with the run. The
    // rest of the room (music, sounds, theme) is the player's and stays.
    setDeskPref("catArt", null)
    set({
      money: 0,
      xp: 0,
      xpTotal: 0,
      peakMoney: 0,
      stats: emptyStats(),
      skills: {},
      equipment: {},
      owned: {},
      jobs: [],
      gigs: [],
      gold: [],
      buyAmount: 1,
      phase: "A",
      activeBoost: null,
      nextBoostAt: null,
      idleSince: now,
      now,
      foreverMult: 1,
      tempMults: {},
      event: null,
      lastEvent: null,
      eventSeq: 0,
      nextEventAt: null,
      review: null,
      lastReview: null,
      reviewSeq: 0,
      nextReviewAt: null,
      ideSel: { packId: "", index: 0 },
      previewEra: null,
      previewUntil: 0,
      toast: null,
      pop: null,
      popSeq: 0,
      seenMilestones: [],
      buyStamp: 0,
      celebrationNonce: 0,
      hack: freshHackMeta(),
      hackOpen: false,
    })
  },
}))

useGame.subscribe((state, prev) => {
  if (state.money === prev.money && state.xpTotal === prev.xpTotal) return
  const hit = firstNewMilestone(
    { money: prev.money, xpTotal: prev.xpTotal },
    { money: state.money, xpTotal: state.xpTotal },
    new Set(state.seenMilestones),
  )
  if (!hit || state.seenMilestones.includes(hit.id)) return
  useGame.setState({
    seenMilestones: [...state.seenMilestones, hit.id],
    ...makePop(state, "unlock", 0, hit.label),
  })
})

// Any code path that changes money or XP (clicks, idle ticks, harness) goes through here: it keeps
// the peak current and notices when a gate opens, so the unlock pop fires once per phase.
useGame.subscribe((state) => {
  if (state.money > state.peakMoney) {
    useGame.setState({ peakMoney: state.money })
    return
  }
  const phase = phaseOf(state)
  if (phase === state.phase) return
  if (phaseRank(phase) < phaseRank(state.phase)) {
    useGame.setState({ phase })
    return
  }
  const toastSeq = state.toastSeq + 1
  useGame.setState({
    phase,
    toast: { id: toastSeq, text: PHASE_UNLOCK_COPY[phase] },
    toastSeq,
    ...makePop(state, "unlock", 0, PHASE_UNLOCK_COPY[phase]),
  })
})

export function persistNow(): void {
  const now = Date.now()
  writeCareer(toSave(useGame.getState(), now))
  lastSaveAt = now
}

/** Write the live balance with an explicit savedAt. Used to simulate time away. */
export function writeStateAt(savedAt: number): void {
  stageCareer(toSave(useGame.getState(), savedAt))
  lastSaveAt = savedAt
}
