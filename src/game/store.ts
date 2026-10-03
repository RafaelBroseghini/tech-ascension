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
import type { EarningRates, EventLine } from "./events.ts"
import { noteToast } from "./offlineNote.ts"
import { advanceReviewClock, isReviewChoice, pickPrompt, promptsForJob, resolveReviewChoice } from "./reviews.ts"
import type { ReviewChoiceId } from "./reviews.ts"
import { advanceEnemyClock, applyDamage, endFight, enemyById, startFight } from "./fight.ts"
import type { Fight, FightOutcome } from "./fight.ts"
import { getDeskPrefs } from "./desk.ts"
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
import type { ActiveBoost } from "../data/boosts.ts"
import { MONEY_POP } from "../data/phases.ts"
import { firstNewMilestone } from "./milestones.ts"

const SAVE_EVERY_MS = 4_000

export type FightResult = FightOutcome & { id: number }

export type ToastMessage = {
  id: number
  text: string
  /** Diary sentence when this toast is the offline sticky note. `text` is the credit line. */
  note?: string
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

/** A money pop for the stage: medium on a click, large on gig clear, fight win and phase unlock. */
export type MoneyPop = {
  id: number
  kind: PopKind
  size: PopSize
  /** Dollars behind the pop. Zero for a phase unlock. */
  amount: number
  label: string
}

export type BuyMode = "one" | "max"

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
  phase: Phase
  activeBoost: ActiveBoost | null
  nextBoostAt: number | null
  idleSince: number
  now: number
  fight: Fight | null
  nextEnemyAt: number | null
  fightResult: FightResult | null
  fightSeq: number
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
  click: () => { money: number; xp: number }
  /** Buy a Phase D capital row. */
  buy: (tierId: number, mode?: BuyMode) => void
  buySkill: (skillId: number, mode?: BuyMode) => void
  buyEquipment: (equipId: number, mode?: BuyMode) => void
  buyJob: (jobId: number) => boolean
  /** Clear a gig. `force` skips the XP and prior-gig requirements (harness only). */
  clearGig: (gigId: number, force?: boolean) => boolean
  hit: () => { money: number; xp: number }
  flee: () => void
  forceEnemy: (enemyId: number) => boolean
  dismissToast: () => void
  dismissFightResult: () => void
  /** Open an event now (harness only). False for an unknown id or during a fight. Replaces an open one without applying it. */
  fireEvent: (eventId: number) => boolean
  /** Take the open deal. False when nothing is open or the cost cannot be paid. */
  acceptEvent: () => boolean
  /** Decline the open event. Balances stay put. */
  dismissEvent: () => void
  /** Open a 1:1 for the highest job. False with no job, during a fight, or for a prompt outside that job's band. */
  fireReview: (promptId?: number) => boolean
  /** Take a reply. False when nothing is open, the choice is unknown, or the plan cannot be paid. */
  answerReview: (choice: ReviewChoiceId) => boolean
  /** Leave the 1:1. Balances stay put. */
  dismissReview: () => void
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
  if (state.foreverMult !== 1) save.foreverMult = state.foreverMult
  const temp = pruneTemp(state.tempMults, now)
  if (Object.keys(temp).length > 0) save.tempMults = temp
  if (state.seenMilestones.length > 0) save.seenMilestones = state.seenMilestones
  if (state.activeBoost && state.activeBoost.endsAt > now) {
    save.activeBoost = state.activeBoost
  }
  return save
}

