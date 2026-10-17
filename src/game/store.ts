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
import { noteToast } from "./offlineNote.ts"
import { advanceReviewClock, isReviewChoice, pickPrompt, promptsForJob, resolveReviewChoice } from "./reviews.ts"
import type { ReviewChoiceId } from "./reviews.ts"
import { PREVIEW_HOLD_MS } from "./ide.ts"
import { modFactors, modsOf, pruneTemp } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import type { Era } from "../data/capital.ts"
import { canBuyJob, capitalUnlocked, clickPaysMoney, equipmentOpen, eraOf, gigState, moneyMode, phaseOf, phaseRank } from "./phase.ts"
import type { Phase } from "./phase.ts"
import { loadCareerForBoot, stageCareer, writeCareer } from "./ledger.ts"
import { freshSave, OFFLINE_CAP_MS, RETURN_BREAK_MS, SAVE_VERSION } from "./save.ts"
import { advanceCompany, FRESH_COMPANY, growthFacts, settleGrowth } from "./globe/growth.ts"
import * as companyActions from "./globe/actions.ts"
import type { CompanyPatch } from "./globe/actions.ts"
import { WIN_MULT } from "./globe/world.ts"
import type { CompanyState } from "./globe/growth.ts"
import { FRESH_FOOTPRINT } from "./globe/footprint.ts"
import { servingOf } from "./globe/load.ts"
import type { Footprint } from "./globe/footprint.ts"
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
import { appendNotes, toSavedEntries } from "./careerLog.ts"
import type { CareerEntry, CareerJournal, CareerNote } from "./careerLog.ts"
import { bootCareer, newlyOpen, planUnlocks, progressOf, purchaseNotes, seenFresh } from "./careerSync.ts"
import type { CareerSlice } from "./careerSync.ts"
import type { FeatureId } from "../data/features.ts"
import { featureById } from "./features.ts"
import { freshCareer } from "./save.ts"
import type { SavedCareerEntry } from "./save.ts"
import { setMusicAllowed } from "./desk.ts"
import { getAdminMode, subscribeAdminMode } from "./adminMode.ts"
import { randomHandle, randomIdentity, randomProduct } from "./identity.ts"
import type { SavedIdentity } from "./identity.ts"

const SAVE_EVERY_MS = 4_000

export type ToastMessage = {
  id: number
  text: string
  /** Diary sentence when this toast is the offline sticky note. `text` is the credit line. */
  note?: string
  /** On the sticky note: what unlocked while the player was away. */
  unlocked?: string[]
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
  /** Era the shop is browsing, named in the desk status bar until it snaps back. Null means the owned era. */
  previewEra: Era | null
  previewUntil: number
  toast: ToastMessage | null
  toastSeq: number
  pop: MoneyPop | null
  popSeq: number
  seenMilestones: string[]
  buyStamp: number
  celebrationNonce: number
  /** The career timeline: journal, unlocks, NEW markers, returns, and reveals waiting to play. */
  journal: CareerJournal
  /** The handle on the GitHug and LinkedOut profiles, and whether the player has kept it. */
  profile: SavedIdentity
  /** Users by region, the world's resistance, its incidents and the uptime bars for the company on the globe. */
  company: CompanyState
  /** The regions bought and the cities with a point of presence. */
  footprint: Footprint
  unlocked: FeatureId[]
  fresh: FeatureId[]
  returns: number
  reveals: FeatureId[]
  whatsNew: boolean
  click: () => { money: number; xp: number }
  /** Buy a Phase D capital row. */
  buy: (tierId: number, mode?: BuyMode) => void
  buySkill: (skillId: number, mode?: BuyMode) => void
  buyEquipment: (equipId: number, mode?: BuyMode) => void
  buyJob: (jobId: number) => boolean
  /** Buy a gold skill with spendable XP. False when it is unknown, owned, still locked, behind an earlier one of its family, or too dear. */
  buyGold: (goldId: number) => boolean
  /** Buy a region with money. False when it is unknown, owned, or unaffordable. */
  buyRegion: (regionId: string) => boolean
  /** Deploy a point of presence in a city of a region you own, for its cost in money. */
  deployPop: (cityId: string) => boolean
  /** Switch a deployed point of presence on or off. Its traffic goes to the nearest one still on; the last one on stays on. */
  setPopActive: (cityId: string, on: boolean) => boolean
  /** Pays to end an incident now, in minutes of what the company earns. False when the incident is gone or the money is short. */
  respondIncident: (id: number) => boolean
  /** Switch a bought region on or off as a whole. The last region serving stays on. */
  setRegionActive: (regionId: string, on: boolean) => boolean
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
  setPreviewEra: (era: Era | null) => void
  /** Keep a browsed era alive while the shop or the desk is being used. */
  holdPreview: () => void
  tick: (now: number) => void
  wipe: () => void
  /** Clears a NEW marker: the player opened or used the thing. Opening a picker clears the items inside it. */
  seeFeature: (id: FeatureId) => void
  /** Takes the next reveal off the queue to play it. Null when none is waiting. */
  takeReveal: () => FeatureId | null
  /** Drops every waiting reveal (the NEW markers stay). */
  clearReveals: () => void
  dismissWhatsNew: () => void
  /** Draw another handle from the word lists, and a product from its animal. Only before the player keeps it; false after. */
  rerollProfile: () => boolean
  /** Draw another suffix for the product. Only before the player keeps it; false after. */
  rerollProduct: () => boolean
  /** Keep the current handle for the rest of the career. */
  keepProfile: () => void
  /** The tab came back after a long hide: log the return (the cat's cue on a first one). */
  noteReturn: (awayMs: number) => void
  /** The big unlock slam: the centred UNLOCKED pop with confetti. */
  announceUnlock: (label: string) => void
  /** A one-line toast. Never covers the sticky note. */
  notify: (text: string) => void
}

