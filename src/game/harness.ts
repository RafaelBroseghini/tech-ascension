import type { ActiveBoost } from "../data/boosts.ts"
import type { Era } from "../data/capital.ts"
import { clickPower, idlePerSec, ownedCount, xpPerClick, xpPerSec } from "./economy.ts"
import { remainingMs } from "./fight.ts"
import type { FightOutcome } from "./fight.ts"
import { nextUnlock } from "./nextUnlock.ts"
import type { NextUnlock } from "./nextUnlock.ts"
import { capitalUnlocked, equipmentOpen, eraOf, gigBoardUnlocked, jobBoardUnlocked, stageOf } from "./phase.ts"
import type { Phase } from "./phase.ts"
import { hydrate, OFFLINE_CAP_MS } from "./save.ts"
import { persistNow, useGame, writeStateAt } from "./store.ts"
import { readSaveText } from "./storage.ts"

export type FightSnapshot = {
  enemyId: number
  hp: number
  maxHp: number
  remainingMs: number
}

export type PopSnapshot = { kind: "click" | "gigClear" | "fightWin" | "unlock"; size: "medium" | "large"; amount: number; label: string }

export type GameSnapshot = {
  money: number
  /** Spendable XP. Skills cost XP. */
  xp: number
  /** Lifetime XP earned. Phase gates and job requirements read this. */
  xpTotal: number
  /** A skill grind, B gigs, C jobs + gear, D capital. */
  phase: Phase
  /** Idle $/s. Click boosts do not change this. */
  cps: number
  /** Base money per click, before activeBoost. Paid once the first gig is cleared. */
  clickPower: number
  /** Base XP per click (1 + skills). In Phase A this is what a click pays. */
  xpPerClick: number
  /** Idle XP/s from skills. */
  xpPerSec: number
  /** Phase D capital rows, keyed by capital id ("6"). */
  owned: Record<string, number>
  skills: Record<string, number>
  equipment: Record<string, number>
  jobs: number[]
  /** Completed gig ids. */
  gigs: number[]
  /** `gear` opens with the Job Board. */
  unlocks: { gigBoard: boolean; jobBoard: boolean; gear: boolean; capital: boolean }
  /** The target in the shop banner under the tabs, or null when nothing is left to unlock. */
  nextUnlock: NextUnlock | null
  era: Era
  /** Art id of the stage sprite: art id of the highest owned capital row, or the art of the furthest skill, gig or job. 1 before the first purchase. */
  spriteTierId: number
  activeBoost: ActiveBoost | null
  savedAt: number
  /** Running rare-enemy fight, or null when idle. */
  fight: FightSnapshot | null
  /** How the most recent fight ended (reward is 0 unless it was a win), or null. */
  lastFight: { kind: FightOutcome["kind"]; enemyId: number; reward: number } | null
  /** The most recent money pop (medium on a paying click, large on gig clear, fight win, phase unlock), or null. */
  lastPop: PopSnapshot | null
}

export type OfflineCatchup = {
  credited: number
  creditedXp: number
  toast: string | null
}

export type GameHarness = {
  getState: () => GameSnapshot
  click: () => { money: number; xp: number }
  /** Buy one Phase D capital row. False before capital unlocks or when it costs too much. */
  buy: (tierId: number) => boolean
  buySkill: (skillId: number) => boolean
  buyJob: (jobId: number) => boolean
  buyEquipment: (equipId: number) => boolean
  /** Clear a gig through the normal gates (board open, XP, prior gigs). */
  completeGig: (gigId: number) => boolean
  /** Clear a gig now, bypassing every requirement. False for an unknown or already cleared id. */
  forceGig: (gigId: number) => boolean
  setXp: (n: number) => void
  tick: (ms: number) => void
  setMoney: (n: number) => void
  forceBoost: (mult: number, ms: number) => void
  advanceOffline: (ms: number) => OfflineCatchup
  /** Start a fight with this enemy id now, bypassing the rare spawn. False for an unknown id. */
  forceEnemy: (enemyId: number) => boolean
  /** End the current fight with no reward. */
  flee: () => void
  reset: () => void
}

function readSavedAt(): number {
  const text = readSaveText()
  if (!text) return 0
  try {
    const parsed = JSON.parse(text) as { savedAt?: unknown }
    return typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt) ? parsed.savedAt : 0
  } catch {
    return 0
  }
}

function liveBoost(boost: ActiveBoost | null, now: number): ActiveBoost | null {
  if (!boost || !(boost.endsAt > now) || !(boost.mult > 0)) return null
  return { mult: boost.mult, endsAt: boost.endsAt }
}