function eraAlreadyOwned(owned: OwnedMap, era: string): boolean {
  return Object.keys(owned).some((key) => capitalById(Number(key))?.era === era && ownedCount(owned, Number(key)) > 0)
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
  phase: phaseOf(booted.save),
  activeBoost: booted.save.activeBoost ?? null,
  nextBoostAt: null,
  idleSince: booted.now,
  now: booted.now,
  fight: null,
  nextEnemyAt: null,
  fightResult: null,
  fightSeq: 0,
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

  click: () => {
    const state = get()
    if (state.fight) return get().hit()
    const now = Date.now()
    const stats = applyClickStats(state.stats, now)
    const rates = production(state, state.activeBoost, now, modsOf(state))
    const xpGain = rates.xpClick * rates.mult
    const clickMoney = clickPaysMoney(state) ? rates.click : 0
    set({
      money: state.money + clickMoney,
      xp: state.xp + xpGain,
      xpTotal: state.xpTotal + xpGain,
      stats: clickMoney > 0 ? creditMoney(stats, clickMoney, "click") : stats,
      now,
      ...(clickMoney > 0 ? makePop(state, "click", clickMoney, "") : {}),
    })
    return { money: clickMoney, xp: xpGain }
  },

  hit: () => {
    const state = get()
    const fight = state.fight
    if (!fight) return { money: 0, xp: 0 }
    const now = Date.now()
    const stats = applyClickStats(state.stats, now)
    const damage = production(state, state.activeBoost, now, modsOf(state)).click
    const result = applyDamage(fight, damage)
    if (!result.outcome) {
      set({ fight: result.fight, stats, now })
      return { money: 0, xp: 0 }
    }
    const fightSeq = state.fightSeq + 1
    const reward = result.outcome.reward
    let nextStats = stats
    if (result.outcome.kind === "win") nextStats = { ...nextStats, fightWins: nextStats.fightWins + 1 }
    if (reward > 0) nextStats = creditMoney(nextStats, reward, "other")
    set({
      fight: null,
      nextEnemyAt: null,
      money: state.money + reward,
      stats: nextStats,
      now,
      fightResult: { ...result.outcome, id: fightSeq },
      fightSeq,
      ...makePop(state, "fightWin", reward, enemyById(result.outcome.enemyId)?.name ?? "Enemy defeated"),
    })
    persistNow()
    return { money: 0, xp: 0 }
  },

  flee: () => {
    const fight = get().fight
    if (!fight) return
    const fightSeq = get().fightSeq + 1
    set({ fight: null, nextEnemyAt: null, fightResult: { ...endFight(fight, "flee"), id: fightSeq }, fightSeq })
  },

  forceEnemy: (enemyId) => {
    const enemy = enemyById(enemyId)
    if (!enemy) return false
    set({ fight: startFight(enemy, get().now), nextEnemyAt: null, fightResult: null, event: null, review: null })
    return true
  },

  buy: (tierId, mode = "one") => {
    const tier = capitalById(tierId)
    if (!tier) return
    const state = get()
    if (!capitalUnlocked(state)) return
    const have = ownedCount(state.owned, tier.id)
    if (have === 0 && !isRevealed(tier, state.owned, state.peakMoney)) return
    const quote = quotePurchase(state.money, tier.baseCost, have, mode)
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
    const quote = quotePurchase(state.xp, skill.baseXpCost, have, mode)
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
    const quote = quotePurchase(state.money, equip.baseCost, have, mode)
    if (quote.count <= 0) return
    set({
      money: Math.max(0, state.money - quote.total),
      equipment: { ...state.equipment, [String(equip.id)]: have + quote.count },
      now: Date.now(),
      buyStamp: state.buyStamp + 1,
    })
    persistNow()
  },

  buyJob: (jobId) => {
    const job = jobById(jobId)
    const state = get()
    if (!job || !canBuyJob(state, job)) return false
    set({
      money: Math.max(0, state.money - job.baseCost),
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

  dismissFightResult: () => set({ fightResult: null }),

  fireEvent: (eventId) => {
    const def = eventById(eventId)
    const state = get()
    if (!def || state.fight) return false
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
    if (state.fight || jobId == null) return false
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
    const dt = Math.max(0, Math.min(now - state.now, OFFLINE_CAP_MS))
    const era = eraOf(state)
    // Rare enemies only show up once money exists. The desk switch skips the clock entirely;
    // a fight already on screen is cleared without a toast. forceEnemy still starts one.
    const enemy = getDeskPrefs().enemies
      ? state.fight || moneyMode(state)
        ? advanceEnemyClock({ fight: state.fight, nextEnemyAt: state.nextEnemyAt }, era, now, Math.random)
        : { clock: { fight: null, nextEnemyAt: null }, spawned: null, outcome: null }
      : { clock: { fight: null, nextEnemyAt: null }, spawned: null, outcome: null }
    // Boost rolls wait out a fight so a boost cannot land and expire unseen behind the overlay.
    const fighting = enemy.clock.fight !== null
    const clock: BoostClock = {
      activeBoost: state.activeBoost,
      nextBoostAt: state.nextBoostAt,
      idleSince: state.idleSince,
    }
    const advanced = fighting ? { clock, spawned: null } : advanceBoostClock(clock, era, now, Math.random)
    const fx = modFactors(modsOf(state), state.now, state.now + dt)
    const gain = idlePerSec(state) * fx.cps * (dt / 1000)
    const xpGain = xpPerSec(state.skills) * fx.xpIdle * (dt / 1000)
    const tempMults = pruneTemp(state.tempMults, now)
    let stats = touchIdleRecord(state.stats, statsClock, now)
    stats = { ...stats, playTimeMs: stats.playTimeMs + dt }
    if (gain > 0) stats = creditMoney(stats, gain, "idle")
    const balance = { money: state.money + gain, xp: state.xp + xpGain, xpTotal: state.xpTotal + xpGain }
    // Events wait out fights and each other: one slot, never stacked.
    const eventAdvance = advanceEventClock(
      state.nextEventAt,
      {
        era,
        paying: moneyMode(state),
        blocked: fighting || state.fight !== null || state.event !== null || state.review !== null,
        owned: { jobs: state.jobs, gigs: state.gigs, equipment: state.equipment },
      },
      now,
      Math.random,
    )
    const fired = eventAdvance.fire
    const eventSeq = fired ? state.eventSeq + 1 : state.eventSeq
    // A spawning enemy closes an open event without applying it, so the fight clock never runs behind the modal.
    const opened: ActiveEvent | null = fired ? { id: eventSeq, eventId: fired.id, lines: [] } : null
    const event: ActiveEvent | null = enemy.spawned ? null : opened ?? state.event
    const reviewJob = highestJobId(state.jobs)
    const reviewAdvance = advanceReviewClock(
      state.nextReviewAt,
      {
        jobId: reviewJob,
        blocked: fighting || state.fight !== null || state.event !== null || state.review !== null || fired !== null || enemy.spawned !== null,
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
    const review: ActiveReview | null = enemy.spawned ? null : openedReview ?? (fired ? null : state.review)
    let toastSeq = state.toastSeq
    let toast = state.toast
    let fightResult = state.fightResult
    let fightSeq = state.fightSeq
    if (enemy.outcome) {
      fightSeq += 1
      fightResult = { ...enemy.outcome, id: fightSeq }
      toastSeq += 1
      toast = { id: toastSeq, text: `${enemyById(enemy.outcome.enemyId)?.name ?? "Enemy"} got away` }
    }

    set({
      money: balance.money,
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
      fight: enemy.clock.fight,
      nextEnemyAt: enemy.clock.nextEnemyAt,
      fightResult,
      fightSeq,
      toast,
      toastSeq,
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
      phase: "A",
      activeBoost: null,
      nextBoostAt: null,
      idleSince: now,
      now,
      fight: null,
      nextEnemyAt: null,
      fightResult: null,
      fightSeq: 0,
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
    })
  },
}))

useGame.subscribe((state, prev) => {
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