let savedEntriesFor: CareerEntry[] | null = null
let savedEntries: SavedCareerEntry[] = []

/** The journal as saved tuples. Rebuilt only when the journal changed since the last save. */
function savedLog(entries: CareerEntry[]): SavedCareerEntry[] {
  if (entries !== savedEntriesFor) {
    savedEntriesFor = entries
    savedEntries = toSavedEntries(entries)
  }
  return savedEntries
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
  save.profile = state.profile
  save.company = state.company
  save.footprint = state.footprint
  save.career = {
    seq: state.journal.seq,
    log: savedLog(state.journal.entries),
    unlocked: state.unlocked,
    fresh: state.fresh,
    returns: state.returns,
  }
  if (state.activeBoost && state.activeBoost.endsAt > now) {
    save.activeBoost = state.activeBoost
  }
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

function applyClickStats(stats: GameStats, now: number): GameStats {
  const next = recordClick(stats, statsClock, now)
  statsClock = next.clock
  return next.stats
}

function boot() {
  const now = Date.now()
  const { save, toast } = loadCareerForBoot(now)
  lastSaveAt = save.savedAt
  const career = bootCareer(save, now)
  let message: ToastMessage | null = noteToast(toast, 1)
  if (career.awayUnlocks.length > 0) {
    message = message?.note
      ? { ...message, unlocked: career.awayUnlocks }
      : { id: 1, text: "", note: "Things changed while you were out.", unlocked: career.awayUnlocks }
  }
  return { save, toast: message, toastSeq: message ? 1 : 0, now, career }
}

const booted = boot()

/** Applies a company action's patch and saves. Spending stamps the clock, as every purchase does. False when it was refused. */
function commitCompany(patch: CompanyPatch, spends: boolean): boolean {
  if (!patch) return false
  useGame.setState(spends ? { ...patch, now: Date.now() } : patch)
  persistNow()
  return true
}

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

function reviewResolution(state: GameState, choice: ReviewChoiceId) {
  if (!state.review) return null
  const now = Math.max(Date.now(), state.now)
  return resolveReviewChoice(choice, state.money, state.xp, state.xpTotal, earningRates(state, now))
}

/** Appends journal notes stamped with the balances they leave behind. */
function noted(journal: CareerJournal, notes: readonly CareerNote[], at: { money: number; xpTotal: number }): CareerJournal {
  return appendNotes(journal, notes, at, Date.now())
}

function freshCareerSlice(now: number): CareerSlice {
  const career = bootCareer({ ...freshSave(now), career: freshCareer(now) }, now)
  return {
    journal: career.journal,
    unlocked: career.unlocked,
    fresh: career.fresh,
    returns: career.returns,
    reveals: [],
    whatsNew: false,
  }
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
  previewEra: null,
  previewUntil: 0,
  toast: booted.toast,
  toastSeq: booted.toastSeq,
  pop: null,
  popSeq: 0,
  seenMilestones: booted.save.seenMilestones ?? [],
  buyStamp: 0,
  celebrationNonce: 0,
  journal: booted.career.journal,
  // A save from before names were drawn is a career already under way: it gets one, kept, with no start card.
  profile: booted.save.profile ?? { ...randomIdentity(), chosen: true },
  company: booted.save.company ?? FRESH_COMPANY,
  footprint: booted.save.footprint ?? FRESH_FOOTPRINT,
  unlocked: booted.career.unlocked,
  fresh: booted.career.fresh,
  returns: booted.career.returns,
  reveals: booted.career.reveals,
  whatsNew: booted.career.whatsNew,

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
    const quote = quotePurchase(state.xp, skill.baseXpCost, have, allowedMode(state, mode), skill.firstXpCost)
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

  buyRegion: (regionId) => commitCompany(companyActions.buyRegion(get(), regionId), true),
  deployPop: (cityId) => commitCompany(companyActions.deployPop(get(), cityId), true),
  setPopActive: (cityId, on) => commitCompany(companyActions.setPopActive(get(), cityId, on), false),
  respondIncident: (id) => commitCompany(companyActions.respondIncident(get(), id, earnedPerSec(get())), true),
  setRegionActive: (regionId, on) => commitCompany(companyActions.setRegionActive(get(), regionId, on), false),

  buyJob: (jobId) => {
    const job = jobById(jobId)
    const state = get()
    if (!job || !canBuyJob(state, job)) return false
    set({
      // A job costs spendable XP, then a job that teaches pays its lump of XP once, on hire. Lifetime XP rises with the lump.
      xp: Math.max(0, state.xp - job.xpCost) + job.xpLump,
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
      journal: noted(state.journal, [{ type: "event", ref: `event:${state.event.eventId}`, data: { accepted: true } }], resolved),
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
      journal: state.event
        ? noted(state.journal, [{ type: "event", ref: `event:${state.event.eventId}`, data: { accepted: false } }], state)
        : state.journal,
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
      journal: noted(state.journal, [{ type: "review", ref: `review:${state.review.promptId}`, data: { choice } }], resolved),
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
      journal: noted(state.journal, [{ type: "review", ref: `review:${state.review.promptId}` }], state),
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
    const grown = advanceCompany(state.company, growthFacts(state.gigs, state.equipment, state.footprint), now - dt, now, Math.random)
    const xpGain = xpPerSec(state) * fx.xpIdle * (dt / 1000)
    const tempMults = pruneTemp(state.tempMults, now)
    let stats = touchIdleRecord(state.stats, statsClock, now)
    stats = { ...stats, playTimeMs: stats.playTimeMs + dt }
    stats = creditMoney(stats, gain + grown.earned, "idle")
    const settled = settleGrowth(state.money + gain, state.foreverMult, state.company.won, grown)
    const foreverMult = settled.foreverMult
    const balance = { money: settled.money, xp: state.xp + xpGain, xpTotal: state.xpTotal + xpGain }
    // Events wait out each other and 1:1s: one slot, never stacked.
    const eventAdvance = advanceEventClock(
      state.nextEventAt,
      {
        era,
        paying: moneyMode(state),
        blocked: state.event !== null || state.review !== null,
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
        blocked: state.event !== null || state.review !== null || fired !== null,
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
    set({
      money: balance.money,
      peakMoney: Math.max(state.peakMoney, balance.money),
      xp: balance.xp,
      xpTotal: balance.xpTotal,
      stats,
      foreverMult,
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
      company: grown.state,
      journal: grown.notes.length > 0 ? noted(state.journal, grown.notes, balance) : state.journal,
      activeBoost: advanced.clock.activeBoost,
      nextBoostAt: advanced.clock.nextBoostAt,
      idleSince: advanced.clock.idleSince,
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
    // The roster is found cat by cat, so the cat on the desk goes back to the default with the run. The
    // rest of the room (music, sounds, theme) is the player's and stays.
    setDeskPref("catArt", null)
    set({
      money: 0,
      xp: 0,
      xpTotal: 0,
      peakMoney: 0,
      company: FRESH_COMPANY,
      footprint: FRESH_FOOTPRINT,
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
      previewEra: null,
      previewUntil: 0,
      toast: null,
      pop: null,
      popSeq: 0,
      seenMilestones: [],
      buyStamp: 0,
      celebrationNonce: 0,
      ...freshCareerSlice(now),
      profile: { ...randomIdentity(), chosen: false },
    })
  },

  seeFeature: (id) => {
    const state = get()
    const fresh = seenFresh(state.fresh, id)
    if (fresh === state.fresh) return
    set({ fresh })
  },

  takeReveal: () => {
    const [head, ...rest] = get().reveals
    if (!head) return null
    set({ reveals: rest })
    return head
  },

  clearReveals: () => {
    if (get().reveals.length > 0) set({ reveals: [] })
  },

  rerollProfile: () => {
    const { profile } = get()
    if (profile.chosen) return false
    const handle = randomHandle(Math.random, profile.handle)
    set({ profile: { handle, product: randomProduct(handle), chosen: false } })
    persistNow()
    return true
  },

  rerollProduct: () => {
    const { profile } = get()
    if (profile.chosen) return false
    set({ profile: { ...profile, product: randomProduct(profile.handle, Math.random, profile.product) } })
    persistNow()
    return true
  },

  keepProfile: () => {
    const { profile } = get()
    if (profile.chosen) return
    set({ profile: { ...profile, chosen: true } })
    persistNow()
  },

  dismissWhatsNew: () => {
    if (get().whatsNew) set({ whatsNew: false })
  },

  announceUnlock: (label) => {
    const state = get()
    set({ ...makePop(state, "unlock", 0, label), celebrationNonce: state.celebrationNonce + 1 })
  },

  notify: (text) => {
    const state = get()
    if (state.toast?.note) return
    const toastSeq = state.toastSeq + 1
    set({ toast: { id: toastSeq, text }, toastSeq })
  },

  noteReturn: (awayMs) => {
    if (!(awayMs >= RETURN_BREAK_MS)) return
    const state = get()
    const away = Math.min(awayMs, offlineCapMs(state.gold, OFFLINE_CAP_MS)) / 1000
    const data = { awayMs: Math.round(awayMs), creditedMoney: Math.floor(idlePerSec(state) * away), creditedXp: Math.floor(xpPerSec(state) * away) }
    set({ returns: state.returns + 1, journal: noted(state.journal, [{ type: "return", ref: "", data }], state) })
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
  const current = useGame.getState()
  useGame.setState({
    seenMilestones: [...state.seenMilestones, hit.id],
    ...makePop(state, "unlock", 0, hit.label),
    journal: noted(current.journal, [{ type: "milestone", ref: `milestone:${hit.id}` }], current),
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

// The career timeline. Registered last, so a phase pop never sees this write mid-update. Each update's transition
// arrives once: it is diffed for first copies, clears, hires and new phases, and every row whose gate just opened is
// unlocked, logged and queued. Writes start from the live state, since an earlier listener may have moved it.
useGame.subscribe((state, prev) => {
  const notes = purchaseNotes(prev, state)
  const live = useGame.getState()
  const rows = newlyOpen(progressOf(live), live.unlocked)
  if (notes.length === 0 && rows.length === 0) return
  // While the "while you were out" note is up, what opens is part of the return: one reveal, the rest on the note.
  const returning = Boolean(live.toast?.note)
  const plan = rows.length > 0 ? planUnlocks(rows, live, returning) : null
  const patch: Partial<GameState> = { journal: noted(live.journal, [...notes, ...(plan?.notes ?? [])], live) }
  if (plan) {
    patch.unlocked = plan.unlocked
    patch.fresh = plan.fresh
    patch.reveals = plan.reveals
    const names = rows.filter((row) => row.size !== "phase").map((row) => featureById(row.id)?.name ?? row.id)
    if (returning && live.toast && names.length > 0) patch.toast = { ...live.toast, unlocked: [...(live.toast.unlocked ?? []), ...names] }
  }
  useGame.setState(patch)
})

// Music is a career unlock: the saved switch only plays once the headset is bought (or in admin mode, which shows everything).
function syncMusicGate() {
  setMusicAllowed(getAdminMode() || useGame.getState().unlocked.includes("music"))
}
syncMusicGate()
subscribeAdminMode(syncMusicGate)
useGame.subscribe((state, prev) => {
  if (state.unlocked !== prev.unlocked) syncMusicGate()
})

/** What the career earns a second right now: idle income with the event multipliers in, plus what the product's users pay. Incidents are priced in minutes of this. */
export function earnedPerSec(state: GameState, at = Date.now()): number {
  return idlePerSec(state) * modFactors(modsOf(state), at, at).cps + servingOf(state.company.users, state.company.incidents, state.equipment).revenuePerSec
}

const WIN_LABEL = "Seven billion users"
const WIN_TOAST = `${WIN_LABEL}. The world is yours, and everything you earn is ×${WIN_MULT} for good.`

// The win: a pop, the confetti and a toast, whatever moved the company there (a tick, a stretch away, the harness).
useGame.subscribe((state, prev) => {
  if (!state.company.won || prev.company.won) return
  const toastSeq = state.toastSeq + 1
  useGame.setState({
    ...makePop(state, "unlock", 0, WIN_LABEL),
    celebrationNonce: state.celebrationNonce + 1,
    ...(state.toast?.note ? {} : { toast: { id: toastSeq, text: WIN_TOAST }, toastSeq }),
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