export function installGameHarness(): GameHarness {
  const api: GameHarness = {
    getState: () => {
      const state = useGame.getState()
      const now = Date.now()
      const stage = stageOf(state)
      return {
        money: state.money,
        xp: state.xp,
        xpTotal: state.xpTotal,
        phase: state.phase,
        cps: idlePerSec(state),
        clickPower: clickPower(state),
        xpPerClick: xpPerClick(state.skills),
        xpPerSec: xpPerSec(state.skills),
        owned: { ...state.owned },
        skills: { ...state.skills },
        equipment: { ...state.equipment },
        jobs: [...state.jobs],
        gigs: [...state.gigs],
        unlocks: {
          gigBoard: gigBoardUnlocked(state),
          jobBoard: jobBoardUnlocked(state),
          gear: equipmentOpen(state),
          capital: capitalUnlocked(state),
        },
        nextUnlock: nextUnlock(state),
        era: eraOf(state),
        spriteTierId: stage?.artId ?? 1,
        activeBoost: liveBoost(state.activeBoost, now),
        savedAt: readSavedAt(),
        fight: state.fight
          ? {
              enemyId: state.fight.enemyId,
              hp: state.fight.hp,
              maxHp: state.fight.maxHp,
              remainingMs: remainingMs(state.fight, state.now),
            }
          : null,
        lastFight: state.fightResult
          ? { kind: state.fightResult.kind, enemyId: state.fightResult.enemyId, reward: state.fightResult.reward }
          : null,
        lastPop: state.pop
          ? { kind: state.pop.kind, size: state.pop.size, amount: state.pop.amount, label: state.pop.label }
          : null,
      }
    },

    click: () => useGame.getState().click(),

    buy: (tierId) => {
      const before = ownedCount(useGame.getState().owned, tierId)
      useGame.getState().buy(tierId, "one")
      return ownedCount(useGame.getState().owned, tierId) > before
    },

    buySkill: (skillId) => {
      const before = ownedCount(useGame.getState().skills, skillId)
      useGame.getState().buySkill(skillId, "one")
      return ownedCount(useGame.getState().skills, skillId) > before
    },

    buyJob: (jobId) => useGame.getState().buyJob(jobId),

    buyEquipment: (equipId) => {
      const before = ownedCount(useGame.getState().equipment, equipId)
      useGame.getState().buyEquipment(equipId, "one")
      return ownedCount(useGame.getState().equipment, equipId) > before
    },

    completeGig: (gigId) => useGame.getState().clearGig(gigId),

    forceGig: (gigId) => useGame.getState().clearGig(gigId, true),

    setXp: (n) => {
      if (!Number.isFinite(n)) return
      const xp = Math.max(0, n)
      useGame.setState((state) => ({ xp, xpTotal: Math.max(state.xpTotal, xp) }))
      persistNow()
    },

    tick: (ms) => {
      const state = useGame.getState()
      const step = Math.max(0, Math.min(ms, OFFLINE_CAP_MS))
      state.tick(state.now + step)
    },

    setMoney: (n) => {
      if (!Number.isFinite(n)) return
      useGame.setState({ money: Math.max(0, n) })
      persistNow()
    },

    forceBoost: (mult, ms) => {
      if (!(mult > 0) || !(ms > 0) || !Number.isFinite(mult) || !Number.isFinite(ms)) return
      const now = Date.now()
      useGame.setState({
        activeBoost: { mult, endsAt: now + ms },
        now,
      })
      persistNow()
    },

    advanceOffline: (ms) => {
      if (!(ms > 0) || !Number.isFinite(ms)) return { credited: 0, creditedXp: 0, toast: null }
      const now = Date.now()
      const before = useGame.getState().money
      const beforeXp = useGame.getState().xp
      writeStateAt(now - ms)
      const hydrated = hydrate(readSaveText(), now)
      const toastSeq = useGame.getState().toastSeq + 1
      useGame.setState({
        money: hydrated.save.money,
        xp: hydrated.save.xp,
        xpTotal: hydrated.save.xpTotal,
        owned: hydrated.save.owned,
        activeBoost: hydrated.save.activeBoost ?? null,
        now,
        idleSince: now,
        nextBoostAt: null,
        toast: hydrated.toast ? { id: toastSeq, text: hydrated.toast } : useGame.getState().toast,
        toastSeq: hydrated.toast ? toastSeq : useGame.getState().toastSeq,
      })
      persistNow()
      return {
        credited: hydrated.save.money - before,
        creditedXp: hydrated.save.xp - beforeXp,
        toast: hydrated.toast,
      }
    },

    forceEnemy: (enemyId) => useGame.getState().forceEnemy(enemyId),

    flee: () => useGame.getState().flee(),

    reset: () => {
      useGame.getState().wipe()
    },
  }

  if (typeof window !== "undefined") {
    window.__GAME__ = api
  }
  return api
}

declare global {
  interface Window {
    __GAME__: GameHarness
  }
}
