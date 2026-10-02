import { create } from "zustand"
import { advanceBoostClock } from "./boosts.ts"
import type { BoostClock } from "./boosts.ts"
import {
  highestOwnedTier,
  idlePerSec,
  ownedCount,
  production,
  quotePurchase,
  tierById,
} from "./economy.ts"
import type { OwnedMap } from "./economy.ts"
import { advanceEnemyClock, applyDamage, endFight, enemyById, startFight } from "./fight.ts"
import type { Fight, FightOutcome } from "./fight.ts"
import { formatMultiplier } from "./format.ts"
import { freshSave, hydrate, OFFLINE_CAP_MS } from "./save.ts"
import type { SaveV1 } from "./save.ts"
import { readSaveText, writeSave } from "./storage.ts"
import type { ActiveBoost } from "../data/boosts.ts"
import { TIERS } from "../data/tiers.ts"

const SAVE_EVERY_MS = 4_000

export type FightResult = FightOutcome & { id: number }

export type ToastMessage = {
  id: number
  text: string
}

type GameState = {
  money: number
  xp: number
  peakMoney: number
  owned: OwnedMap
  activeBoost: ActiveBoost | null
  nextBoostAt: number | null
  idleSince: number
  now: number
  fight: Fight | null
  nextEnemyAt: number | null
  fightResult: FightResult | null
  fightSeq: number
  toast: ToastMessage | null
  toastSeq: number
  buyStamp: number
  celebrationNonce: number
  celebrationTierId: number
  click: () => { money: number; xp: number }
  buy: (tierId: number, mode?: "one" | "max") => void
  hit: () => { money: number; xp: number }
  flee: () => void
  forceEnemy: (enemyId: number) => boolean
  dismissToast: () => void
  dismissFightResult: () => void
  tick: (now: number) => void
  wipe: () => void
}

function toSave(state: GameState, now: number): SaveV1 {
  const save: SaveV1 = {
    version: 2,
    money: state.money,
    xp: state.xp,
    owned: state.owned,
    savedAt: now,
    peakMoney: Math.max(state.peakMoney, state.money),
  }
  if (state.activeBoost && state.activeBoost.endsAt > now) {
    save.activeBoost = state.activeBoost
  }
  return save
}

function eraAlreadyOwned(owned: OwnedMap, era: string): boolean {
  return TIERS.some((tier) => tier.era === era && ownedCount(owned, tier.id) > 0)
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
  writeSave(hydrated.save)
  lastSaveAt = now
  return { hydrated, toast, toastSeq: toast ? 1 : 0, now }
}

const booted = boot()

export const useGame = create<GameState>((set, get) => ({
  money: booted.hydrated.save.money,
  xp: booted.hydrated.save.xp,
  peakMoney: booted.hydrated.save.peakMoney ?? booted.hydrated.save.money,
  owned: booted.hydrated.save.owned,
  activeBoost: booted.hydrated.save.activeBoost ?? null,
  nextBoostAt: null,
  idleSince: booted.now,
  now: booted.now,
  fight: null,
  nextEnemyAt: null,
  fightResult: null,
  fightSeq: 0,
  toast: booted.toast,
  toastSeq: booted.toastSeq,
  buyStamp: 0,
  celebrationNonce: 0,
  celebrationTierId: 0,

  click: () => {
    const state = get()
    if (state.fight) return get().hit()
    const now = Date.now()
    const rates = production(state.owned, state.activeBoost, now)
    set({
      money: state.money + rates.click,
      xp: state.xp + 1,
      now,
    })
    return { money: rates.click, xp: 1 }
  },

  hit: () => {
    const state = get()
    const fight = state.fight
    if (!fight) return { money: 0, xp: 0 }
    const damage = production(state.owned, state.activeBoost, Date.now()).click
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
    set({ fight: startFight(enemy, get().now), nextEnemyAt: null, fightResult: null })
    return true
  },

  buy: (tierId, mode = "one") => {
    const tier = tierById(tierId)
    if (!tier) return
    const state = get()
    const have = ownedCount(state.owned, tier.id)
    const quote = quotePurchase(state.money, tier.baseCost, have, mode)
    if (quote.count <= 0) return

    const owned: OwnedMap = { ...state.owned, [String(tier.id)]: have + quote.count }
    const prevBest = highestOwnedTier(state.owned)
    const nextBest = highestOwnedTier(owned)
    const newHighest = Boolean(nextBest && (!prevBest || nextBest.id > prevBest.id))
    const newEra = !eraAlreadyOwned(state.owned, tier.era)
    const celebrate = have === 0 && (newHighest || newEra)
    const now = Date.now()

    set({
      money: Math.max(0, state.money - quote.total),
      xp: state.xp + tier.id * quote.count,
      owned,
      now,
      buyStamp: state.buyStamp + 1,
      celebrationNonce: celebrate ? state.celebrationNonce + 1 : state.celebrationNonce,
      celebrationTierId: celebrate ? tier.id : state.celebrationTierId,
    })
    writeSave(toSave(get(), now))
    lastSaveAt = now
  },

  dismissToast: () => set({ toast: null }),

  dismissFightResult: () => set({ fightResult: null }),

  tick: (now) => {
    const state = get()
    const dt = Math.max(0, Math.min(now - state.now, OFFLINE_CAP_MS))
    const era = highestOwnedTier(state.owned)?.era ?? "early"
    const enemy = advanceEnemyClock({ fight: state.fight, nextEnemyAt: state.nextEnemyAt }, era, now, Math.random)
    // Boost rolls wait out a fight so a boost cannot land and expire unseen behind the overlay.
    const fighting = enemy.clock.fight !== null
    const clock: BoostClock = {
      activeBoost: state.activeBoost,
      nextBoostAt: state.nextBoostAt,
      idleSince: state.idleSince,
    }
    const advanced = fighting ? { clock, spawned: null } : advanceBoostClock(clock, era, now, Math.random)
    const gain = idlePerSec(state.owned) * (dt / 1000)
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
      money: state.money + gain,
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
      peakMoney: 0,
      owned: {},
      activeBoost: null,
      nextBoostAt: null,
      idleSince: now,
      now,
      fight: null,
      nextEnemyAt: null,
      fightResult: null,
      fightSeq: 0,
      toast: null,
      buyStamp: 0,
      celebrationNonce: 0,
      celebrationTierId: 0,
    })
  },
}))

// Any code path that raises money (clicks, idle ticks, harness) keeps the peak current.
useGame.subscribe((state) => {
  if (state.money > state.peakMoney) useGame.setState({ peakMoney: state.money })
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
