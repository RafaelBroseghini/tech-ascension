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
import { advanceEventClock, applyEvent, eventById } from "./events.ts"
import type { EventLine } from "./events.ts"
import { advanceEnemyClock, applyDamage, endFight, enemyById, startFight } from "./fight.ts"
import type { Fight, FightOutcome } from "./fight.ts"
import { formatMultiplier } from "./format.ts"
import { PREVIEW_HOLD_MS } from "./ide.ts"
import type { IdeSelection } from "./ide.ts"
import { modFactors, modsOf, pruneTemp } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import type { Era } from "../data/capital.ts"
import { canBuyJob, capitalUnlocked, equipmentOpen, eraOf, gigState, moneyMode, phaseOf, phaseRank } from "./phase.ts"
import type { Phase } from "./phase.ts"
import { freshSave, hydrate, OFFLINE_CAP_MS, SAVE_VERSION } from "./save.ts"
import type { SaveData } from "./save.ts"
import { clearSave, readSaveText, writeSave } from "./storage.ts"
import type { ActiveBoost } from "../data/boosts.ts"
import { MONEY_POP } from "../data/phases.ts"

const SAVE_EVERY_MS = 4_000

export type FightResult = FightOutcome & { id: number }

export type ToastMessage = {
  id: number
  text: string
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

/** A random event on screen. Its effects are already applied; dismissing only closes the modal. */
export type ActiveEvent = {
  id: number
  eventId: number
  lines: EventLine[]
}

type GameState = {
  money: number
  /** Spendable XP. */
  xp: number
  /** Lifetime XP earned. Phase gates read this. */
  xpTotal: number
  peakMoney: number
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
  ideSel: IdeSelection
  /** Era the shop is browsing, shown in the IDE pane until it snaps back. Null means the owned era. */
  previewEra: Era | null
  previewUntil: number
  toast: ToastMessage | null
  toastSeq: number
  pop: MoneyPop | null
  popSeq: number
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
  /** Fire an event now (harness only). False for an unknown id or during a fight. Replaces an open one. */
  fireEvent: (eventId: number) => boolean
  dismissEvent: () => void
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
  }
  if (state.foreverMult !== 1) save.foreverMult = state.foreverMult
  const temp = pruneTemp(state.tempMults, now)
  if (Object.keys(temp).length > 0) save.tempMults = temp
  if (state.activeBoost && state.activeBoost.endsAt > now) {
    save.activeBoost = state.activeBoost
  }
  return save
}

function eraAlreadyOwned(owned: OwnedMap, era: string): boolean {
  return Object.keys(owned).some((key) => capitalById(Number(key))?.era === era && ownedCount(owned, Number(key)) > 0)
}

let lastSaveAt = 0

function boot() {
  const now = Date.now()
  const hydrated = hydrate(readSaveText(), now)
  let toast: ToastMessage | null = hydrated.toast ? { id: 1, text: hydrated.toast } : null
  if (!toast && hydrated.save.activeBoost) {
    toast = {
      id: 1,
      text: `click boost ×${formatMultiplier(hydrated.save.activeBoost.mult)}`,
    }
  }
  if (hydrated.reset) clearSave()
  writeSave(hydrated.save)
  lastSaveAt = now
  return { hydrated, toast, toastSeq: toast ? 1 : 0, now }
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

export const useGame = create<GameState>((set, get) => ({
  money: booted.hydrated.save.money,
  xp: booted.hydrated.save.xp,
  xpTotal: booted.hydrated.save.xpTotal,
  peakMoney: booted.hydrated.save.peakMoney,
  skills: booted.hydrated.save.skills,
  equipment: booted.hydrated.save.equipment,
  owned: booted.hydrated.save.owned,
  jobs: booted.hydrated.save.jobs,
  gigs: booted.hydrated.save.gigs,
  phase: phaseOf(booted.hydrated.save),
  activeBoost: booted.hydrated.save.activeBoost ?? null,
  nextBoostAt: null,
  idleSince: booted.now,
  now: booted.now,
  fight: null,
  nextEnemyAt: null,
  fightResult: null,
  fightSeq: 0,
  foreverMult: booted.hydrated.save.foreverMult ?? 1,
  tempMults: booted.hydrated.save.tempMults ?? {},
  event: null,
  lastEvent: null,
  eventSeq: 0,
  nextEventAt: null,
  ideSel: { packId: "", index: 0 },
  previewEra: null,
  previewUntil: 0,
  toast: booted.toast,
  toastSeq: booted.toastSeq,
  pop: null,
  popSeq: 0,
  buyStamp: 0,
  celebrationNonce: 0,

  click: () => {
    const state = get()
    if (state.fight) return get().hit()
    const now = Date.now()
    const rates = production(state, state.activeBoost, now, modsOf(state))
    const xpGain = rates.xpClick * rates.mult
    set({
      money: state.money + rates.click,
      xp: state.xp + xpGain,
      xpTotal: state.xpTotal + xpGain,
      now,
      ...makePop(state, "click", rates.click, ""),
    })
    return { money: rates.click, xp: xpGain }
  },

  hit: () => {
    const state = get()
    const fight = state.fight
    if (!fight) return { money: 0, xp: 0 }
    const damage = production(state, state.activeBoost, Date.now(), modsOf(state)).click
    const result = applyDamage(fight, damage)
    if (!result.outcome) {
      set({ fight: result.fight })
      return { money: 0, xp: 0 }
    }
    const fightSeq = state.fightSeq + 1
    set({
      fight: null,
      nextEnemyAt: null,
      money: state.money + result.outcome.reward,
      fightResult: { ...result.outcome, id: fightSeq },
      fightSeq,
      ...makePop(state, "fightWin", result.outcome.reward, enemyById(result.outcome.enemyId)?.name ?? "Enemy defeated"),
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
    set({ fight: startFight(enemy, get().now), nextEnemyAt: null, fightResult: null, event: null })
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
    const at = Math.max(Date.now(), state.now)
    const applied = applyEvent({ money: state.money, xp: state.xp, xpTotal: state.xpTotal, ...modsOf(state) }, def, at)
    const eventSeq = state.eventSeq + 1
    const event: ActiveEvent = { id: eventSeq, eventId: def.id, lines: applied.lines }
    set({
      money: applied.patch.money,
      xp: applied.patch.xp,
      xpTotal: applied.patch.xpTotal,
      foreverMult: applied.patch.foreverMult,
      tempMults: applied.patch.temp,
      event,
      lastEvent: event,
      eventSeq,
      nextEventAt: null,
    })
    persistNow()
    return true
  },

  dismissEvent: () => set({ event: null, nextEventAt: null }),

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
    // Rare enemies only show up once money exists; a fight forced earlier still runs out its clock.
    const enemy =
      state.fight || moneyMode(state)
        ? advanceEnemyClock({ fight: state.fight, nextEnemyAt: state.nextEnemyAt }, era, now, Math.random)
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
    const balance = { money: state.money + gain, xp: state.xp + xpGain, xpTotal: state.xpTotal + xpGain }
    // Events wait out fights and each other: one slot, never stacked.
    const eventAdvance = advanceEventClock(
      state.nextEventAt,
      {
        era,
        paying: moneyMode(state),
        blocked: fighting || state.fight !== null || state.event !== null,
        owned: { jobs: state.jobs, gigs: state.gigs, equipment: state.equipment },
      },
      now,
      Math.random,
    )
    const fired = eventAdvance.fire
    const applied = fired ? applyEvent({ ...balance, foreverMult: state.foreverMult, temp: tempMults }, fired, now) : null
    const eventSeq = fired ? state.eventSeq + 1 : state.eventSeq
    // A spawning enemy closes an open event modal (its effects are already in) so the fight clock never runs behind it.
    const event: ActiveEvent | null = enemy.spawned
      ? null
      : fired && applied
        ? { id: eventSeq, eventId: fired.id, lines: applied.lines }
        : state.event
    let toastSeq = advanced.spawned ? state.toastSeq + 1 : state.toastSeq
    let toast = advanced.spawned
      ? { id: toastSeq, text: `click boost ×${formatMultiplier(advanced.spawned.mult)}` }
      : state.toast
    let fightResult = state.fightResult
    let fightSeq = state.fightSeq
    if (enemy.outcome) {
      fightSeq += 1
      fightResult = { ...enemy.outcome, id: fightSeq }
      toastSeq += 1
      toast = { id: toastSeq, text: `${enemyById(enemy.outcome.enemyId)?.name ?? "Enemy"} got away` }
    }

    set({
      money: applied ? applied.patch.money : balance.money,
      xp: applied ? applied.patch.xp : balance.xp,
      xpTotal: applied ? applied.patch.xpTotal : balance.xpTotal,
      foreverMult: applied ? applied.patch.foreverMult : state.foreverMult,
      tempMults: applied ? applied.patch.temp : tempMults,
      event,
      lastEvent: fired ? event : state.lastEvent,
      eventSeq,
      nextEventAt: eventAdvance.nextEventAt,
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
      writeSave(toSave(get(), now))
      lastSaveAt = now
    }
  },

  wipe: () => {
    const now = Date.now()
    const save = freshSave(now)
    writeSave(save)
    lastSaveAt = now
    set({
      money: 0,
      xp: 0,
      xpTotal: 0,
      peakMoney: 0,
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
      ideSel: { packId: "", index: 0 },
      previewEra: null,
      previewUntil: 0,
      toast: null,
      pop: null,
      popSeq: 0,
      buyStamp: 0,
      celebrationNonce: 0,
    })
  },
}))

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
  writeSave(toSave(useGame.getState(), now))
  lastSaveAt = now
}

/** Write the live balance with an explicit savedAt. Used to simulate time away. */
export function writeStateAt(savedAt: number): void {
  writeSave(toSave(useGame.getState(), savedAt))
  lastSaveAt = savedAt
}
